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
// ADMIN AUTH
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
// DASHBOARD
// ============================================================

router.get('/dashboard', async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalUsers, newUsersToday, todaySessions, totalTerritories, nightEventStatus, suspiciousCount] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.runningSession.count({
        where: { startedAt: { gte: todayStart }, status: 'COMPLETED' },
      }),
      prisma.territory.count({ where: { ownerId: { not: null } } }),
      nightEventService.isNightEventActive(),
      prisma.runningSession.count({ where: { isSuspicious: true } }),
    ]);

    const onlineCount = getOnlineCount();

    res.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        todaySessions,
        totalTerritories,
        nightEventActive: nightEventStatus,
        onlineUsers: onlineCount,
        onlineCount,
        suspiciousCount,
      },
    });
  } catch (error) { next(error); }
});

// ============================================================
// FOYDALANUVCHILAR
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
          statistics: {
            select: {
              currentTerritories: true,
              totalDistanceMeters: true,
              totalExploredCells: true,
              totalSessions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

// Block/Unblock toggle (panel uses PATCH /users/:id)
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { isBlocked, reason } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, 'NOT_FOUND');

    const shouldBlock = isBlocked !== undefined ? isBlocked : !user.isBlocked;

    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isBlocked: shouldBlock,
        blockedReason: shouldBlock ? (reason || 'Admin tomonidan bloklandi') : null,
      },
    });

    await prisma.eventLog.create({
      data: {
        userId: req.params.id,
        eventType: shouldBlock ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
        description: `Admin ${req.admin.username} tomonidan ${shouldBlock ? 'bloklandi' : 'blokdan chiqarildi'}`,
        metadata: { adminId: req.admin.id, reason },
      },
    });

    logger.info(`Foydalanuvchi ${shouldBlock ? 'bloklandi' : 'blokdan chiqarildi'}: ${req.params.id}`);
    res.json({ success: true, message: shouldBlock ? 'Bloklandi' : 'Blokdan chiqarildi' });
  } catch (error) { next(error); }
});

router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body;
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: true, blockedReason: reason || 'Admin tomonidan bloklandi' },
    });
    await prisma.eventLog.create({
      data: {
        userId: req.params.id,
        eventType: 'USER_BLOCKED',
        description: `Admin ${req.admin.username} tomonidan bloklandi`,
        metadata: { adminId: req.admin.id, reason },
      },
    });
    res.json({ success: true, message: 'Foydalanuvchi bloklandi' });
  } catch (error) { next(error); }
});

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
// HUDUDLAR (TERRITORIES)
// ============================================================

router.get('/territories', async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, region } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { ownerId: { not: null } };
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { h3Index: { contains: search, mode: 'insensitive' } },
        { owner: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [territories, total] = await Promise.all([
      prisma.territory.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { capturedAt: 'desc' },
        include: {
          owner: { select: { username: true } },
        },
      }),
      prisma.territory.count({ where }),
    ]);

    const mapped = territories.map((t) => ({
      id: t.id,
      h3Index: t.h3Index,
      region: t.region,
      defenseLevel: t.defenseLevel,
      controlPoints: t.controlPoints,
      capturedAt: t.capturedAt,
      ownerId: t.ownerId,
      ownerUsername: t.owner?.username || null,
      attackCount: 0,
      successfulDefenses: 0,
    }));

    res.json({ success: true, data: { territories: mapped, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

router.get('/territories/stats', async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [total, captured, capturedToday] = await Promise.all([
      prisma.territory.count(),
      prisma.territory.count({ where: { ownerId: { not: null } } }),
      prisma.territory.count({
        where: { ownerId: { not: null }, capturedAt: { gte: todayStart } },
      }),
    ]);

    const attacksToday = await prisma.eventLog.count({
      where: {
        eventType: 'TERRITORY_ATTACKED',
        createdAt: { gte: todayStart },
      },
    });

    res.json({ success: true, data: { total, captured, capturedToday, attacksToday } });
  } catch (error) { next(error); }
});

// Reset by ID (panel uses :id)
router.post('/territories/:id/reset', async (req, res, next) => {
  try {
    const territory = await prisma.territory.findUnique({ where: { id: req.params.id } });
    if (!territory) throw new AppError('Hudud topilmadi', 404, 'NOT_FOUND');

    await prisma.territory.update({
      where: { id: req.params.id },
      data: { ownerId: null, controlPoints: 0, defenseLevel: 1, capturedAt: null },
    });

    await prisma.eventLog.create({
      data: {
        eventType: 'TERRITORY_RESET',
        description: `Hudud reset qilindi: ${territory.h3Index}`,
        metadata: { adminId: req.admin.id, h3Index: territory.h3Index },
        h3Index: territory.h3Index,
      },
    });

    res.json({ success: true, message: 'Hudud reset qilindi' });
  } catch (error) { next(error); }
});

// Reset by h3Index (original)
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

// Reset all
router.post('/territories/reset-all', async (req, res, next) => {
  try {
    const result = await prisma.territory.updateMany({
      data: { ownerId: null, controlPoints: 0, defenseLevel: 1, capturedAt: null },
    });

    await prisma.eventLog.create({
      data: {
        eventType: 'TERRITORY_RESET',
        description: `Barcha hududlar reset qilindi (${result.count} ta)`,
        metadata: { adminId: req.admin.id, count: result.count },
      },
    });

    logger.info(`Barcha hududlar reset qilindi: ${result.count} ta | Admin: ${req.admin.username}`);
    res.json({ success: true, data: { resetCount: result.count } });
  } catch (error) { next(error); }
});

// ============================================================
// SESSIYALAR
// ============================================================

router.get('/sessions', async (req, res, next) => {
  try {
    const { page = 1, limit = 15, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status === 'suspicious') where.isSuspicious = true;
    else if (status === 'active') where.status = 'ACTIVE';
    else if (status === 'completed') where.status = 'COMPLETED';

    if (search) {
      where.user = { username: { contains: search, mode: 'insensitive' } };
    }

    const [sessions, total] = await Promise.all([
      prisma.runningSession.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { username: true, email: true } },
        },
      }),
      prisma.runningSession.count({ where }),
    ]);

    const mapped = sessions.map((s) => ({
      id: s.id,
      username: s.user?.username || '—',
      email: s.user?.email,
      distance: s.distanceMeters,
      duration: s.durationSeconds,
      avgSpeed: s.avgSpeedKmh,
      maxSpeed: s.maxSpeedKmh,
      calories: s.caloriesBurned,
      xpEarned: s.xpEarned,
      territoriesCaptured: s.territoriesCaptured,
      gpsPointsCount: 0,
      isSuspicious: s.isSuspicious,
      suspiciousReason: s.suspiciousReason,
      status: s.status?.toLowerCase(),
      startTime: s.startedAt,
      endTime: s.endedAt,
      nightEventBonus: s.nightEventBonus,
    }));

    res.json({ success: true, data: { sessions: mapped, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

router.get('/sessions/stats', async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [total, today, active, suspicious] = await Promise.all([
      prisma.runningSession.count(),
      prisma.runningSession.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.runningSession.count({ where: { status: 'ACTIVE' } }),
      prisma.runningSession.count({ where: { isSuspicious: true } }),
    ]);

    res.json({ success: true, data: { total, today, active, suspicious } });
  } catch (error) { next(error); }
});

// ============================================================
// NIGHT EVENT
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
        xpMultiplier: nightEventService.NIGHT_EVENT_MULTIPLIER,
        name: isActive ? 'Night Event' : null,
      },
    });
  } catch (error) { next(error); }
});

router.get('/night-event/schedule', async (req, res, next) => {
  try {
    const startHour = nightEventService.NIGHT_EVENT_START_HOUR;
    const endHour = nightEventService.NIGHT_EVENT_END_HOUR;
    const multiplier = nightEventService.NIGHT_EVENT_MULTIPLIER;

    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() + i);
      const startTime = new Date(day);
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(day);
      endTime.setHours(endHour, 0, 0, 0);
      schedule.push({
        id: `schedule-${i}`,
        name: `Night Event`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        xpMultiplier: multiplier,
        region: null,
      });
    }

    res.json({ success: true, data: { schedule } });
  } catch (error) { next(error); }
});

router.post('/night-event/start', async (req, res, next) => {
  try {
    await nightEventService.startNightEvent();
    res.json({ success: true, message: 'Night event boshlandi' });
  } catch (error) { next(error); }
});

// Panel /stop ishlatadi, /end ham qoladi
router.post('/night-event/stop', async (req, res, next) => {
  try {
    await nightEventService.endNightEvent();
    res.json({ success: true, message: 'Night event to\'xtatildi' });
  } catch (error) { next(error); }
});

router.post('/night-event/end', async (req, res, next) => {
  try {
    await nightEventService.endNightEvent();
    res.json({ success: true, message: 'Night event tugadi' });
  } catch (error) { next(error); }
});

// ============================================================
// ADMINLAR BOSHQARUVI
// ============================================================

router.get('/admins', async (req, res, next) => {
  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, username: true, email: true, displayName: true,
        role: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    });
    res.json({ success: true, data: { admins } });
  } catch (error) { next(error); }
});

router.post('/admins', async (req, res, next) => {
  try {
    if (req.admin.role !== 'SUPER_ADMIN') {
      throw new AppError('Faqat super admin yangi admin qo\'sha oladi', 403, 'FORBIDDEN');
    }

    const { username, email, password, role = 'ADMIN' } = req.body;
    if (!username || !email || !password) {
      throw new AppError('Username, email va parol majburiy', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 8) {
      throw new AppError('Parol kamida 8 ta belgi bo\'lishi kerak', 400, 'VALIDATION_ERROR');
    }

    const existing = await prisma.adminUser.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new AppError('Bu email yoki username band', 409, 'CONFLICT');

    const passwordHash = await bcrypt.hash(password, 12);
    const roleMap = { admin: 'ADMIN', super_admin: 'SUPER_ADMIN', moderator: 'MODERATOR' };
    const prismaRole = roleMap[role?.toLowerCase()] || 'ADMIN';

    const admin = await prisma.adminUser.create({
      data: { username, email, passwordHash, role: prismaRole },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });

    logger.info(`Yangi admin yaratildi: ${email} | ${req.admin.username} tomonidan`);
    res.status(201).json({ success: true, data: { admin } });
  } catch (error) { next(error); }
});

router.delete('/admins/:id', async (req, res, next) => {
  try {
    if (req.admin.role !== 'SUPER_ADMIN') {
      throw new AppError('Faqat super admin adminni o\'chira oladi', 403, 'FORBIDDEN');
    }
    if (req.params.id === req.admin.id) {
      throw new AppError('O\'zingizni o\'chira olmaysiz', 400, 'BAD_REQUEST');
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Admin topilmadi', 404, 'NOT_FOUND');
    if (target.role === 'SUPER_ADMIN') {
      throw new AppError('Super adminni o\'chirib bo\'lmaydi', 403, 'FORBIDDEN');
    }

    await prisma.adminUser.delete({ where: { id: req.params.id } });
    logger.info(`Admin o\'chirildi: ${target.email} | ${req.admin.username} tomonidan`);
    res.json({ success: true, message: 'Admin o\'chirildi' });
  } catch (error) { next(error); }
});

router.patch('/admins/:id/toggle-status', async (req, res, next) => {
  try {
    if (req.params.id === req.admin.id) {
      throw new AppError('O\'z statusingizni o\'zgartira olmaysiz', 400, 'BAD_REQUEST');
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Admin topilmadi', 404, 'NOT_FOUND');

    await prisma.adminUser.update({
      where: { id: req.params.id },
      data: { isActive: !target.isActive },
    });

    res.json({ success: true, message: `Admin ${target.isActive ? 'bloklandi' : 'faollashtirildi'}` });
  } catch (error) { next(error); }
});

router.put('/admins/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      throw new AppError('Parol kamida 8 ta belgi bo\'lishi kerak', 400, 'VALIDATION_ERROR');
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Admin topilmadi', 404, 'NOT_FOUND');

    if (req.admin.role !== 'SUPER_ADMIN' && req.params.id !== req.admin.id) {
      throw new AppError('Faqat o\'z parolingizni o\'zgartira olasiz', 403, 'FORBIDDEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Parol o\'zgartirildi' });
  } catch (error) { next(error); }
});

// ============================================================
// STATISTIKA
// ============================================================

router.get('/statistics', async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const [newUsers, prevNewUsers, sessions, prevSessions, captures, prevCaptures, distanceAgg] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      prisma.runningSession.count({ where: { startedAt: { gte: startDate }, status: 'COMPLETED' } }),
      prisma.runningSession.count({ where: { startedAt: { gte: prevStartDate, lt: startDate }, status: 'COMPLETED' } }),
      prisma.territory.count({ where: { capturedAt: { gte: startDate } } }),
      prisma.territory.count({ where: { capturedAt: { gte: prevStartDate, lt: startDate } } }),
      prisma.runningSession.aggregate({
        where: { startedAt: { gte: startDate }, status: 'COMPLETED' },
        _sum: { distanceMeters: true },
      }),
    ]);

    const pctChange = (curr, prev) => prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

    // Kunlik ma'lumotlar (oxirgi N kun)
    const userGrowth = [];
    const dailyActivity = [];
    let runningTotal = await prisma.user.count({ where: { createdAt: { lt: startDate } } });

    for (let i = days; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [newDay, daySessions, dayCaptures] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.runningSession.count({ where: { startedAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' } }),
        prisma.territory.count({ where: { capturedAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      runningTotal += newDay;
      const label = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;
      userGrowth.push({ date: label, total: runningTotal, new: newDay });
      dailyActivity.push({ date: label, sessions: daySessions, captures: dayCaptures });
    }

    // Viloyat bo'yicha taqsimot
    const regionRows = await prisma.user.groupBy({
      by: ['region'],
      _count: { id: true },
      where: { region: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    });

    const regionDistribution = regionRows.map((r) => ({
      name: r.region,
      value: r._count.id,
    }));

    // Top faol foydalanuvchilar
    const topUsers = await prisma.user.findMany({
      take: 6,
      orderBy: { totalXp: 'desc' },
      select: {
        id: true, username: true,
        statistics: { select: { currentTerritories: true, totalSessions: true } },
      },
    });

    const mappedTopUsers = topUsers.map((u) => ({
      id: u.id,
      username: u.username,
      sessions: u.statistics?.totalSessions || 0,
      territories: u.statistics?.currentTerritories || 0,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          newUsers,
          newUsersChange: pctChange(newUsers, prevNewUsers),
          sessions,
          sessionsChange: pctChange(sessions, prevSessions),
          captures,
          capturesChange: pctChange(captures, prevCaptures),
          totalDistance: distanceAgg._sum.distanceMeters || 0,
          distanceChange: 0,
        },
        userGrowth,
        dailyActivity,
        regionDistribution,
        topUsers: mappedTopUsers,
      },
    });
  } catch (error) { next(error); }
});

// ============================================================
// LEADERBOARD
// ============================================================

router.get('/leaderboard', async (req, res, next) => {
  try {
    const { category = 'territories', limit = 20 } = req.query;
    const take = parseInt(limit);

    let rankings = [];

    if (category === 'territories') {
      const rows = await prisma.territory.groupBy({
        by: ['ownerId'],
        where: { ownerId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take,
      });
      const userIds = rows.map((r) => r.ownerId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, region: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      rankings = rows.map((r) => ({
        userId: r.ownerId,
        username: userMap[r.ownerId]?.username || '—',
        region: userMap[r.ownerId]?.region || null,
        value: r._count.id,
      }));
    } else if (category === 'distance') {
      const rows = await prisma.userStatistics.findMany({
        where: { totalDistanceMeters: { gt: 0 } },
        orderBy: { totalDistanceMeters: 'desc' },
        take,
        include: { user: { select: { id: true, username: true, region: true } } },
      });
      rankings = rows.map((r) => ({
        userId: r.userId,
        username: r.user?.username || '—',
        region: r.user?.region || null,
        value: Math.round(r.totalDistanceMeters),
      }));
    } else if (category === 'explored') {
      const rows = await prisma.userStatistics.findMany({
        where: { totalExploredCells: { gt: 0 } },
        orderBy: { totalExploredCells: 'desc' },
        take,
        include: { user: { select: { id: true, username: true, region: true } } },
      });
      rankings = rows.map((r) => ({
        userId: r.userId,
        username: r.user?.username || '—',
        region: r.user?.region || null,
        value: r.totalExploredCells,
      }));
    } else if (category === 'xp') {
      const users = await prisma.user.findMany({
        where: { isActive: true, totalXp: { gt: 0 } },
        orderBy: { totalXp: 'desc' },
        take,
        select: { id: true, username: true, region: true, totalXp: true },
      });
      rankings = users.map((u) => ({
        userId: u.id,
        username: u.username,
        region: u.region,
        value: u.totalXp,
      }));
    }

    res.json({ success: true, data: { rankings, category } });
  } catch (error) { next(error); }
});

// ============================================================
// BILDIRISHNOMALAR (NOTIFICATIONS)
// ============================================================

router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { title, body, type, region } = req.body;
    if (!title || !body) throw new AppError('Sarlavha va matn majburiy', 400, 'VALIDATION_ERROR');

    const count = await notificationService.sendAdminBroadcast(title, body, {
      adminId: req.admin.id,
      type,
      region,
    });

    await prisma.eventLog.create({
      data: {
        eventType: 'ADMIN_NOTIFICATION_SENT',
        description: `Broadcast: "${title}" — ${count} ta foydalanuvchiga`,
        metadata: { adminId: req.admin.id, title, type, region, sentTo: count },
      },
    });

    logger.info(`Admin broadcast: ${count} ta foydalanuvchiga | ${req.admin.username}`);
    res.json({ success: true, data: { sentTo: count } });
  } catch (error) { next(error); }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true } },
        },
      }),
      prisma.notification.count(),
    ]);

    const typeMap = {
      TERRITORY_ATTACK: 'attack',
      TERRITORY_CAPTURED: 'capture',
      TERRITORY_DEFENDED: 'capture',
      NIGHT_EVENT_START: 'night_event',
      NIGHT_EVENT_END: 'night_event',
      NEW_CELL_EXPLORED: 'explore',
      WEEKLY_STATS: 'weekly_stats',
      RANK_IMPROVED: 'leaderboard',
      LEVEL_UP: 'system',
      ADMIN_BROADCAST: 'broadcast',
      SYSTEM: 'system',
    };

    const mapped = notifications.map((n) => ({
      id: n.id,
      type: typeMap[n.type] || 'system',
      title: n.title,
      body: n.body,
      recipientUsername: n.user?.username,
      isBroadcast: n.type === 'ADMIN_BROADCAST',
      status: n.isSent ? 'sent' : 'pending',
      createdAt: n.createdAt,
    }));

    res.json({ success: true, data: { notifications: mapped, total } });
  } catch (error) { next(error); }
});

router.get('/notifications/stats', async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalSent, sentToday, failed, broadcasts] = await Promise.all([
      prisma.notification.count({ where: { isSent: true } }),
      prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.notification.count({ where: { isSent: false } }),
      prisma.notification.count({ where: { type: 'ADMIN_BROADCAST' } }),
    ]);

    res.json({ success: true, data: { totalSent, sentToday, failed, broadcasts } });
  } catch (error) { next(error); }
});

// ============================================================
// TIZIM SOZLAMALARI
// ============================================================

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    res.json({ success: true, data: { settings } });
  } catch (error) { next(error); }
});

// Bulk update
router.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings) || settings.length === 0) {
      throw new AppError('settings massivi majburiy', 400, 'VALIDATION_ERROR');
    }

    const updated = [];
    for (const { key, value } of settings) {
      const s = await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: String(value), updatedBy: req.admin.username },
        update: { value: String(value), updatedBy: req.admin.username },
      });
      updated.push(s);
    }

    logger.info(`${updated.length} ta sozlama yangilandi | ${req.admin.username}`);
    res.json({ success: true, data: { updated: updated.length } });
  } catch (error) { next(error); }
});

// Single update
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

router.get('/logs/export', async (req, res, next) => {
  try {
    const { level, category } = req.query;
    const where = {};
    if (category) where.eventType = { startsWith: category.toUpperCase() };

    const logs = await prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: { user: { select: { username: true } } },
    });

    const rows = logs.map((l) => {
      const cat = l.eventType?.split('_')[0]?.toLowerCase() || 'system';
      const msg = l.description || l.eventType;
      return `"${l.createdAt.toISOString()}","info","${cat}","${msg?.replace(/"/g, '""')}","${l.userId || ''}","${l.user?.username || ''}"`;
    });

    const csv = ['Vaqt,Daraja,Kategoriya,Xabar,User ID,Username', ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, level, category, eventType, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (category) {
      where.eventType = {
        in: Object.values({
          auth: ['SESSION_STARTED', 'SESSION_ENDED'],
          territory: ['TERRITORY_CAPTURED', 'TERRITORY_ATTACKED', 'TERRITORY_DEFENDED', 'TERRITORY_LOST', 'TERRITORY_RESET'],
          session: ['SESSION_STARTED', 'SESSION_ENDED', 'SESSION_PAUSED', 'SESSION_RESUMED'],
          notification: ['ADMIN_NOTIFICATION_SENT'],
          admin: ['USER_BLOCKED', 'USER_UNBLOCKED', 'ADMIN_NOTIFICATION_SENT'],
          scheduler: ['NIGHT_EVENT_STARTED', 'NIGHT_EVENT_ENDED'],
          system: ['SUSPICIOUS_SPEED', 'GPS_JUMP_DETECTED', 'FAKE_GPS_DETECTED', 'LEVEL_UP', 'XP_EARNED'],
        }[category.toLowerCase()] || []),
      };
    }
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [rawLogs, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.eventLog.count({ where }),
    ]);

    const levelMap = {
      SUSPICIOUS_SPEED: 'warn', GPS_JUMP_DETECTED: 'warn', FAKE_GPS_DETECTED: 'warn',
      USER_BLOCKED: 'warn', TERRITORY_RESET: 'info', ADMIN_NOTIFICATION_SENT: 'info',
      SESSION_STARTED: 'info', SESSION_ENDED: 'info', TERRITORY_CAPTURED: 'info',
      TERRITORY_ATTACKED: 'info', LEVEL_UP: 'info', NIGHT_EVENT_STARTED: 'info',
      NIGHT_EVENT_ENDED: 'info',
    };
    const categoryMap = {
      SESSION_STARTED: 'session', SESSION_ENDED: 'session', SESSION_PAUSED: 'session', SESSION_RESUMED: 'session',
      TERRITORY_CAPTURED: 'territory', TERRITORY_ATTACKED: 'territory', TERRITORY_DEFENDED: 'territory',
      TERRITORY_LOST: 'territory', TERRITORY_RESET: 'territory', CELL_EXPLORED: 'territory',
      NIGHT_EVENT_STARTED: 'scheduler', NIGHT_EVENT_ENDED: 'scheduler',
      USER_BLOCKED: 'admin', USER_UNBLOCKED: 'admin', ADMIN_NOTIFICATION_SENT: 'notification',
      SUSPICIOUS_SPEED: 'system', GPS_JUMP_DETECTED: 'system', FAKE_GPS_DETECTED: 'system',
      LEVEL_UP: 'system', XP_EARNED: 'system',
    };

    const logs = rawLogs.map((l) => ({
      id: l.id,
      timestamp: l.createdAt,
      level: levelMap[l.eventType] || 'info',
      category: categoryMap[l.eventType] || 'system',
      message: l.description || l.eventType,
      userId: l.userId,
      username: l.user?.username,
      meta: l.metadata,
    }));

    res.json({ success: true, data: { logs, total } });
  } catch (error) { next(error); }
});

module.exports = router;
