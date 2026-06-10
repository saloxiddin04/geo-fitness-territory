/**
 * Geo Fitness Territory - Asosiy Server
 * Express.js + Socket.IO + PostgreSQL + Redis
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initSocketServer } = require('./modules/webSocket');
const { connectRedis } = require('./shared/config/redis.config');
const { connectDatabase } = require('./shared/config/database.config');
const { startSchedulers } = require('./modules/scheduler');
const logger = require('./shared/utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Database ulanish
    await connectDatabase();
    logger.info('✅ PostgreSQL ulandi');

    // Redis ulanish
    await connectRedis();
    logger.info('✅ Redis ulandi');

    // HTTP server yaratish
    const httpServer = http.createServer(app);

    // Socket.IO serverni ishga tushirish
    initSocketServer(httpServer);
    logger.info('✅ Socket.IO server ishga tushdi');

    // Cron job schedulerlarni ishga tushirish
    startSchedulers();
    logger.info('✅ Schedulerlar ishga tushdi');

    // HTTP serverni tinglash
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server ${PORT} portda ishlamoqda`);
      logger.info(`📖 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(httpServer));
    process.on('SIGINT', () => gracefulShutdown(httpServer));

  } catch (error) {
    logger.error('❌ Server ishga tushmadi:', error);
    process.exit(1);
  }
}

/**
 * Serverni to'g'ri to'xtatish
 * Barcha ulanishlarni yopib, resurslarni bo'shatadi
 */
async function gracefulShutdown(server) {
  logger.info('⚠️ Graceful shutdown boshlandi...');
  
  server.close(() => {
    logger.info('HTTP server yopildi');
    process.exit(0);
  });

  // 10 soniya ichida to'xtamasa majburan to'xtatish
  setTimeout(() => {
    logger.error('Majburiy to\'xtatish');
    process.exit(1);
  }, 10000);
}

startServer();
