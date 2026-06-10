/**
 * Running Session Controller
 * GPS sessiyalarni boshqarish uchun HTTP handler
 */

const runningService = require('../services/running.service');

/**
 * POST /api/v1/running/start
 * Yugurish sessiyasini boshlash
 */
async function startSession(req, res, next) {
  try {
    const { lat, lng } = req.body;
    const session = await runningService.startSession(req.user.id, { lat, lng });

    res.status(201).json({
      success: true,
      message: 'Yugurish boshlandi',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/running/points
 * GPS nuqtalarini yuborish (real-time)
 */
async function addGpsPoints(req, res, next) {
  try {
    const { sessionId, points } = req.body;
    const result = await runningService.addGpsPoints(req.user.id, sessionId, points);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/running/end
 * Yugurish sessiyasini tugatish
 */
async function endSession(req, res, next) {
  try {
    const { sessionId } = req.body;
    const result = await runningService.endSession(req.user.id, sessionId);

    res.json({
      success: true,
      message: 'Yugurish yakunlandi',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/running/history
 * Yugurish tarixi
 */
async function getHistory(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await runningService.getRunningHistory(req.user.id, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/running/active
 * Faol sessiyani olish
 */
async function getActiveSession(req, res, next) {
  try {
    const session = await runningService.getActiveSession(req.user.id);
    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
}

module.exports = { startSession, addGpsPoints, endSession, getHistory, getActiveSession };
