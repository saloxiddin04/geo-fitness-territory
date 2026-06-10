// Territory Controller
const territoryService = require('../services/territory.service');

async function getTerritoriesInRadius(req, res, next) {
  try {
    const { lat, lng, radius = 5 } = req.query;
    const territories = await territoryService.getTerritoriesInRadius(
      parseFloat(lat), parseFloat(lng), parseFloat(radius), req.user.id
    );
    res.json({ success: true, data: { territories } });
  } catch (error) { next(error); }
}

async function getMyExploredCells(req, res, next) {
  try {
    const cells = await territoryService.getUserExploredCells(req.user.id);
    res.json({ success: true, data: { cells } });
  } catch (error) { next(error); }
}

module.exports = { getTerritoriesInRadius, getMyExploredCells };
