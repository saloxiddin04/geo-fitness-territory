/**
 * Admin Routes
 * Admin panel uchun to'liq API
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateAdmin } = require('../../../shared/middleware/auth.middleware');
const { prisma } = require('../../../shared/config/database.config');
const { AppError } = require('../../../shared/middleware/error.middleware');
const notificationService = require('../../notification/services/notification.service');
const territoryService = require('../../territory/services/territory.service');
const nightEventService = require('../../scheduler/jobs/nightEvent.service');
const { getOnlineCount } = require('../../webSocket/handlers/socket.handler');
const logger = require('../../../shared/utils/logger');

const router = express.Router();

// ============================================================
// ADMIN AUTH (alohida login)
// ============================================================

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      throw new AppError('Admin topilmadi', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) throw new AppError('Noto\'g\'ri ma\'lumotlar', 401, 'INVALID_CREDENTIALS');

    const token = jwt.sign(
      { adminId: admin.id, role: 'admin', adminRole: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash, ...safeAdmin } = admin;
    res.json({ success: true, data: { admin: safeAdmin, token } });
  } catch (error) { next(error); }
});

// Barcha admin routelar autentifikatsiya talab qiladi
router.use(authenticateAdmin);

// ============================================================
// DASHBOARD STATISTIKASI
// ============================================================

router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalUsers, todaySessions, totalTerritories, nightEventStatus,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.runningSession.count({
        where: {
          startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'COMPLETED',
        },
      }),
      prisma.territory.count({ where: { ownerId: { not: null } } }),
      nightEventService.isNightEventActive(),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        todaySessions,
        totalTerritories,
        nightEventActive: nightEventStatus,
        onlineUsers: getOnlineCount(),
      },
    });
  } catch (error) { next(error); }
});

// ============================================================
// FOYDALANUVCHILAR BOSHQARUVI
// ============================================================

router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isBlocked } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, displayName: true,
          avatarUrl: true, region: true, totalXp: true, level: true,
          isActive: true, isBlocked: true, blockedReason: true,
          createdAt: true, lastActiveAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

// Foydalanuvchini bloklash
router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body;
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: true, blockedReason: reason || 'Admin tomonidan bloklandi' },
    });

    // Event log
    await prisma.eventLog.create({
      data: {
        userId: req.params.id,
        eventType: 'USER_BLOCKED',
        description: `Admin ${req.admin.username} tomonidan bloklandi: ${reason}`,
        metadata: { adminId: req.admin.id, reason },
      },
    });

    logger.info(`Foydalanuvchi bloklandi: ${req.params.id} | Admin: ${req.admin.username}`);
    res.json({ success: true, message: 'Foydalanuvchi bloklandi' });
  } catch (error) { next(error); }
});

// Blokdan chiqarish
router.patch('/users/:id/unblock', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: false, blockedReason: null },
    });

    await prisma.eventLog.create({
      data: {
        userId: req.params.id,
        eventType: 'USER_UNBLOCKED',
        description: `Admin ${req.admin.username} tomonidan blokdan chiqarildi`,
        metadata: { adminId: req.admin.id },
      },
    });

    res.json({ success: true, message: 'Foydalanuvchi blokdan chiqarildi' });
  } catch (error) { next(error); }
});

// Foydalanuvchi statistikasi
router.get('/users/:id/stats', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        statistics: true,
        runningSessions: {
          where: { status: 'COMPLETED' },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, 'NOT_FOUND');
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser } });
  } catch (error) { next(error); }
});

// ============================================================
// TERRITORY BOSHQARUVI
// ============================================================

router.patch('/territories/:h3Index/reset', async (req, res, next) => {
  try {
    await territoryService.resetTerritory(req.params.h3Index);

    await prisma.eventLog.create({
      data: {
        eventType: 'TERRITORY_RESET',
        description: `Hudud reset qilindi: ${req.params.h3Index}`,
        metadata: { adminId: req.admin.id, h3Index: req.params.h3Index },
        h3Index: req.params.h3Index,
      },
    });

    res.json({ success: true, message: 'Hudud reset qilindi' });
  } catch (error) { next(error); }
});

// ============================================================
// PUSH NOTIFICATION
// ============================================================

router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) throw new AppError('Sarlavha va matn majburiy', 400, 'VALIDATION_ERROR');

    const count = await notificationService.sendAdminBroadcast(title, body, {
      adminId: req.admin.id,
    });

    logger.info(`Admin broadcast: ${count} ta foydalanuvchiga | ${req.admin.username}`);
    res.json({ success: true, data: { sentTo: count } });
  } catch (error) { next(error); }
});

// ============================================================
// NIGHT EVENT BOSHQARUVI
// ============================================================

router.get('/night-event/status', async (req, res, next) => {
  try {
    const isActive = await nightEventService.isNightEventActive();
    res.json({
      success: true,
      data: {
        isActive,
        startHour: nightEventService.NIGHT_EVENT_START_HOUR,
        endHour: nightEventService.NIGHT_EVENT_END_HOUR,
        multiplier: nightEventService.NIGHT_EVENT_MULTIPLIER,
      },
    });
  } catch (error) { next(error); }
});

router.post('/night-event/start', async (req, res, next) => {
  try {
    await nightEventService.startNightEvent();
    res.json({ success: true, message: 'Night event boshlandi' });
  } catch (error) { next(error); }
});

router.post('/night-event/end', async (req, res, next) => {
  try {
    await nightEventService.endNightEvent();
    res.json({ success: true, message: 'Night event tugadi' });
  } catch (error) { next(error); }
});

// ============================================================
// SHUBHALI SESSIYALAR
// ============================================================

router.get('/suspicious-sessions', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      prisma.runningSession.findMany({
        where: { isSuspicious: true },
        include: {
          user: {
            select: { username: true, email: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.runningSession.count({ where: { isSuspicious: true } }),
    ]);

    res.json({ success: true, data: { sessions, total } });
  } catch (error) { next(error); }
});

// ============================================================
// TIZIM SOZLAMALARI
// ============================================================

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: { settings } });
  } catch (error) { next(error); }
});

router.put('/settings/:key', async (req, res, next) => {
  try {
    const { value } = req.body;
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value, updatedBy: req.admin.username },
      update: { value, updatedBy: req.admin.username },
    });
    res.json({ success: true, data: { setting } });
  } catch (error) { next(error); }
});

// ============================================================
// LOGLAR
// ============================================================

router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, eventType, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.eventLog.count({ where }),
    ]);

    res.json({ success: true, data: { logs, total } });
  } catch (error) { next(error); }
});

module.exports = router;
