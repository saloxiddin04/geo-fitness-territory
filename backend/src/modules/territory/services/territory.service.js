/**
 * Territory Service
 * H3 grid asosida hudud egallash, hujum va himoya logikasi
 * Bu loyihaning eng muhim business logic moduli
 */

const { prisma } = require('../../../shared/config/database.config');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../../../shared/config/redis.config');
const h3Engine = require('../../h3Engine/services/h3Engine.service');
const notificationService = require('../../notification/services/notification.service');
const { emitToUser } = require('../../webSocket/handlers/socket.handler');
const { AppError } = require('../../../shared/middleware/error.middleware');
const logger = require('../../../shared/utils/logger');

// Hudud egallash uchun kerakli control points
const CAPTURE_THRESHOLD = parseInt(process.env.CAPTURE_THRESHOLD) || 100;
const CONTROL_POINTS_PER_100M = parseInt(process.env.CONTROL_POINTS_PER_100M) || 10;
const XP_PER_TERRITORY_CAPTURE = parseInt(process.env.XP_PER_TERRITORY_CAPTURE) || 50;
const XP_PER_NEW_CELL = parseInt(process.env.XP_PER_NEW_CELL) || 5;
const XP_PER_100M = parseInt(process.env.XP_PER_100M) || 2;

/**
 * GPS yo'lidan o'tgan H3 celllarni qayta ishlash
 * Running session davomida chaqiriladi
 * 
 * @param {string} userId - Yuguruvchi foydalanuvchi ID
 * @param {Array} gpsPoints - GPS nuqtalar [{ lat, lng, recordedAt }]
 * @param {number} distanceMeters - Yugurilgan masofa (metr)
 * @param {boolean} isNightEvent - Kechki event faolmi
 * @returns {Object} Qayta ishlash natijasi
 */
async function processRunningPath(userId, gpsPoints, distanceMeters, isNightEvent = false) {
  if (!gpsPoints || gpsPoints.length === 0) {
    return { capturedTerritories: [], newCells: [], xpEarned: 0, controlPoints: 0 };
  }

  // Night event multiplieri
  const multiplier = isNightEvent ? parseFloat(process.env.NIGHT_EVENT_MULTIPLIER) || 1.5 : 1;

  // GPS yo'lidan o'tgan barcha H3 indexlarni aniqlash
  const h3Set = h3Engine.getH3IndexesFromPath(gpsPoints);
  
  // Har 100m uchun control points
  const controlPoints = Math.floor((distanceMeters / 100) * CONTROL_POINTS_PER_100M * multiplier);
  
  // XP hisoblash
  let xpEarned = Math.floor((distanceMeters / 100) * XP_PER_100M * multiplier);

  const results = {
    capturedTerritories: [],
    newCells: [],
    xpEarned,
    controlPoints,
  };

  // Har bir H3 cell uchun
  for (const h3Index of h3Set) {
    // Fog of War: yangi cell kashf qilinganmi?
    const isNewCell = await processNewCell(userId, h3Index);
    if (isNewCell) {
      results.newCells.push(h3Index);
      xpEarned += Math.floor(XP_PER_NEW_CELL * multiplier);
    }

    // Hudud egallash tekshiruvi
    const captureResult = await processTerritoryCapture(
      userId,
      h3Index,
      controlPoints,
      multiplier
    );
    
    if (captureResult) {
      results.capturedTerritories.push(captureResult);
      xpEarned += Math.floor(XP_PER_TERRITORY_CAPTURE * multiplier);
    }
  }

  results.xpEarned = Math.floor(xpEarned);

  // Foydalanuvchi XP va statistikasini yangilash
  await updateUserStats(userId, {
    xpEarned: results.xpEarned,
    newCellsCount: results.newCells.length,
    capturedCount: results.capturedTerritories.filter((t) => t.isNewCapture).length,
  });

  return results;
}

/**
 * Yangi H3 cell kashf qilinganini qayta ishlash (Fog of War)
 * @param {string} userId - Foydalanuvchi ID
 * @param {string} h3Index - H3 cell indeksi
 * @returns {boolean} Yangi cell kashf qilindimi
 */
async function processNewCell(userId, h3Index) {
  // Allaqachon kashf qilinganini tekshirish
  const existing = await prisma.userExploredCell.findUnique({
    where: {
      userId_h3Index: { userId, h3Index },
    },
  });

  if (existing) return false;

  // Yangi cell saqlash
  await prisma.userExploredCell.create({
    data: {
      userId,
      h3Index,
      xpAwarded: true,
    },
  });

  // Statistikani yangilash
  await prisma.userStatistics.update({
    where: { userId },
    data: { totalExploredCells: { increment: 1 } },
  });

  logger.debug(`Yangi cell kashf qilindi: ${userId} -> ${h3Index}`);
  return true;
}

/**
 * Hudud egallash logikasi
 * Control points yig'ish va capture threshold ga etganda egallash
 * 
 * @param {string} userId - Hujumchi foydalanuvchi ID
 * @param {string} h3Index - H3 cell indeksi
 * @param {number} controlPoints - Qo'shilayotgan control points
 * @param {number} multiplier - Bonus multiplieri
 * @returns {Object|null} Egallash natijasi yoki null
 */
async function processTerritoryCapture(userId, h3Index, controlPoints, multiplier = 1) {
  // Hududni bazadan olish yoki yangi yaratish
  let territory = await prisma.territory.findUnique({
    where: { h3Index },
  });

  const cellCenter = h3Engine.getCellCenter(h3Index);
  const region = h3Engine.getRegionByCoordinates(cellCenter.lat, cellCenter.lng);
  const polygonWKT = h3Engine.getCellPolygonWKT(h3Index);

  if (!territory) {
    // Yangi hudud yaratish
    territory = await prisma.$queryRaw`
      INSERT INTO territories (h3_index, owner_id, control_points, center_lat, center_lng, region, geom_polygon, created_at, updated_at)
      VALUES (
        ${h3Index}, ${userId}, ${controlPoints}, ${cellCenter.lat}, ${cellCenter.lng},
        ${region}, ST_GeomFromText(${polygonWKT}, 4326), NOW(), NOW()
      )
      ON CONFLICT (h3_index) DO UPDATE SET
        control_points = territories.control_points + ${controlPoints},
        updated_at = NOW()
      RETURNING *
    `;
    
    if (Array.isArray(territory)) territory = territory[0];
  }

  // Hozirgi egasi boshqa foydalanuvchi - HUJUM
  if (territory.owner_id && territory.owner_id !== userId) {
    return await handleTerritoryAttack(userId, territory, controlPoints, multiplier);
  }

  // O'z hududiga control point qo'shish
  if (territory.owner_id === userId) {
    await prisma.territory.update({
      where: { h3Index },
      data: {
        controlPoints: { increment: controlPoints },
        defenseLevel: { increment: Math.floor(controlPoints / CAPTURE_THRESHOLD) },
      },
    });
    return null;
  }

  // Egallanmagan hudud - birinchi marta egallash
  if (controlPoints >= CAPTURE_THRESHOLD) {
    await prisma.territory.update({
      where: { h3Index },
      data: {
        ownerId: userId,
        controlPoints: CAPTURE_THRESHOLD,
        capturedAt: new Date(),
      },
    });

    // Statistika yangilash
    await prisma.userStatistics.update({
      where: { userId },
      data: {
        currentTerritories: { increment: 1 },
        totalCaptured: { increment: 1 },
      },
    });

    // Territory cache ni tozalash
    await invalidateTerritoryCache(h3Index);

    logger.info(`Hudud egallandi: ${userId} -> ${h3Index}`);
    return { h3Index, isNewCapture: true, previousOwner: null };
  }

  // Control points yig'ish (hali yetarli emas)
  await prisma.territory.upsert({
    where: { h3Index },
    create: {
      h3Index,
      ownerId: null,
      controlPoints,
      centerLat: cellCenter.lat,
      centerLng: cellCenter.lng,
      region,
    },
    update: {
      controlPoints: { increment: controlPoints },
    },
  });

  return null;
}

/**
 * Territory hujum logikasi
 * Boshqa foydalanuvchining hududiga hujum
 * 
 * @param {string} attackerId - Hujumchi ID
 * @param {Object} territory - Hujum qilinayotgan hudud
 * @param {number} attackPoints - Hujum kuchi
 * @param {number} multiplier - Bonus multiplieri
 */
async function handleTerritoryAttack(attackerId, territory, attackPoints, multiplier = 1) {
  const defenderId = territory.owner_id || territory.ownerId;
  const h3Index = territory.h3_index || territory.h3Index;
  
  // Himoya darajasini hisoblash
  const defenseBonus = (territory.defense_level || territory.defenseLevel || 1) * 0.1;
  const effectiveAttack = attackPoints * multiplier;
  const effectiveDefense = CAPTURE_THRESHOLD * (1 + defenseBonus);

  logger.debug(`Hujum: ${attackerId} -> ${h3Index} | Hujum: ${effectiveAttack} | Himoya: ${effectiveDefense}`);

  // Real-time hujum xabari yuborish (himoyachi faol bo'lsa)
  emitToUser(defenderId, 'territory:attack', {
    h3Index,
    attackerId,
    attackPoints: effectiveAttack,
  });

  // Push notification (himoyachi offline bo'lsa)
  await notificationService.sendTerritoryAttackNotification(
    defenderId,
    attackerId,
    h3Index
  );

  // Hujum kuchli bo'lsa hudud o'tishi
  if (effectiveAttack >= effectiveDefense) {
    // Himoyachi hududni yo'qotdi
    await prisma.territory.update({
      where: { h3Index },
      data: {
        ownerId: attackerId,
        controlPoints: CAPTURE_THRESHOLD,
        defenseLevel: 1,
        capturedAt: new Date(),
        lastAttackedAt: new Date(),
      },
    });

    // Statistika: himoyachi yo'qotdi
    if (defenderId) {
      await prisma.userStatistics.update({
        where: { userId: defenderId },
        data: {
          currentTerritories: { decrement: 1 },
          totalLost: { increment: 1 },
        },
      });
    }

    // Statistika: hujumchi egalladi
    await prisma.userStatistics.update({
      where: { userId: attackerId },
      data: {
        currentTerritories: { increment: 1 },
        totalCaptured: { increment: 1 },
      },
    });

    // Cache tozalash
    await invalidateTerritoryCache(h3Index);

    // Socket event: hudud o'zgardi
    emitToUser(defenderId, 'territory:lost', { h3Index });

    logger.info(`Hudud qo'lga kiritildi: ${attackerId} <- ${defenderId} (${h3Index})`);
    return { h3Index, isNewCapture: true, previousOwner: defenderId };
  }

  // Hujum yetarli emas - himoya ushlab turdi
  await prisma.territory.update({
    where: { h3Index },
    data: {
      controlPoints: { decrement: Math.floor(effectiveAttack * 0.5) },
      lastAttackedAt: new Date(),
    },
  });

  // Statistika: himoyachi himoya qildi
  if (defenderId) {
    await prisma.userStatistics.update({
      where: { userId: defenderId },
      data: { totalDefended: { increment: 1 } },
    });
  }

  return null;
}

/**
 * Foydalanuvchi atrofidagi hududlarni xarita uchun olish
 * @param {number} lat - Kenglik
 * @param {number} lng - Uzunlik
 * @param {number} radiusKm - Radius (km)
 * @param {string} userId - Joriy foydalanuvchi (o'z va begona hududlarni ajratish uchun)
 */
async function getTerritoriesInRadius(lat, lng, radiusKm, userId) {
  // PostGIS orqali radiusdagi hududlarni olish
  const territories = await prisma.$queryRaw`
    SELECT 
      t.h3_index,
      t.owner_id,
      t.control_points,
      t.defense_level,
      t.center_lat,
      t.center_lng,
      t.region,
      u.username as owner_username,
      u.display_name as owner_display_name,
      CASE WHEN t.owner_id = ${userId}::uuid THEN true ELSE false END as is_own
    FROM territories t
    LEFT JOIN users u ON t.owner_id = u.id
    WHERE t.owner_id IS NOT NULL
      AND ST_DWithin(
        t.geom_polygon::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
    LIMIT 500
  `;

  return territories;
}

/**
 * Foydalanuvchi kashf qilgan H3 celllarni olish (Fog of War uchun)
 * @param {string} userId - Foydalanuvchi ID
 */
async function getUserExploredCells(userId) {
  const cells = await prisma.userExploredCell.findMany({
    where: { userId },
    select: { h3Index: true, exploredAt: true },
  });
  return cells.map((c) => c.h3Index);
}

/**
 * Territory cache ni tozalash
 */
async function invalidateTerritoryCache(h3Index) {
  try {
    const redis = getRedisClient();
    await redis.del(REDIS_KEYS.TERRITORY_CACHE(h3Index));
  } catch (error) {
    logger.warn('Territory cache tozalashda xato:', error);
  }
}

/**
 * Foydalanuvchi statistikasini yangilash
 */
async function updateUserStats(userId, { xpEarned, newCellsCount, capturedCount }) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalXp: { increment: xpEarned },
    },
  });

  // Level hisoblash (har 1000 XP = 1 daraja)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true, level: true },
  });

  const newLevel = Math.floor(user.totalXp / 1000) + 1;
  if (newLevel > user.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
    
    // Daraja oshdi notifikatsiyasi
    await notificationService.sendLevelUpNotification(userId, newLevel);
    emitToUser(userId, 'user:level_up', { newLevel });
  }
}

/**
 * Admin: hududni reset qilish
 */
async function resetTerritory(h3Index) {
  await prisma.territory.update({
    where: { h3Index },
    data: {
      ownerId: null,
      controlPoints: 0,
      defenseLevel: 1,
      capturedAt: null,
      lastAttackedAt: null,
    },
  });
  await invalidateTerritoryCache(h3Index);
}

module.exports = {
  processRunningPath,
  getTerritoriesInRadius,
  getUserExploredCells,
  resetTerritory,
  handleTerritoryAttack,
};
