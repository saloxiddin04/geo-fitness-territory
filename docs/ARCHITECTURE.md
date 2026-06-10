# Geo Fitness Territory — Arxitektura

## Umumiy Ko'rinish

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│                                                                  │
│  ┌─────────────────┐          ┌──────────────────────────────┐  │
│  │  Mobile App      │          │      Admin Panel              │  │
│  │  React Native    │          │      ReactJS + TailwindCSS    │  │
│  │  Redux + Mapbox  │          │      Redux + Recharts         │  │
│  └────────┬────────┘          └──────────────┬───────────────┘  │
└───────────┼──────────────────────────────────┼──────────────────┘
            │ REST API + WebSocket             │ REST API + WebSocket
            ▼                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js / Express)                    │
│                                                                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │  /auth   │  │ /territory│  │/sessions │  │    /admin        │  │
│  │  JWT     │  │  H3Engine │  │  GPS     │  │   Full CRUD      │  │
│  └──────────┘  └───────────┘  └──────────┘  └─────────────────┘  │
│                                                                    │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Socket.IO   │  │  Scheduler  │  │     Firebase Admin       │  │
│  │  Real-time   │  │  Cron Jobs  │  │     Push Notifications   │  │
│  └──────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Prisma ORM                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│   PostgreSQL + PostGIS   │    │           Redis                  │
│   - Users                │    │   - JWT blacklist               │
│   - Territories          │    │   - Leaderboard cache           │
│   - Sessions             │    │   - Session rate limiting       │
│   - GPS Points           │    │   - Night event state           │
│   - Notifications        │    │   - Socket rooms                │
│   - Leaderboard          │    └─────────────────────────────────┘
└──────────────────────────┘
```

## Modul Arxitekturasi

### Backend Modullar

```
src/
├── server.js                 # Entry point
├── app.js                    # Express app
│
├── shared/
│   ├── config/
│   │   ├── database.config.js  # Prisma singleton
│   │   ├── redis.config.js     # ioredis + REDIS_KEYS
│   │   └── swagger.config.js   # OpenAPI
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT verification
│   │   └── error.middleware.js # Global error handler
│   └── utils/
│       └── logger.js           # Winston logger
│
└── modules/
    ├── auth/           # Registration, login, tokens
    ├── h3Engine/       # H3 geospatial calculations
    ├── territory/      # Capture, attack, fog-of-war
    ├── runningSession/ # GPS session lifecycle
    ├── notification/   # FCM push notifications
    ├── webSocket/      # Socket.IO real-time
    ├── scheduler/      # Cron jobs
    ├── leaderboard/    # Rankings
    ├── fitness/        # User statistics
    ├── user/           # Profile management
    └── admin/          # Admin API
```

### H3 Grid Tizimi

Ilovada Uber H3 geospatial indexing tizimi ishlatiladi:

- **Resolution: 9** — har bir hexagon ≈ 0.1 km²
- Foydalanuvchi yugurgan yo'lida ketma-ket H3 hujayralari hisoblanadi
- Yangi hujayralar "explored" (kashf etilgan) deb belgilanadi
- Capture uchun foydalanuvchi hujayraning ichida bo'lishi kerak

```javascript
// H3 index hisoblash
const h3Index = h3.latLngToCell(lat, lng, H3_RESOLUTION);

// Qo'shni hujayralar (k=1 → 7 ta hexagon)
const neighbors = h3.gridDisk(h3Index, 1);

// Hujayradan GeoJSON boundary
const boundary = h3.cellToBoundary(h3Index);
```

### Real-time Arxitektura

Socket.IO orqali real-time yangilanishlar:

```
Foydalanuvchi capture qildi
    │
    ▼
Backend: territory.service.processCapture()
    │
    ├─► PostgreSQL: territories yangilash
    ├─► Redis: leaderboard cache invalidate
    └─► Socket.IO emit:
            ├─► user:{userId} — "territory_captured" (XP update)
            ├─► territory:{h3} — "territory_changed" (old owner notification)
            └─► broadcast — "leaderboard_update" (global ranking)
```

### Cheat Detection

Shubhali faoliyatni aniqlash algoritmi:

```javascript
// 1. Tezlik tekshiruvi
if (speedKmh > MAX_SPEED_KMH) markSuspicious('speed_too_high');

// 2. GPS sakrash tekshiruvi
if (jumpDistanceMeters > 500) markSuspicious('gps_jump_detected');

// 3. Akkumulyatsiya tekshiruvi
if (capturedInMinute > MAX_CAPTURES_PER_MINUTE) markSuspicious('capture_flood');

// 4. GPS aniqligi tekshiruvi
if (accuracy > MIN_GPS_ACCURACY) warnUser('low_gps_accuracy');
```

## Ma'lumotlar Oqimi

### Yugurish Sessiyasi Oqimi

```
Mobile App                          Backend                     DB/Redis
    │                                   │                           │
    ├─── POST /sessions/start ──────────►│                           │
    │                                   ├── Create session ─────────►│
    │◄── { sessionId, status: active } ─┤                           │
    │                                   │                           │
    ├─── POST /sessions/:id/points ─────►│ (har 5 soniyada)          │
    │    { gpsPoints: [...] }           ├── Cheat detection         │
    │                                   ├── Save GPS points ────────►│
    │◄── { newCells, captured } ────────┤                           │
    │                                   │                           │
    ├─── POST /sessions/:id/end ────────►│                           │
    │                                   ├── Calculate stats         │
    │                                   ├── Award XP ───────────────►│
    │◄── { xpEarned, stats, level } ────┤                           │
    │                                   │◄── Invalidate cache ──────┤
    │                                   ├── Socket emit ────────────►│ (Socket)
```

## Deployment

### Docker Compose xizmatlar

| Xizmat    | Port    | Image                    |
|-----------|---------|--------------------------|
| postgres  | 5432    | postgis/postgis:15-3.3   |
| redis     | 6379    | redis:7-alpine           |
| backend   | 3000    | node:20-alpine (custom)  |
| admin     | 5173    | node:20-alpine (custom)  |

### Environment Variables

Backend `.env` fayli asosiy sozlamalar:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Token imzolash kaliti
- `FIREBASE_SERVICE_ACCOUNT` — FCM uchun Firebase credentials
- `H3_RESOLUTION` — Hexagon o'lchami (default: 9)

## Xavfsizlik

- **JWT** access (15 daqiqa) + refresh (30 kun) token juftligi
- **bcrypt** `cost=12` parol xeshlash
- **Rate limiting**: 100 req/min (global), 5 req/min (auth)
- **CORS**: faqat ruxsat etilgan originlar
- **Helmet**: HTTP xavfsizlik headerlari
- **Input validation**: express-validator barcha endpointlarda
- **SQL injection**: Prisma ORM parametrlangan so'rovlar
- **Cheat detection**: GPS tezlik, sakrash, flood tekshiruvi
