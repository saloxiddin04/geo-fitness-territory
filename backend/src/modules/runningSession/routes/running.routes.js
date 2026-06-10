const express = require('express');
const runningController = require('../controllers/running.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();

// Barcha running routelar autentifikatsiya talab qiladi
router.use(authenticate);

router.post('/start', runningController.startSession);
router.post('/points', runningController.addGpsPoints);
router.post('/end', runningController.endSession);
router.get('/history', runningController.getHistory);
router.get('/active', runningController.getActiveSession);

module.exports = router;
