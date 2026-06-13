/**
 * Socket.IO Server
 * Real-time eventlar: territory attack, capture, notification, leaderboard
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../../../shared/config/redis.config');
const logger = require('../../../shared/utils/logger');

let io;

// Online foydalanuvchilar: userId -> socketId mapping
const userSocketMap = new Map();

/**
 * Socket.IO serverni ishga tushirish
 * @param {http.Server} httpServer - HTTP server instance
 */
function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [process.env.FRONTEND_URL, 'http://localhost:8080'].filter(Boolean);
        callback(null, allowed.includes(origin));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT autentifikatsiya middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Autentifikatsiya tokeni talab etiladi'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Yaroqsiz token'));
    }
  });

  // Ulanish event handleri
  io.on('connection', handleConnection);

  logger.info('Socket.IO server ishga tushdi');
  return io;
}

/**
 * Yangi socket ulanish
 */
async function handleConnection(socket) {
  const { userId } = socket;
  
  logger.debug(`Socket ulandi: ${userId} | SocketID: ${socket.id}`);

  // Foydalanuvchi o'z xonasiga qo'shilish
  socket.join(`user:${userId}`);
  
  // Socket mapping ni yangilash
  userSocketMap.set(userId, socket.id);
  
  // Redis da online statusni saqlash
  const redis = getRedisClient();
  await redis.setex(
    REDIS_KEYS.USER_SOCKET(userId),
    REDIS_TTL.ONLINE_USER,
    socket.id
  );
  await redis.sadd(REDIS_KEYS.ONLINE_USERS, userId);

  // Ulangan userlar sonini broadcast qilish (admin uchun)
  broadcastOnlineCount();

  // Event handlerlar
  socket.on('territory:subscribe', (data) => handleTerritorySubscribe(socket, data));
  socket.on('map:subscribe', (data) => handleMapSubscribe(socket, data));
  socket.on('ping', () => socket.emit('pong'));
  
  // Ulanish uzilishi
  socket.on('disconnect', () => handleDisconnect(socket, userId));
}

/**
 * Xaritaning muayyan hududini kuzatishga yozilish
 * Foydalanuvchi xaritaning muayyan qismini ko'rayotganda
 */
function handleTerritorySubscribe(socket, data) {
  const { h3Index } = data;
  if (h3Index) {
    socket.join(`territory:${h3Index}`);
    logger.debug(`Socket territory ga yozildi: ${h3Index}`);
  }
}

/**
 * Xarita hududiga yozilish (viewport asosida)
 */
function handleMapSubscribe(socket, data) {
  const { region } = data;
  if (region) {
    // Eski regiondan chiqish
    socket.rooms.forEach((room) => {
      if (room.startsWith('region:')) socket.leave(room);
    });
    socket.join(`region:${region}`);
  }
}

/**
 * Ulanish uzilishi
 */
async function handleDisconnect(socket, userId) {
  logger.debug(`Socket uzildi: ${userId}`);
  
  userSocketMap.delete(userId);
  
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.USER_SOCKET(userId));
  await redis.srem(REDIS_KEYS.ONLINE_USERS, userId);
  
  broadcastOnlineCount();
}

// ============================================================
// EMIT HELPER FUNKSIYALAR
// Boshqa modullardan ishlatiladi
// ============================================================

/**
 * Muayyan foydalanuvchiga event yuborish
 * @param {string} userId - Foydalanuvchi ID
 * @param {string} event - Event nomi
 * @param {Object} data - Ma'lumotlar
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Barcha ulangan foydalanuvchilarga broadcast
 */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Muayyan hududni kuzatuvchilarga event
 */
function emitToTerritory(h3Index, event, data) {
  if (!io) return;
  io.to(`territory:${h3Index}`).emit(event, data);
}

/**
 * Leaderboard yangilanishi
 */
function emitLeaderboardUpdate(category, data) {
  if (!io) return;
  io.emit(`leaderboard:update:${category}`, data);
}

/**
 * Online foydalanuvchilar sonini admin ga yuborish
 */
function broadcastOnlineCount() {
  if (!io) return;
  io.emit('stats:online_count', { count: userSocketMap.size });
}

/**
 * Foydalanuvchi online ekanligini tekshirish
 */
function isUserOnline(userId) {
  return userSocketMap.has(userId);
}

/**
 * Online foydalanuvchilar sonini olish
 */
function getOnlineCount() {
  return userSocketMap.size;
}

module.exports = {
  initSocketServer,
  emitToUser,
  emitToAll,
  emitToTerritory,
  emitLeaderboardUpdate,
  broadcastOnlineCount,
  isUserOnline,
  getOnlineCount,
};
