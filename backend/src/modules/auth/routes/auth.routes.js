/**
 * Auth Routes
 * /api/v1/auth/* endpointlari
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const { validateRegister, validateLogin, validateRefreshToken } = require('../validators/auth.validator');

const router = express.Router();

// Login/Register uchun qattiqroq rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10, // Maksimal 10 urinish
  message: { success: false, message: 'Juda ko\'p urinish. 15 daqiqadan keyin urinib ko\'ring.' },
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Yangi foydalanuvchi ro'yxatdan o'tkazish
 *     tags: [Auth]
 */
router.post('/register', authLimiter, validateRegister, authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Tizimga kirish
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validateLogin, authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Access tokenni yangilash
 *     tags: [Auth]
 */
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Tizimdan chiqish
 *     tags: [Auth]
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Joriy foydalanuvchi
 *     tags: [Auth]
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /api/v1/auth/device-token:
 *   put:
 *     summary: Qurilma tokenini yangilash
 *     tags: [Auth]
 */
router.put('/device-token', authenticate, authController.updateDeviceToken);

module.exports = router;
