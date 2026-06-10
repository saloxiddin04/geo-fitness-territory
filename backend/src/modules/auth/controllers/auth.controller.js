/**
 * Auth Controller
 * HTTP so'rovlarni qabul qilish va Auth Service ga yo'naltirish
 */

const authService = require('../services/auth.service');
const logger = require('../../../shared/utils/logger');

/**
 * POST /api/v1/auth/register
 * Yangi foydalanuvchi ro'yxatdan o'tkazish
 */
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'Ro\'yxatdan o\'tish muvaffaqiyatli',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 * Foydalanuvchi tizimga kirishi
 */
async function login(req, res, next) {
  try {
    const { email, password, fcmToken, apnsToken } = req.body;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await authService.login(
      email,
      password,
      deviceInfo,
      ipAddress,
      fcmToken,
      apnsToken
    );

    res.json({
      success: true,
      message: 'Tizimga kirildi',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Access tokenni yangilash
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokenlar yangilandi',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 * Tizimdan chiqish
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken, req.user.id);

    res.json({
      success: true,
      message: 'Tizimdan chiqildi',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/auth/device-token
 * FCM/APNs tokenni yangilash
 */
async function updateDeviceToken(req, res, next) {
  try {
    const { fcmToken, apnsToken } = req.body;
    await authService.updateDeviceToken(req.user.id, fcmToken, apnsToken);

    res.json({
      success: true,
      message: 'Qurilma tokeni yangilandi',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Joriy foydalanuvchi ma'lumotlari
 */
async function getMe(req, res) {
  res.json({
    success: true,
    data: { user: req.user },
  });
}

module.exports = { register, login, refreshToken, logout, updateDeviceToken, getMe };
