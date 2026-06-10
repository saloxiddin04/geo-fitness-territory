/**
 * Notification Service
 * Firebase Cloud Messaging va Apple Push Notification Service
 * Real-time va background notifikatsiyalar
 */

const admin = require('firebase-admin');
const { prisma } = require('../../../shared/config/database.config');
const logger = require('../../../shared/utils/logger');

// Firebase Admin SDK ni ishga tushirish (birinchi marta)
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized || !process.env.FIREBASE_PROJECT_ID) return;

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
      }),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK ishga tushdi');
  } catch (error) {
    logger.error('Firebase ishga tushirishda xato:', error);
  }
}

initFirebase();

/**
 * Hududga hujum notifikatsiyasi
 * @param {string} defenderId - Himoyachi foydalanuvchi ID
 * @param {string} attackerId - Hujumchi foydalanuvchi ID
 * @param {string} h3Index - H3 cell indeksi
 */
async function sendTerritoryAttackNotification(defenderId, attackerId, h3Index) {
  const defender = await prisma.user.findUnique({
    where: { id: defenderId },
    select: { fcmToken: true, apnsToken: true, devicePlatform: true },
  });

  if (!defender) return;

  const attacker = await prisma.user.findUnique({
    where: { id: attackerId },
    select: { username: true, displayName: true },
  });

  const notification = await createNotification({
    userId: defenderId,
    senderId: attackerId,
    type: 'TERRITORY_ATTACK',
    title: '⚔️ Hududingizga hujum!',
    body: `${attacker?.displayName || attacker?.username} sizning hududingizga hujum qilmoqda!`,
    data: { h3Index, attackerId, type: 'TERRITORY_ATTACK' },
  });

  // Push notification yuborish
  await sendPushNotification(
    defender.fcmToken,
    notification.title,
    notification.body,
    notification.data,
    notification.id
  );
}

/**
 * Night Event boshlanganligi haqida barcha foydalanuvchilarga xabar
 */
async function sendNightEventStartNotification() {
  const usersWithTokens = await prisma.user.findMany({
    where: {
      isActive: true,
      isBlocked: false,
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  });

  const title = '🌙 Kechki Event boshlandi!';
  const body = 'Kechki 20:00 - 23:00 oralig\'ida barcha balllar 1.5x! Yuguring!';

  // Batch notification (FCM Multicast)
  const tokens = usersWithTokens.map((u) => u.fcmToken).filter(Boolean);
  if (tokens.length > 0) {
    await sendMulticastNotification(tokens, title, body, { type: 'NIGHT_EVENT_START' });
  }

  // DB ga yozish
  for (const user of usersWithTokens) {
    await createNotification({
      userId: user.id,
      type: 'NIGHT_EVENT_START',
      title,
      body,
      data: { type: 'NIGHT_EVENT_START' },
    });
  }

  logger.info(`Night Event notifikatsiyasi ${tokens.length} ta foydalanuvchiga yuborildi`);
}

/**
 * Daraja oshdi notifikatsiyasi
 */
async function sendLevelUpNotification(userId, newLevel) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  const notification = await createNotification({
    userId,
    type: 'LEVEL_UP',
    title: '🎉 Daraja oshdi!',
    body: `Tabriklaymiz! ${newLevel}-darajaga chiqdingiz!`,
    data: { newLevel: String(newLevel), type: 'LEVEL_UP' },
  });

  if (user?.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      notification.title,
      notification.body,
      notification.data,
      notification.id
    );
  }
}

/**
 * Haftalik statistika notifikatsiyasi
 */
async function sendWeeklyStatsNotification(userId, stats) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, displayName: true },
  });

  const distanceKm = (stats.weeklyDistanceMeters / 1000).toFixed(1);
  
  const notification = await createNotification({
    userId,
    type: 'WEEKLY_STATS',
    title: '📊 Haftalik statistika',
    body: `Bu hafta ${distanceKm} km yugurdingiz! ${stats.weeklySessions} ta sessiya.`,
    data: { type: 'WEEKLY_STATS', ...stats },
  });

  if (user?.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      notification.title,
      notification.body,
      notification.data,
      notification.id
    );
  }
}

/**
 * Admin broadcast - barcha foydalanuvchilarga
 */
async function sendAdminBroadcast(title, body, data = {}) {
  const usersWithTokens = await prisma.user.findMany({
    where: { isActive: true, isBlocked: false, fcmToken: { not: null } },
    select: { id: true, fcmToken: true },
  });

  const tokens = usersWithTokens.map((u) => u.fcmToken).filter(Boolean);
  
  if (tokens.length > 0) {
    await sendMulticastNotification(tokens, title, body, { type: 'ADMIN_BROADCAST', ...data });
  }

  // Bulk DB yozish
  await prisma.notification.createMany({
    data: usersWithTokens.map((user) => ({
      userId: user.id,
      type: 'ADMIN_BROADCAST',
      title,
      body,
      data: { type: 'ADMIN_BROADCAST', ...data },
      isSent: true,
      sentAt: new Date(),
    })),
  });

  return tokens.length;
}

// ============================================================
// PRIVATE HELPER FUNKSIYALAR
// ============================================================

/**
 * Notification bazaga saqlash
 */
async function createNotification({ userId, senderId, type, title, body, data }) {
  return prisma.notification.create({
    data: {
      userId,
      senderId,
      type,
      title,
      body,
      data: data || {},
    },
  });
}

/**
 * FCM push notification yuborish (bitta qurilma)
 */
async function sendPushNotification(fcmToken, title, body, data = {}, notificationId) {
  if (!fcmToken || !firebaseInitialized) return;

  try {
    // Data ni string ga o'girish (FCM talabi)
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }
    if (notificationId) stringData.notificationId = notificationId;

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'geo_fitness_default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    // Notification ID ni yangilash
    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isSent: true, sentAt: new Date(), fcmMessageId: response },
      });
    }

    return response;
  } catch (error) {
    logger.error('Push notification yuborishda xato:', { error: error.message, fcmToken: fcmToken?.slice(0, 20) });
    
    // Token yaroqsiz bo'lsa tozalash
    if (error.code === 'messaging/registration-token-not-registered') {
      await prisma.user.updateMany({
        where: { fcmToken },
        data: { fcmToken: null },
      });
    }
  }
}

/**
 * FCM Multicast - bir vaqtda ko'p qurilmalarga
 * FCM 500 ta token limitiga ega, shuning uchun batch ishlash kerak
 */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!firebaseInitialized || tokens.length === 0) return;

  const BATCH_SIZE = 500;
  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = String(value);
  }

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    
    try {
      const message = {
        tokens: batch,
        notification: { title, body },
        data: stringData,
        android: { priority: 'high' },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.debug(`Multicast: ${response.successCount}/${batch.length} muvaffaqiyatli`);
    } catch (error) {
      logger.error('Multicast xatosi:', error.message);
    }
  }
}

module.exports = {
  sendTerritoryAttackNotification,
  sendNightEventStartNotification,
  sendLevelUpNotification,
  sendWeeklyStatsNotification,
  sendAdminBroadcast,
  createNotification,
};
