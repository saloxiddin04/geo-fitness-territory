const express = require('express');
const ctrl = require('../controllers/territory.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/nearby', ctrl.getTerritoriesInRadius);
router.get('/explored', ctrl.getMyExploredCells);

module.exports = router;
