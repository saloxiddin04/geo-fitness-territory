-- Migration: 001_init_postgis_and_users
-- Tavsif: PostGIS extension va asosiy jadvallarni yaratish

-- PostGIS kengaytmasini yoqish
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  region        VARCHAR(50),
  level         INTEGER      NOT NULL DEFAULT 1,
  xp            INTEGER      NOT NULL DEFAULT 0,
  total_distance BIGINT      NOT NULL DEFAULT 0,  -- metr
  total_sessions INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  is_blocked    BOOLEAN      NOT NULL DEFAULT FALSE,
  fcm_token     TEXT,
  last_active_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_region   ON users(region);
CREATE INDEX IF NOT EXISTS idx_users_level    ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_xp       ON users(xp DESC);

-- ============================================================
-- ADMIN_USERS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'admin'
                             CHECK (role IN ('admin', 'super_admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFRESH_TOKENS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT         NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  is_revoked BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================
-- TERRITORIES jadvali (PostGIS geography)
-- ============================================================
CREATE TABLE IF NOT EXISTS territories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  h3_index          VARCHAR(20)  NOT NULL UNIQUE,
  owner_id          UUID         REFERENCES users(id) ON DELETE SET NULL,
  region            VARCHAR(50),

  -- PostGIS geografia: hududning markaz nuqtasi
  center_point      GEOGRAPHY(POINT, 4326),

  defense_level     SMALLINT     NOT NULL DEFAULT 0,
  control_points    INTEGER      NOT NULL DEFAULT 100,
  attack_count      INTEGER      NOT NULL DEFAULT 0,
  successful_defenses INTEGER    NOT NULL DEFAULT 0,

  captured_at       TIMESTAMPTZ,
  last_attacked_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_territories_h3     ON territories(h3_index);
CREATE INDEX IF NOT EXISTS idx_territories_owner  ON territories(owner_id);
CREATE INDEX IF NOT EXISTS idx_territories_region ON territories(region);
-- Geospatial index
CREATE INDEX IF NOT EXISTS idx_territories_center ON territories USING GIST(center_point);

-- ============================================================
-- RUNNING_SESSIONS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS running_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'completed', 'cancelled')),

  distance_meters     INTEGER      NOT NULL DEFAULT 0,
  duration_seconds    INTEGER      NOT NULL DEFAULT 0,
  avg_speed_kmh       DECIMAL(5,2) DEFAULT 0,
  max_speed_kmh       DECIMAL(5,2) DEFAULT 0,
  calories            INTEGER      DEFAULT 0,
  xp_earned           INTEGER      NOT NULL DEFAULT 0,
  territories_captured INTEGER     NOT NULL DEFAULT 0,

  -- GPS trayektoriya (PostGIS LineString)
  route               GEOGRAPHY(LINESTRING, 4326),

  is_suspicious       BOOLEAN      NOT NULL DEFAULT FALSE,
  suspicious_reason   TEXT,

  gps_points_count    INTEGER      NOT NULL DEFAULT 0,
  start_time          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  end_time            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_sessions_user       ON running_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON running_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_suspicious ON running_sessions(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON running_sessions(start_time DESC);
-- Geospatial index
CREATE INDEX IF NOT EXISTS idx_sessions_route      ON running_sessions USING GIST(route);

-- ============================================================
-- GPS_POINTS jadvali (sessiya nuqtalari)
-- ============================================================
CREATE TABLE IF NOT EXISTS gps_points (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID         NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy     DECIMAL(6,2),
  speed_kmh    DECIMAL(5,2),
  altitude     DECIMAL(8,2),
  recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_points_session  ON gps_points(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_points_location ON gps_points USING GIST(location);

-- ============================================================
-- EXPLORED_CELLS jadvali (fog-of-war)
-- ============================================================
CREATE TABLE IF NOT EXISTS explored_cells (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  h3_index    VARCHAR(20) NOT NULL,
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, h3_index)
);

CREATE INDEX IF NOT EXISTS idx_explored_cells_user ON explored_cells(user_id);
CREATE INDEX IF NOT EXISTS idx_explored_cells_h3   ON explored_cells(h3_index);

-- ============================================================
-- NOTIFICATIONS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
  type         VARCHAR(50) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT         NOT NULL,
  data         JSONB        DEFAULT '{}',
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_broadcast BOOLEAN      NOT NULL DEFAULT FALSE,
  status       VARCHAR(20)  NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('pending', 'sent', 'failed')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type     ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications(created_at DESC);

-- ============================================================
-- LEADERBOARD_SNAPSHOTS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   VARCHAR(20)  NOT NULL CHECK (category IN ('territories', 'distance', 'explored', 'xp')),
  value      BIGINT       NOT NULL DEFAULT 0,
  rank       INTEGER,
  region     VARCHAR(50),
  period     VARCHAR(20)  NOT NULL DEFAULT 'weekly',  -- weekly | monthly | alltime
  week_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, period, week_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard_snapshots(category, value DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user     ON leaderboard_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_region   ON leaderboard_snapshots(region, category);

-- ============================================================
-- SYSTEM_SETTINGS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT         NOT NULL,
  description TEXT,
  updated_by  UUID         REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NIGHT_EVENTS jadvali
-- ============================================================
CREATE TABLE IF NOT EXISTS night_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  xp_multiplier   DECIMAL(4,2) NOT NULL DEFAULT 2.0,
  region          VARCHAR(50),              -- NULL = barcha viloyatlar
  is_manual       BOOLEAN      NOT NULL DEFAULT FALSE,
  started_by      UUID         REFERENCES admin_users(id) ON DELETE SET NULL,
  start_time      TIMESTAMPTZ  NOT NULL,
  end_time        TIMESTAMPTZ  NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_night_events_active ON night_events(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_night_events_time   ON night_events(start_time, end_time);

-- ============================================================
-- Updated_at avtomatik yangilash uchun trigger funksiya
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggerni qo'llash
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON running_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
