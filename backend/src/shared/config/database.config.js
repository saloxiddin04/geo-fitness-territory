/**
 * Prisma Client singleton - database ulanishini boshqarish
 * Development va production muhitda optimal ishlash uchun
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Global Prisma instance (development da hot-reload muammosini oldini olish)
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  // Development da global instance ishlatish (hot reload muammosini hal qiladi)
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Development da query loglarini yoqish
    global.__prisma.$on('query', (e) => {
      if (process.env.LOG_DB_QUERIES === 'true') {
        logger.debug(`DB Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
      }
    });
  }
  prisma = global.__prisma;
}

/**
 * Database ulanishini tekshirish
 */
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL ulanish muvaffaqiyatli');
  } catch (error) {
    logger.error('PostgreSQL ulanishda xato:', error);
    throw error;
  }
}

/**
 * Database ulanishini yopish
 */
async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('PostgreSQL ulanish yopildi');
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
