// Leaderboard Controller
const leaderboardService = require('../services/leaderboard.service');

async function getGlobal(req, res, next) {
  try {
    const { category = 'territory', limit = 50 } = req.query;
    const data = await leaderboardService.getGlobalLeaderboard(category, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

async function getRegional(req, res, next) {
  try {
    const { region } = req.params;
    const { category = 'territory', limit = 50 } = req.query;
    const data = await leaderboardService.getRegionalLeaderboard(region, category, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

async function getMyRank(req, res, next) {
  try {
    const { category = 'xp' } = req.query;
    const data = await leaderboardService.getUserRank(req.user.id, category);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

module.exports = { getGlobal, getRegional, getMyRank };
