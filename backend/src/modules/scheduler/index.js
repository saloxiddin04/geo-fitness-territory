/**
 * Scheduler - Barcha cron job larni boshqarish
 * node-cron ishlatiladi
 */

const cron = require('node-cron');
const nightEventService = require('./jobs/nightEvent.service');
const { prisma } = require('../../../shared/config/database.config');
const { emitLeaderboardUpdate } = require('../../webSocket/handlers/socket.handler');
const logger = require('../../../shared/utils/logger');

/**
 * Barcha schedulerlarni ishga tushirish
 */
function startSchedulers() {
  // Night Event boshlash (har kuni soat 20:00 da)
  cron.schedule('0 20 * * *', async () => {
    logger.info('Cron: Night Event boshlash');
    await nightEventService.startNightEvent();
  }, { timezone: 'Asia/Tashkent' });

  // Night Event tugatish (har kuni soat 23:00 da)
  cron.schedule('0 23 * * *', async () => {
    logger.info('Cron: Night Event tugatish');
    await nightEventService.endNightEvent();
  }, { timezone: 'Asia/Tashkent' });

  // Leaderboard cache yangilash (har 5 daqiqada)
  cron.schedule('*/5 * * * *', async () => {
    await refreshLeaderboardCache();
  });

  // Haftalik statistika reset (har dushanba kuni 00:00 da)
  cron.schedule('0 0 * * 1', async () => {
    logger.info('Cron: Haftalik statistika reset');
    await resetWeeklyStatistics();
  }, { timezone: 'Asia/Tashkent' });

  // Muddati o'tgan tokenlarni tozalash (har kuni 03:00 da)
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron: Muddati o\'tgan tokenlarni tozalash');
    await cleanExpiredTokens();
  });

  logger.info('Barcha schedulerlar ishga tushdi ✅');
}

/**
 * Leaderboard cache ni yangilash
 */
async function refreshLeaderboardCache() {
  try {
    // Territory leaderboard
    const territoryLeaders = await prisma.$queryRaw`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region,
             COUNT(t.id)::int as territory_count
      FROM users u
      LEFT JOIN territories t ON t.owner_id = u.id
      WHERE u.is_active = true AND u.is_blocked = false
      GROUP BY u.id
      ORDER BY territory_count DESC
      LIMIT 100
    `;

    // Distance leaderboard
    const distanceLeaders = await prisma.$queryRaw`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region,
             COALESCE(us.total_distance_meters, 0) as total_distance
      FROM users u
      LEFT JOIN user_statistics us ON us.user_id = u.id
      WHERE u.is_active = true AND u.is_blocked = false
      ORDER BY total_distance DESC
      LIMIT 100
    `;

    // Socket orqali yangilash event yuborish
    emitLeaderboardUpdate('territory', { leaders: territoryLeaders });
    emitLeaderboardUpdate('distance', { leaders: distanceLeaders });

  } catch (error) {
    logger.error('Leaderboard cache yangilashda xato:', error);
  }
}

/**
 * Haftalik statistikani reset qilish
 */
async function resetWeeklyStatistics() {
  try {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);

    await prisma.userStatistics.updateMany({
      data: {
        weeklyDistanceMeters: 0,
        weeklyDurationSeconds: 0,
        weeklySessions: 0,
        weeklyStartDate: weekStart,
      },
    });

    logger.info('Haftalik statistika reset qilindi');
  } catch (error) {
    logger.error('Haftalik statistika reset xatosi:', error);
  }
}

/**
 * Muddati o'tgan tokenlarni tozalash
 */
async function cleanExpiredTokens() {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
    logger.info(`${result.count} ta muddati o'tgan token o'chirildi`);
  } catch (error) {
    logger.error('Token tozalashda xato:', error);
  }
}

module.exports = { startSchedulers };
