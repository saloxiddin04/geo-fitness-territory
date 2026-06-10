/**
 * Redis ulanish konfiguratsiyasi
 * Leaderboard cache va session management uchun
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

/**
 * Redis clientini yaratish va ulanish
 */
async function connectRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      // Har urinishda kutish vaqtini oshirish (max 30 soniya)
      const delay = Math.min(times * 1000, 30000);
      logger.warn(`Redis qayta ulanish urinishi ${times} | ${delay}ms kutilmoqda`);
      return delay;
    },
    lazyConnect: true,
  });

  // Eventlarni tinglash
  redisClient.on('connect', () => logger.info('Redis ulandi'));
  redisClient.on('error', (err) => logger.error('Redis xatosi:', err));
  redisClient.on('close', () => logger.warn('Redis ulanishi yopildi'));

  await redisClient.connect();
  return redisClient;
}

/**
 * Redis clientini olish
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis ulanmagan. connectRedis() ni avval chaqiring');
  }
  return redisClient;
}

// ============================================================
// REDIS KEYS - Barcha Redis key konstantalari
// ============================================================
const REDIS_KEYS = {
  // Leaderboard
  LEADERBOARD_TERRITORY: 'leaderboard:territory',
  LEADERBOARD_DISTANCE: 'leaderboard:distance',
  LEADERBOARD_EXPLORED: 'leaderboard:explored',
  LEADERBOARD_XP: 'leaderboard:xp',
  
  // Regional leaderboard (viloyat nomi qo'shiladi)
  LEADERBOARD_REGIONAL: (region, category) => `leaderboard:regional:${region}:${category}`,
  
  // Night Event
  NIGHT_EVENT_STATUS: 'night_event:status',
  NIGHT_EVENT_MULTIPLIER: 'night_event:multiplier',
  
  // Online users
  ONLINE_USERS: 'online:users',
  USER_SOCKET: (userId) => `user:socket:${userId}`,
  
  // Territory cache
  TERRITORY_CACHE: (h3Index) => `territory:${h3Index}`,
  
  // Session cache
  SESSION_ACTIVE: (userId) => `session:active:${userId}`,
  
  // Rate limiting
  RATE_LIMIT: (ip) => `rate_limit:${ip}`,
};

const REDIS_TTL = {
  LEADERBOARD: 300,        // 5 daqiqa
  TERRITORY_CACHE: 60,     // 1 daqiqa
  SESSION_CACHE: 3600,     // 1 soat
  NIGHT_EVENT: 86400,      // 24 soat
  ONLINE_USER: 300,        // 5 daqiqa
};

module.exports = { connectRedis, getRedisClient, REDIS_KEYS, REDIS_TTL };
