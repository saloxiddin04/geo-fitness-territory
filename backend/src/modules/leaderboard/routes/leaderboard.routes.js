const express = require('express');
const ctrl = require('../controllers/leaderboard.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/global', ctrl.getGlobal);
router.get('/regional/:region', ctrl.getRegional);
router.get('/my-rank', ctrl.getMyRank);

module.exports = router;
