const express = require('express');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const { prisma } = require('../../../shared/config/database.config');

const router = express.Router();
router.use(authenticate);

// Notifikatsiyalar ro'yxati
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
    ]);

    res.json({ success: true, data: { notifications, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

// O'qildi deb belgilash
router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Barchasini o'qildi deb belgilash
router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// O'qilmagan sonini olish
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
});

module.exports = router;
