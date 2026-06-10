/**
 * Night Event Service
 * Kechki 20:00 - 23:00 orasidagi bonus event
 * Redis orqali holat boshqariladi
 */

const { getRedisClient, REDIS_KEYS } = require('../../../shared/config/redis.config');
const notificationService = require('../../notification/services/notification.service');
const { emitToAll } = require('../../webSocket/handlers/socket.handler');
const logger = require('../../../shared/utils/logger');

const NIGHT_EVENT_START_HOUR = parseInt(process.env.NIGHT_EVENT_START_HOUR) || 20;
const NIGHT_EVENT_END_HOUR = parseInt(process.env.NIGHT_EVENT_END_HOUR) || 23;
const NIGHT_EVENT_MULTIPLIER = parseFloat(process.env.NIGHT_EVENT_MULTIPLIER) || 1.5;

/**
 * Night Event faolligini tekshirish
 * @returns {boolean} Night event faolmi
 */
async function isNightEventActive() {
  try {
    const redis = getRedisClient();
    const status = await redis.get(REDIS_KEYS.NIGHT_EVENT_STATUS);
    
    if (status !== null) {
      return status === 'active';
    }

    // Redis da yo'q bo'lsa, vaqtni tekshirish
    return checkNightEventByTime();
  } catch {
    return checkNightEventByTime();
  }
}

/**
 * Vaqt asosida night event holatini aniqlash
 */
function checkNightEventByTime() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= NIGHT_EVENT_START_HOUR && hour < NIGHT_EVENT_END_HOUR;
}

/**
 * Night Eventni boshlash (cron job tomonidan chaqiriladi)
 */
async function startNightEvent() {
  try {
    const redis = getRedisClient();
    
    // Redis da faol deb belgilash
    await redis.setex(
      REDIS_KEYS.NIGHT_EVENT_STATUS,
      (NIGHT_EVENT_END_HOUR - NIGHT_EVENT_START_HOUR) * 3600,
      'active'
    );
    await redis.set(REDIS_KEYS.NIGHT_EVENT_MULTIPLIER, String(NIGHT_EVENT_MULTIPLIER));

    // Socket broadcast
    emitToAll('night_event:started', {
      multiplier: NIGHT_EVENT_MULTIPLIER,
      endHour: NIGHT_EVENT_END_HOUR,
      message: '🌙 Kechki event boshlandi! Barcha balllar 1.5x!',
    });

    // Push notification
    await notificationService.sendNightEventStartNotification();

    logger.info(`Night Event boshlandi (${NIGHT_EVENT_START_HOUR}:00 - ${NIGHT_EVENT_END_HOUR}:00)`);
  } catch (error) {
    logger.error('Night Event boshlashda xato:', error);
  }
}

/**
 * Night Eventni tugatish (cron job tomonidan chaqiriladi)
 */
async function endNightEvent() {
  try {
    const redis = getRedisClient();
    
    await redis.del(REDIS_KEYS.NIGHT_EVENT_STATUS);
    await redis.del(REDIS_KEYS.NIGHT_EVENT_MULTIPLIER);

    // Socket broadcast
    emitToAll('night_event:ended', {
      message: 'Kechki event tugadi. Ertaga yana!',
    });

    logger.info('Night Event tugadi');
  } catch (error) {
    logger.error('Night Event tugatishda xato:', error);
  }
}

/**
 * Night Event multiplierini olish
 */
async function getNightEventMultiplier() {
  const isActive = await isNightEventActive();
  return isActive ? NIGHT_EVENT_MULTIPLIER : 1;
}

module.exports = {
  isNightEventActive,
  startNightEvent,
  endNightEvent,
  getNightEventMultiplier,
  NIGHT_EVENT_START_HOUR,
  NIGHT_EVENT_END_HOUR,
  NIGHT_EVENT_MULTIPLIER,
};
