/**
 * Winston Logger - Professional logging tizimi
 * Console va fayl loglari bilan
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Maxsus log formati
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // Meta ma'lumotlarni qo'shish
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }
    
    // Stack trace (xatolar uchun)
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// JSON formati (fayl loglari uchun)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transport konfiguratsiyalari
const transports = [
  // Console transport (development uchun rangli)
  new winston.transports.Console({
    level: LOG_LEVEL,
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      logFormat
    ),
    silent: process.env.NODE_ENV === 'test',
  }),
];

// Production va development da fayl loglarini yoqish
if (process.env.NODE_ENV !== 'test') {
  // Xatolar uchun alohida fayl
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: jsonFormat,
      maxFiles: '30d',
      maxSize: '20m',
    })
  );

  // Barcha loglar
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: jsonFormat,
      maxFiles: '14d',
      maxSize: '50m',
    })
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'geo-fitness-api' },
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

module.exports = logger;
