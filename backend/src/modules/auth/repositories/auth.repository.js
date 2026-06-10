/**
 * Auth Repository
 * Autentifikatsiya uchun database operatsiyalari
 */

const { prisma } = require('../../../shared/config/database.config');

/**
 * Email yoki username bo'yicha foydalanuvchi qidirish
 */
async function findByEmailOrUsername(email, username) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    },
  });
}

/**
 * Email bo'yicha foydalanuvchi topish (parolni ham olish)
 */
async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Foydalanuvchi yaratish
 */
async function createUser(data) {
  return prisma.user.create({ data });
}

/**
 * Foydalanuvchi statistikasini yaratish (registration da)
 */
async function createUserStatistics(userId) {
  return prisma.userStatistics.create({
    data: { userId },
  });
}

/**
 * Refresh tokenni bazaga saqlash
 */
async function saveRefreshToken(userId, token, deviceInfo, ipAddress) {
  const expiresAt = new Date();
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 30;
  expiresAt.setDate(expiresAt.getDate() + days);

  return prisma.refreshToken.create({
    data: {
      userId,
      token,
      deviceInfo,
      ipAddress,
      expiresAt,
    },
  });
}

/**
 * Refresh tokenni topish
 */
async function findRefreshToken(token) {
  return prisma.refreshToken.findUnique({
    where: { token },
  });
}

/**
 * Refresh tokenni bekor qilish
 */
async function revokeRefreshToken(token) {
  return prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
}

/**
 * Foydalanuvchining barcha refresh tokenlarini bekor qilish
 */
async function revokeAllUserTokens(userId) {
  return prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Qurilma tokenlarini yangilash (FCM/APNs)
 */
async function updateDeviceTokens(userId, { fcmToken, apnsToken }) {
  const updateData = {};
  if (fcmToken !== undefined) updateData.fcmToken = fcmToken;
  if (apnsToken !== undefined) updateData.apnsToken = apnsToken;

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

/**
 * Muddati o'tgan va bekor qilingan tokenlarni tozalash (cron job uchun)
 */
async function cleanExpiredTokens() {
  return prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { isRevoked: true },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });
}

module.exports = {
  findByEmailOrUsername,
  findByEmail,
  createUser,
  createUserStatistics,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  updateDeviceTokens,
  cleanExpiredTokens,
};
