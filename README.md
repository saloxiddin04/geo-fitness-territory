# 🗺️ Geo Fitness Territory Game

O'zbekiston xaritasida GPS orqali hududlarni egallab, raqiblarni mag'lub etadigan multiplayer strategik fitness o'yini.

## 📁 Loyiha Strukturasi

```
geo-fitness-territory/
├── mobile-app/          # React Native mobil ilova
├── admin-panel/         # ReactJS admin panel
├── backend/             # Node.js + Express.js backend
├── database/            # PostgreSQL migration va seed fayllari
├── docs/                # Dokumentatsiya
├── docker/              # Docker konfiguratsiyalari
├── scripts/             # Yordamchi skriptlar
└── README.md
```

## 🚀 Tezkor Ishga Tushirish

### Talablar

- Node.js 18+
- PostgreSQL 15+ (PostGIS extension bilan)
- Redis 7+
- Docker & Docker Compose (ixtiyoriy)

### 1. Docker orqali (tavsiya etiladi)

```bash
# Loyihani clone qilish
git clone <repo-url>
cd geo-fitness-territory

# Environment fayllarini sozlash
cp backend/.env.example backend/.env
cp admin-panel/.env.example admin-panel/.env
cp mobile-app/.env.example mobile-app/.env

# Docker yordamida ishga tushirish
docker-compose up -d
```

### 2. Qo'lda o'rnatish

#### Backend

```bash
cd backend
npm install

# Database migration
npx prisma migrate dev

# Database seed
npx prisma db seed

# Development server
npm run dev
```

#### Admin Panel

```bash
cd admin-panel
npm install
npm run dev
```

#### Mobile App

```bash
cd mobile-app
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## 🏗️ Arxitektura

### Backend Modullari

| Modul | Vazifa |
|-------|--------|
| Auth | JWT autentifikatsiya, token boshqaruvi |
| User | Foydalanuvchi profili va sozlamalari |
| Territory | H3 grid asosida hudud egallash tizimi |
| H3 Engine | Uber H3 geospatial hisob-kitoblar |
| Running Session | GPS tracking va sessiya boshqaruvi |
| Fitness | Statistika va tahlil |
| Notification | FCM/APNs push notifikatsiyalar |
| Leaderboard | Reyting va o'yinchi statistikasi |
| WebSocket | Real-time Socket.IO eventlar |
| Scheduler | Cron jobs (Night Event va boshqalar) |
| Admin | Admin panel API |

### Texnologiyalar

**Backend:** Node.js, Express.js, PostgreSQL, PostGIS, Prisma, Redis, Socket.IO, JWT

**Mobile:** React Native, Redux Toolkit, Mapbox, Firebase

**Admin:** ReactJS, TailwindCSS v4, Redux Toolkit, Socket.IO

## 🔐 Muhit O'zgaruvchilari

Backend `.env` fayli uchun asosiy o'zgaruvchilar:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/geo_fitness
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FCM_SERVER_KEY=your_firebase_server_key
```

## 📡 API Dokumentatsiya

Backend ishga tushgach: `http://localhost:3000/api-docs`

## 🐳 Docker Services

- **postgres**: PostgreSQL 15 + PostGIS
- **redis**: Redis 7
- **backend**: Node.js API server
- **admin**: Admin panel (Nginx)

## 📊 Database Schema

Asosiy jadvallar:
- `users` - Foydalanuvchilar
- `refresh_tokens` - JWT refresh tokenlar
- `running_sessions` - Yugurish sessiyalari
- `running_points` - GPS nuqtalar
- `territories` - Egallangan hududlar
- `user_explored_cells` - Kashf qilingan H3 celllar
- `notifications` - Notifikatsiyalar
- `user_statistics` - Foydalanuvchi statistikasi
- `leaderboard_cache` - Reyting cache
- `event_logs` - Tizim loglari
- `admin_users` - Admin foydalanuvchilar
- `system_settings` - Tizim sozlamalari

## 🎮 O'yin Mexanikasi

1. **Hudud Egallash**: H3 grid (taxminan 100m²) asosida hududlar
2. **Fog of War**: Hali bormagan joylar qorong'i ko'rinadi
3. **Territory Attack**: Raqib hududida yugurish = hujum
4. **Night Event**: 20:00-23:00 oralig'ida 1.5x bonus
5. **XP Tizimi**: Yangi hudud, yugurish, himoya uchun XP

## 🛡️ Xavfsizlik

- GPS spoofing aniqlash
- Tezlik tekshiruvi (maks 50 km/h)
- JWT token rotation
- Rate limiting
- Input validation (Joi)

## 👨‍💻 Ishlab Chiquvchi

Professional darajadagi arxitektura bilan ishlab chiqilgan.
