/**
 * Running Session Service
 * GPS sessiyalarini boshqarish, fitness hisob-kitoblar va cheat detection
 */

const { prisma } = require('../../../shared/config/database.config');
const { getRedisClient, REDIS_KEYS } = require('../../../shared/config/redis.config');
const h3Engine = require('../../h3Engine/services/h3Engine.service');
const territoryService = require('../../territory/services/territory.service');
const nightEventService = require('../../scheduler/jobs/nightEvent.service');
const { AppError } = require('../../../shared/middleware/error.middleware');
const logger = require('../../../shared/utils/logger');

// GPS yozib borish intervali (soniya) - client tomonida ham bir xil bo'lishi kerak
const GPS_INTERVAL_SECONDS = 5;

/**
 * Yangi yugurish sessiyasini boshlash
 * @param {string} userId - Foydalanuvchi ID
 * @param {Object} startPoint - Boshlang'ich GPS nuqta { lat, lng }
 */
async function startSession(userId, startPoint) {
  // Foydalanuvchining faol sessiyasi borligini tekshirish - mavjud bo'lsa qaytaramiz
  const activeSession = await getActiveSession(userId);
  if (activeSession) {
    logger.info(`Faol sessiya topildi, qaytarilmoqda: ${userId} | Session: ${activeSession.id}`);
    return activeSession;
  }

  // GPS koordinatalarni tekshirish
  if (!h3Engine.isInUzbekistan(startPoint.lat, startPoint.lng)) {
    throw new AppError('GPS koordinatalar O\'zbekiston hududida emas', 400, 'INVALID_LOCATION');
  }

  // Yangi sessiya yaratish
  const session = await prisma.runningSession.create({
    data: {
      userId,
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  });

  // Birinchi GPS nuqtani saqlash
  await saveGpsPoint(session.id, startPoint);

  // Redis da faol sessiyani saqlash
  const redis = getRedisClient();
  await redis.setex(
    REDIS_KEYS.SESSION_ACTIVE(userId),
    3600, // 1 soat
    JSON.stringify({ sessionId: session.id, startedAt: session.startedAt })
  );

  logger.info(`Yugurish sessiyasi boshlandi: ${userId} | Session: ${session.id}`);
  return session;
}

/**
 * GPS nuqtalarini qabul qilish (sessiya davomida)
 * Cheat detection va territory processing
 * 
 * @param {string} userId - Foydalanuvchi ID
 * @param {string} sessionId - Sessiya ID
 * @param {Array} points - GPS nuqtalar [{ lat, lng, timestamp, accuracy }]
 */
async function addGpsPoints(userId, sessionId, points) {
  // Sessiyani tekshirish
  const session = await getSessionById(sessionId);
  if (!session || session.userId !== userId) {
    throw new AppError('Sessiya topilmadi', 404, 'SESSION_NOT_FOUND');
  }
  if (session.status !== 'ACTIVE') {
    throw new AppError('Sessiya faol emas', 400, 'SESSION_NOT_ACTIVE');
  }

  // Oxirgi GPS nuqtani olish (cheat detection uchun)
  const lastPoint = await getLastGpsPoint(sessionId);

  const validPoints = [];
  let suspicious = false;
  let suspiciousReason = null;

  for (const point of points) {
    // Koordinatalarni tekshirish
    if (!isValidCoordinates(point.lat, point.lng)) continue;

    // Cheat detection (oldingi nuqta mavjud bo'lsa)
    if (lastPoint) {
      const detection = h3Engine.detectSuspiciousMovement(
        { lat: lastPoint.latitude, lng: lastPoint.longitude, recordedAt: lastPoint.recordedAt },
        { lat: point.lat, lng: point.lng, recordedAt: point.timestamp || new Date() }
      );

      if (detection.isSuspicious) {
        suspicious = true;
        suspiciousReason = detection.reason;
        logger.warn(`Shubhali harakat: ${userId} | ${detection.reason}`);
        
        // Shubhali nuqtani o'tkazib yuborish
        continue;
      }
    }

    validPoints.push(point);
  }

  if (validPoints.length === 0) return { processed: 0, suspicious };

  // Nuqtalarni bazaga saqlash (batch)
  await saveGpsPointsBatch(sessionId, validPoints);

  // Sessiyani shubhali deb belgilash
  if (suspicious) {
    await prisma.runningSession.update({
      where: { id: sessionId },
      data: {
        isSuspicious: true,
        suspiciousReason,
      },
    });
  }

  return { processed: validPoints.length, suspicious };
}

/**
 * Yugurish sessiyasini tugatish
 * Umumiy statistika hisoblash va territory processing
 * 
 * @param {string} userId - Foydalanuvchi ID
 * @param {string} sessionId - Sessiya ID
 */
async function endSession(userId, sessionId) {
  // Sessiyani tekshirish
  const session = await getSessionById(sessionId);
  if (!session || session.userId !== userId) {
    throw new AppError('Sessiya topilmadi', 404, 'SESSION_NOT_FOUND');
  }
  if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
    throw new AppError('Sessiya allaqachon tugagan', 400, 'SESSION_ALREADY_ENDED');
  }

  // Barcha GPS nuqtalarni olish
  const gpsPoints = await getAllGpsPoints(sessionId);

  if (gpsPoints.length < 2) {
    // Juda qisqa sessiya - bekor qilish
    await prisma.runningSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', endedAt: new Date() },
    });

    // Redis dan o'chirish
    const redis = getRedisClient();
    await redis.del(REDIS_KEYS.SESSION_ACTIVE(userId));

    return { status: 'CANCELLED', message: 'Sessiya juda qisqa edi' };
  }

  // Masofa hisoblash
  const pointsForCalc = gpsPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const distanceMeters = h3Engine.calculateTotalDistance(pointsForCalc);
  
  // Vaqt hisoblash
  const durationSeconds = Math.floor(
    (new Date() - new Date(session.startedAt)) / 1000
  );

  // Fitness hisob-kitoblar
  const avgSpeedKmh = h3Engine.calculateSpeed(distanceMeters, durationSeconds);
  const caloriesBurned = h3Engine.calculateCalories(distanceMeters, durationSeconds / 60);
  const avgPaceMinKm = h3Engine.calculatePace(durationSeconds, distanceMeters);

  // Night Event tekshiruvi
  const isNightEvent = await nightEventService.isNightEventActive();

  // Territory processing
  const territoryResult = await territoryService.processRunningPath(
    userId,
    gpsPoints.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      recordedAt: p.recordedAt,
    })),
    distanceMeters,
    isNightEvent
  );

  // Tezliklar
  const maxSpeedKmh = gpsPoints.reduce((max, p) => {
    return Math.max(max, p.speedKmh || 0);
  }, 0);

  // Sessiyani yangilash
  const updatedSession = await prisma.runningSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      durationSeconds,
      distanceMeters,
      avgSpeedKmh,
      maxSpeedKmh,
      caloriesBurned: parseFloat(caloriesBurned),
      avgPaceMinKm,
      xpEarned: territoryResult.xpEarned,
      territoriesCaptured: territoryResult.capturedTerritories.length,
      cellsExplored: territoryResult.newCells.length,
      nightEventBonus: isNightEvent,
    },
  });

  // Foydalanuvchi umumiy statistikasini yangilash
  await updateUserRunningStatistics(userId, {
    distanceMeters,
    durationSeconds,
    caloriesBurned: parseFloat(caloriesBurned),
    avgPaceMinKm,
    maxSpeedKmh,
  });

  // Redis dan faol sessiyani o'chirish
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.SESSION_ACTIVE(userId));

  logger.info(`Sessiya tugadi: ${sessionId} | ${(distanceMeters / 1000).toFixed(2)}km | ${durationSeconds}s`);

  return {
    session: updatedSession,
    territoryResult,
    fitness: {
      distanceMeters,
      durationSeconds,
      avgSpeedKmh,
      caloriesBurned,
      avgPaceMinKm,
    },
  };
}

/**
 * Yugurish tarixini olish
 * @param {string} userId - Foydalanuvchi ID
 * @param {number} page - Sahifa
 * @param {number} limit - Hajm
 */
async function getRunningHistory(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.runningSession.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        distanceMeters: true,
        avgSpeedKmh: true,
        caloriesBurned: true,
        avgPaceMinKm: true,
        xpEarned: true,
        territoriesCaptured: true,
        cellsExplored: true,
        nightEventBonus: true,
      },
    }),
    prisma.runningSession.count({
      where: { userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
    }),
  ]);

  return {
    sessions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// PRIVATE HELPER FUNKSIYALAR
// ============================================================

/**
 * Faol sessiyani olish
 */
async function getActiveSession(userId) {
  return prisma.runningSession.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
}

/**
 * Sessiyani ID bo'yicha olish
 */
async function getSessionById(sessionId) {
  return prisma.runningSession.findUnique({
    where: { id: sessionId },
  });
}

/**
 * Bitta GPS nuqtani saqlash
 */
async function saveGpsPoint(sessionId, point) {
  const h3Index = h3Engine.getH3Index(point.lat, point.lng);
  
  return prisma.$queryRaw`
    INSERT INTO running_points (session_id, latitude, longitude, altitude, accuracy, speed_kmh, recorded_at, h3_index, geom_point)
    VALUES (
      ${sessionId}::uuid, ${point.lat}, ${point.lng}, ${point.altitude || null},
      ${point.accuracy || null}, ${point.speed || null},
      ${new Date(point.timestamp || Date.now())},
      ${h3Index},
      ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)
    )
  `;
}

/**
 * GPS nuqtalar batch saqlash (performance uchun)
 */
async function saveGpsPointsBatch(sessionId, points) {
  // Batch insert uchun raw SQL
  const values = points.map((p) => {
    const h3Index = h3Engine.getH3Index(p.lat, p.lng);
    return `(
      '${sessionId}',
      ${p.lat}, ${p.lng},
      ${p.altitude || 'NULL'},
      ${p.accuracy || 'NULL'},
      ${p.speed || 'NULL'},
      '${new Date(p.timestamp || Date.now()).toISOString()}',
      '${h3Index}',
      ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)
    )`;
  }).join(',');

  if (!values) return;

  await prisma.$queryRawUnsafe(`
    INSERT INTO running_points 
      (session_id, latitude, longitude, altitude, accuracy, speed_kmh, recorded_at, h3_index, geom_point)
    VALUES ${values}
  `);
}

/**
 * Oxirgi GPS nuqtani olish
 */
async function getLastGpsPoint(sessionId) {
  const result = await prisma.runningPoint.findFirst({
    where: { sessionId },
    orderBy: { recordedAt: 'desc' },
  });
  return result;
}

/**
 * Barcha GPS nuqtalarni olish
 */
async function getAllGpsPoints(sessionId) {
  return prisma.runningPoint.findMany({
    where: { sessionId },
    orderBy: { recordedAt: 'asc' },
  });
}

/**
 * GPS koordinatalarni tekshirish
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Foydalanuvchi yugurish statistikasini yangilash
 */
async function updateUserRunningStatistics(userId, { distanceMeters, durationSeconds, caloriesBurned, avgPaceMinKm, maxSpeedKmh }) {
  // Hozirgi statistikani olish
  const stats = await prisma.userStatistics.findUnique({
    where: { userId },
    select: { longestRunMeters: true, fastestSpeedKmh: true },
  });

  await prisma.userStatistics.update({
    where: { userId },
    data: {
      totalDistanceMeters: { increment: distanceMeters },
      totalDurationSeconds: { increment: durationSeconds },
      totalSessions: { increment: 1 },
      totalCaloriesBurned: { increment: caloriesBurned },
      
      // Eng uzoq yugurish
      longestRunMeters: distanceMeters > (stats?.longestRunMeters || 0)
        ? distanceMeters
        : undefined,
      
      // Eng tez yugurish
      fastestSpeedKmh: maxSpeedKmh > (stats?.fastestSpeedKmh || 0)
        ? maxSpeedKmh
        : undefined,
      
      // Haftalik statistika
      weeklyDistanceMeters: { increment: distanceMeters },
      weeklyDurationSeconds: { increment: durationSeconds },
      weeklySessions: { increment: 1 },
    },
  });
}

module.exports = {
  startSession,
  addGpsPoints,
  endSession,
  getRunningHistory,
  getActiveSession,
};
