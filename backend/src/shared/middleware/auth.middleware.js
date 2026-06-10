/**
 * JWT autentifikatsiya middleware
 * Barcha himoyalangan routelar uchun token tekshiruvi
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./error.middleware');
const { prisma } = require('../config/database.config');
const logger = require('../utils/logger');

/**
 * Access token tekshiruvi
 * Authorization: Bearer <token> formatida kutiladi
 */
async function authenticate(req, res, next) {
  try {
    // Tokenni headerdan olish
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Autentifikatsiya talab etiladi', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    // Tokenni tekshirish
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Foydalanuvchini bazadan olish (token o'g'irlanmagani uchun)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        region: true,
        isActive: true,
        isBlocked: true,
        totalXp: true,
        level: true,
        devicePlatform: true,
      },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Hisob faol emas', 401, 'ACCOUNT_INACTIVE');
    }

    if (user.isBlocked) {
      throw new AppError('Hisob bloklangan', 403, 'ACCOUNT_BLOCKED');
    }

    // Foydalanuvchini request ga qo'shish
    req.user = user;
    
    // Oxirgi faollik vaqtini yangilash (har 5 daqiqada bir marta)
    updateLastActive(user.id);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Admin autentifikatsiyasi
 */
async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Admin autentifikatsiyasi talab etiladi', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin ekanligini tekshirish
    if (decoded.role !== 'admin') {
      throw new AppError('Admin ruxsati talab etiladi', 403, 'FORBIDDEN');
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.adminId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      throw new AppError('Admin topilmadi yoki faol emas', 401, 'UNAUTHORIZED');
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ixtiyoriy autentifikatsiya (foydalanuvchi kirgan bo'lsa tokenni tekshiradi)
 * Kirmaganlar ham foydalana oladi
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, isActive: true, isBlocked: true },
    });

    if (user && user.isActive && !user.isBlocked) {
      req.user = user;
    }
    
    next();
  } catch {
    // Token noto'g'ri bo'lsa ham davom etish
    next();
  }
}

/**
 * Oxirgi faollik vaqtini yangilash (async, kutmasdan)
 * Database yukini kamaytirish uchun debounce qilingan
 */
const lastActiveCache = new Map();

function updateLastActive(userId) {
  const now = Date.now();
  const lastUpdate = lastActiveCache.get(userId) || 0;
  
  // 5 daqiqada bir marta yangilash
  if (now - lastUpdate < 5 * 60 * 1000) return;
  
  lastActiveCache.set(userId, now);
  
  prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  }).catch((err) => logger.error('Oxirgi faollik vaqtini yangilashda xato:', err));
}

module.exports = { authenticate, authenticateAdmin, optionalAuthenticate };
