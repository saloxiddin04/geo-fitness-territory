/**
 * Auth Service
 * JWT tokenlar boshqaruvi, login/register logikasi
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../../../shared/middleware/error.middleware');
const authRepository = require('../repositories/auth.repository');
const logger = require('../../../shared/utils/logger');

const SALT_ROUNDS = 12;

/**
 * Yangi foydalanuvchi ro'yxatdan o'tkazish
 */
async function register(userData) {
  const { username, email, password, displayName, region, devicePlatform } = userData;

  // Email va username mavjudligini tekshirish
  const existingUser = await authRepository.findByEmailOrUsername(email, username);
  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      throw new AppError('Bu email allaqachon ro\'yxatdan o\'tgan', 409, 'EMAIL_EXISTS');
    }
    throw new AppError('Bu username band', 409, 'USERNAME_TAKEN');
  }

  // Parolni hash qilish
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Foydalanuvchi yaratish
  const user = await authRepository.createUser({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    displayName: displayName || username,
    region,
    devicePlatform,
  });

  // Statistika yaratish (user bilan birga)
  await authRepository.createUserStatistics(user.id);

  logger.info(`Yangi foydalanuvchi ro'yxatdan o'tdi: ${user.username}`);

  // Tokenlar yaratish
  const tokens = generateTokenPair(user.id);
  await authRepository.saveRefreshToken(user.id, tokens.refreshToken);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Login - email va parol bilan kirish
 */
async function login(email, password, deviceInfo, ipAddress, fcmToken, apnsToken) {
  // Foydalanuvchini topish
  const user = await authRepository.findByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new AppError('Email yoki parol noto\'g\'ri', 401, 'INVALID_CREDENTIALS');
  }

  if (user.isBlocked) {
    throw new AppError('Hisobingiz bloklangan', 403, 'ACCOUNT_BLOCKED');
  }

  // Parolni tekshirish
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Email yoki parol noto\'g\'ri', 401, 'INVALID_CREDENTIALS');
  }

  // FCM/APNs tokenni yangilash
  if (fcmToken || apnsToken) {
    await authRepository.updateDeviceTokens(user.id, { fcmToken, apnsToken });
  }

  logger.info(`Foydalanuvchi kirdi: ${user.username}`);

  // Tokenlar yaratish
  const tokens = generateTokenPair(user.id);
  await authRepository.saveRefreshToken(user.id, tokens.refreshToken, deviceInfo, ipAddress);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Token yangilash (refresh)
 */
async function refreshTokens(refreshToken) {
  // Refresh tokenni tekshirish
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Yaroqsiz yoki muddati o\'tgan refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Bazada tokenni tekshirish
  const storedToken = await authRepository.findRefreshToken(refreshToken);
  if (!storedToken || storedToken.isRevoked) {
    throw new AppError('Refresh token bekor qilingan', 401, 'TOKEN_REVOKED');
  }

  if (new Date() > storedToken.expiresAt) {
    await authRepository.revokeRefreshToken(refreshToken);
    throw new AppError('Refresh token muddati tugagan', 401, 'TOKEN_EXPIRED');
  }

  // Eski tokenni bekor qilish va yangi juft yaratish (rotation)
  await authRepository.revokeRefreshToken(refreshToken);

  const tokens = generateTokenPair(decoded.userId);
  await authRepository.saveRefreshToken(
    decoded.userId,
    tokens.refreshToken,
    storedToken.deviceInfo,
    storedToken.ipAddress
  );

  return tokens;
}

/**
 * Logout - refresh tokenni bekor qilish
 */
async function logout(refreshToken, userId) {
  if (refreshToken) {
    await authRepository.revokeRefreshToken(refreshToken);
  }
  
  // Foydalanuvchining FCM tokenini tozalash
  await authRepository.updateDeviceTokens(userId, { fcmToken: null, apnsToken: null });
  
  logger.info(`Foydalanuvchi chiqdi: ${userId}`);
}

/**
 * FCM/APNs token yangilash
 */
async function updateDeviceToken(userId, fcmToken, apnsToken) {
  await authRepository.updateDeviceTokens(userId, { fcmToken, apnsToken });
}

// ============================================================
// HELPER FUNKSIYALAR
// ============================================================

/**
 * Access va Refresh token juftini yaratish
 */
function generateTokenPair(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() }, // Unikal tokenId qo'shish
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Foydalanuvchi ob'ektidan maxfiy maydonlarni olib tashlash
 */
function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  updateDeviceToken,
};
