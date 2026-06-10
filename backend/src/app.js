/**
 * Express ilovasi konfiguratsiyasi
 * Barcha middleware va routelar shu yerda ro'yxatga olinadi
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const { swaggerSpec } = require('./shared/config/swagger.config');
const { errorHandler, notFoundHandler } = require('./shared/middleware/error.middleware');
const logger = require('./shared/utils/logger');
const morganStream = require('./shared/utils/morganStream');

// Route importlar
const authRoutes = require('./modules/auth/routes/auth.routes');
const userRoutes = require('./modules/user/routes/user.routes');
const territoryRoutes = require('./modules/territory/routes/territory.routes');
const runningRoutes = require('./modules/runningSession/routes/running.routes');
const fitnessRoutes = require('./modules/fitness/routes/fitness.routes');
const notificationRoutes = require('./modules/notification/routes/notification.routes');
const leaderboardRoutes = require('./modules/leaderboard/routes/leaderboard.routes');
const adminRoutes = require('./modules/admin/routes/admin.routes');

const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

// Xavfsizlik headerlari
app.use(helmet());

// CORS konfiguratsiyasi
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    process.env.MOBILE_APP_URL || 'exp://localhost:8081',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// JSON va URL-encoded body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gzip kompressiya
app.use(compression());

// HTTP so'rovlarni loglash
app.use(morgan('combined', { stream: morganStream }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p so\'rov. Bir oz kuting.' },
});
app.use('/api/', globalLimiter);

// Static fayllar (avatar va boshqalar)
app.use('/uploads', express.static('uploads'));

// ============================================================
// ROUTES
// ============================================================

const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/territories`, territoryRoutes);
app.use(`${API_PREFIX}/running`, runningRoutes);
app.use(`${API_PREFIX}/fitness`, fitnessRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Swagger API dokumentatsiya
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
