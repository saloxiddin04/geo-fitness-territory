const express = require('express');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const fitnessService = require('../services/fitness.service');

const router = express.Router();
router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const data = await fitnessService.getUserStatistics(req.user.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

module.exports = router;
