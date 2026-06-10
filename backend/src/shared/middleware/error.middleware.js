/**
 * Global error handling middleware
 * Barcha xatolarni bir joyda boshqarish
 */

const logger = require('../utils/logger');

/**
 * Maxsus ilovaga oid xato klassi
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route topilmadi: ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

/**
 * Global xato handler
 * Express'ning 4-parametrli error middleware sifatida ishlaydi
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Default qiymatlar
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Prisma xatolarini aniqlash va yozib ketish
  if (err.code === 'P2002') {
    err.statusCode = 409;
    err.message = 'Bu ma\'lumot allaqachon mavjud';
    err.code = 'DUPLICATE_ENTRY';
  }

  if (err.code === 'P2025') {
    err.statusCode = 404;
    err.message = 'Ma\'lumot topilmadi';
    err.code = 'NOT_FOUND';
  }

  // JWT xatolarini aniqlash
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Yaroqsiz token';
    err.code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token muddati tugagan';
    err.code = 'TOKEN_EXPIRED';
  }

  // Xatoni loglash (500 da to'liq stack, boshqalarda qisqa)
  if (err.statusCode >= 500) {
    logger.error('Server xatosi:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    });
  } else {
    logger.warn('Client xatosi:', {
      message: err.message,
      code: err.code,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    });
  }

  // Javob yuborish
  const response = {
    success: false,
    code: err.code,
    message: err.message,
  };

  // Development da stack trace ko'rsatish
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
}

module.exports = { AppError, notFoundHandler, errorHandler };
