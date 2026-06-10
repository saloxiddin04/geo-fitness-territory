-- Migration: 002_indexes_and_views
-- Tavsif: Qo'shimcha indekslar, ko'rinishlar va funksiyalar

-- ============================================================
-- H3 hududlari uchun qo'shimcha indeks
-- ============================================================

-- Composite indeks: owner + h3 (tez qidirish)
CREATE INDEX IF NOT EXISTS idx_territories_owner_h3
  ON territories(owner_id, h3_index)
  WHERE owner_id IS NOT NULL;

-- Composite indeks: region + defense_level
CREATE INDEX IF NOT EXISTS idx_territories_region_defense
  ON territories(region, defense_level);

-- Egasiz hududlar (partial index)
CREATE INDEX IF NOT EXISTS idx_territories_uncaptured
  ON territories(h3_index)
  WHERE owner_id IS NULL;

-- ============================================================
-- Sessiya qo'shimcha indekslar
-- ============================================================

-- Foydalanuvchi + sana (profil statistikasi uchun)
CREATE INDEX IF NOT EXISTS idx_sessions_user_date
  ON running_sessions(user_id, start_time DESC)
  WHERE status = 'completed';

-- Masofa bo'yicha (leaderboard)
CREATE INDEX IF NOT EXISTS idx_sessions_distance
  ON running_sessions(distance_meters DESC)
  WHERE status = 'completed';

-- ============================================================
-- VIEW: foydalanuvchi umumiy statistikasi
-- ============================================================
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.region,
  u.level,
  u.xp,
  u.total_distance,
  u.total_sessions,
  -- Hozirgi hududlar soni
  COUNT(DISTINCT t.id)                        AS current_territories,
  -- Kashf etilgan hujayralar soni
  COUNT(DISTINCT ec.h3_index)                 AS explored_cells,
  -- O'rtacha sessiya masofasi
  COALESCE(AVG(rs.distance_meters), 0)::INT   AS avg_session_distance,
  -- Oxirgi sessiya
  MAX(rs.start_time)                          AS last_session_at
FROM users u
LEFT JOIN territories t    ON t.owner_id = u.id
LEFT JOIN explored_cells ec ON ec.user_id = u.id
LEFT JOIN running_sessions rs ON rs.user_id = u.id AND rs.status = 'completed'
GROUP BY u.id, u.username, u.display_name, u.region, u.level, u.xp,
         u.total_distance, u.total_sessions;

-- ============================================================
-- VIEW: admin dashboard statistikasi
-- ============================================================
CREATE OR REPLACE VIEW v_admin_dashboard AS
SELECT
  -- Foydalanuvchilar
  (SELECT COUNT(*) FROM users WHERE is_active = TRUE)::INT                          AS total_users,
  (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours')::INT AS new_users_today,
  (SELECT COUNT(*) FROM users WHERE last_active_at >= NOW() - INTERVAL '15 minutes')::INT AS active_now,

  -- Hududlar
  (SELECT COUNT(*) FROM territories)::INT                                           AS total_territories,
  (SELECT COUNT(*) FROM territories WHERE owner_id IS NOT NULL)::INT                AS captured_territories,
  (SELECT COUNT(*) FROM territories WHERE captured_at >= NOW() - INTERVAL '24 hours')::INT AS captured_today,

  -- Sessiyalar
  (SELECT COUNT(*) FROM running_sessions WHERE status = 'completed')::INT           AS total_sessions,
  (SELECT COUNT(*) FROM running_sessions WHERE start_time >= NOW() - INTERVAL '24 hours')::INT AS sessions_today,
  (SELECT COUNT(*) FROM running_sessions WHERE status = 'active')::INT              AS active_sessions,
  (SELECT COUNT(*) FROM running_sessions WHERE is_suspicious = TRUE)::INT           AS suspicious_sessions,

  -- Masofa (km)
  (SELECT COALESCE(SUM(distance_meters), 0) / 1000 FROM running_sessions WHERE status = 'completed')::BIGINT AS total_distance_km,

  -- Night event
  (SELECT EXISTS(SELECT 1 FROM night_events WHERE is_active = TRUE))               AS night_event_active;

-- ============================================================
-- VIEW: leaderboard uchun joriy reyting
-- ============================================================
CREATE OR REPLACE VIEW v_current_leaderboard AS
SELECT
  u.id        AS user_id,
  u.username,
  u.display_name,
  u.region,
  u.level,

  -- Hududlar soni
  COUNT(DISTINCT t.id)::INT                                   AS territories_count,

  -- Jami masofa (m)
  COALESCE(u.total_distance, 0)::BIGINT                       AS total_distance,

  -- Kashf etilgan hujayralar
  COUNT(DISTINCT ec.h3_index)::INT                            AS explored_count,

  -- Jami XP
  u.xp::INT                                                   AS total_xp

FROM users u
LEFT JOIN territories t     ON t.owner_id = u.id
LEFT JOIN explored_cells ec ON ec.user_id = u.id
WHERE u.is_active = TRUE AND u.is_blocked = FALSE
GROUP BY u.id, u.username, u.display_name, u.region, u.level, u.total_distance, u.xp;

-- ============================================================
-- FUNKSIYA: foydalanuvchi XP ni yangilash va level hisoblash
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_level(xp_points INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level_num INTEGER := 1;
  xp_required INTEGER;
BEGIN
  -- Level formulasi: har level uchun 200 * level^1.5 XP
  LOOP
    xp_required := (200 * POWER(level_num, 1.5))::INTEGER;
    EXIT WHEN xp_points < xp_required;
    level_num := level_num + 1;
    EXIT WHEN level_num >= 100;  -- Max level
  END LOOP;
  RETURN level_num;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNKSIYA: h3 index bo'yicha qo'shni hududlarni topish
-- Eslatma: bu funksiya H3 library bo'lmaganda fallback
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_territories(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_m INTEGER DEFAULT 1000
)
RETURNS TABLE(
  id UUID,
  h3_index VARCHAR,
  owner_id UUID,
  distance_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.h3_index,
    t.owner_id,
    ST_Distance(
      t.center_point::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_m
  FROM territories t
  WHERE ST_DWithin(
    t.center_point::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_m
  )
  ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SYSTEM_SETTINGS default qiymatlar
-- ============================================================
INSERT INTO system_settings (key, value, description) VALUES
  ('BASE_CAPTURE_XP',         '50',   'Hudud egallaganda beriladigan XP'),
  ('BASE_EXPLORE_XP',         '10',   'Yangi hudud kashf etganda XP'),
  ('ATTACK_COST_XP',          '20',   'Hujum qilish uchun sarflanadigan XP'),
  ('MAX_TERRITORY_DEFENSE',   '10',   'Hududning maksimal himoya darajasi'),
  ('TERRITORY_EXPIRE_HOURS',  '168',  'Faolsiz hudud necha soatdan keyin o\'chadi (168 = 1 hafta)'),
  ('NIGHT_EVENT_XP_MULTIPLIER','2.0', 'Night Event paytida XP multiplikatori'),
  ('STREAK_BONUS_MULTIPLIER', '1.5',  'Ketma-ket yugurish bonusi'),
  ('FIRST_CAPTURE_BONUS',     '100',  'Hududni birinchi marta egallaganda bonus XP'),
  ('MIN_GPS_ACCURACY',        '30',   'Minimal qabul qilinadigan GPS aniqligi (metr)'),
  ('MAX_SPEED_KMH',           '35',   'Bu tezlikdan yuqori bo\'lsa shubhali belgilanadi'),
  ('MIN_SESSION_DISTANCE',    '100',  'Saqlanadigan minimal sessiya masofasi (metr)'),
  ('GPS_UPDATE_INTERVAL_SEC', '5',    'GPS koordinata yangilanish oralig\'i'),
  ('LEADERBOARD_CACHE_TTL',   '300',  'Leaderboard cache muddati (sekund)'),
  ('WEEKLY_RESET_DAY',        '1',    'Haftalik reyting reset kuni (0=Yakshanba, 1=Dushanba)')
ON CONFLICT (key) DO NOTHING;
