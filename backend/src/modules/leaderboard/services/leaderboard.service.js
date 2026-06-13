/**
 * Leaderboard Service
 * Global va viloyatlar bo'yicha reyting
 * Redis orqali cache bilan optimallashtirilgan
 */

const { prisma } = require('../../../shared/config/database.config');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../../../shared/config/redis.config');
const logger = require('../../../shared/utils/logger');

/**
 * Global leaderboard olish
 * @param {string} category - Kategoriya: territory | distance | explored | xp
 * @param {number} limit - Nechta o'rinchi
 */
async function getGlobalLeaderboard(category, limit = 50) {
  const cacheKey = `leaderboard:global:${category}:${limit}`;
  
  // Cache tekshirish
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    logger.warn('Leaderboard cache olishda xato:', error.message);
  }

  const leaders = await fetchLeaderboard(category, null, limit);

  // Cache saqlash
  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, REDIS_TTL.LEADERBOARD, JSON.stringify(leaders));
  } catch {}

  return leaders;
}

/**
 * Viloyat bo'yicha leaderboard
 * @param {string} region - Viloyat nomi
 * @param {string} category - Kategoriya
 * @param {number} limit - Hajm
 */
async function getRegionalLeaderboard(region, category, limit = 50) {
  const cacheKey = REDIS_KEYS.LEADERBOARD_REGIONAL(region, category);
  
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const leaders = await fetchLeaderboard(category, region, limit);

  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, REDIS_TTL.LEADERBOARD, JSON.stringify(leaders));
  } catch {}

  return leaders;
}

/**
 * Foydalanuvchining reytingdagi o'rnini olish
 */
async function getUserRank(userId, category) {
  const query = getRankQuery(category);
  
  const result = await prisma.$queryRawUnsafe(`
    WITH ranked AS (
      ${query}
    )
    SELECT rank, score FROM ranked WHERE id = $1::uuid
  `, userId);

  return result[0] || { rank: null, score: 0 };
}

// ============================================================
// PRIVATE HELPER FUNKSIYALAR
// ============================================================

/**
 * Leaderboard so'rovi
 */
async function fetchLeaderboard(category, region, limit) {
  const query = getLeaderboardQuery(category, region, limit);
  
  const leaders = await prisma.$queryRawUnsafe(query, ...(region ? [region] : []));

  return leaders.map((leader, index) => ({
    rank: index + 1,
    userId: leader.id,
    username: leader.username,
    displayName: leader.display_name,
    avatarUrl: leader.avatar_url,
    region: leader.region,
    score: parseFloat(leader.score || 0),
    level: leader.level || 1,
  }));
}

/**
 * Kategoriya bo'yicha SQL so'rovini qaytarish
 */
function getLeaderboardQuery(category, region, limit) {
  const regionFilter = region ? `AND u.region = '${region}'` : '';

  const queries = {
    territory: `
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region, u.level,
             COUNT(t.id) as score
      FROM users u
      LEFT JOIN territories t ON t.owner_id = u.id
      WHERE u.is_active = true AND u.is_blocked = false ${regionFilter}
      GROUP BY u.id
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    distance: `
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region, u.level,
             COALESCE(us.total_distance_meters, 0) as score
      FROM users u
      LEFT JOIN user_statistics us ON us.user_id = u.id
      WHERE u.is_active = true AND u.is_blocked = false ${regionFilter}
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    explored: `
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region, u.level,
             COALESCE(us.total_explored_cells, 0) as score
      FROM users u
      LEFT JOIN user_statistics us ON us.user_id = u.id
      WHERE u.is_active = true AND u.is_blocked = false ${regionFilter}
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    xp: `
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.region, u.level,
             u.total_xp as score
      FROM users u
      WHERE u.is_active = true AND u.is_blocked = false ${regionFilter}
      ORDER BY score DESC
      LIMIT ${limit}
    `,
  };

  return queries[category] || queries.territory;
}

/**
 * Rank SQL so'rovi
 */
function getRankQuery(category) {
  const queries = {
    territory: `
      SELECT u.id, COUNT(t.id)::float as score,
             ROW_NUMBER() OVER (ORDER BY COUNT(t.id) DESC) as rank
      FROM users u
      LEFT JOIN territories t ON t.owner_id = u.id
      WHERE u.is_active = true
      GROUP BY u.id
    `,
    distance: `
      SELECT u.id, COALESCE(us.total_distance_meters, 0) as score,
             ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_distance_meters, 0) DESC) as rank
      FROM users u
      LEFT JOIN user_statistics us ON us.user_id = u.id
      WHERE u.is_active = true
    `,
    xp: `
      SELECT u.id, u.total_xp::float as score,
             ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) as rank
      FROM users u
      WHERE u.is_active = true
    `,
  };

  return queries[category] || queries.xp;
}

module.exports = { getGlobalLeaderboard, getRegionalLeaderboard, getUserRank };
