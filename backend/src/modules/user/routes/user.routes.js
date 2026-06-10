/**
 * User Routes - Profil va sozlamalar
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const { prisma } = require('../../../shared/config/database.config');
const { AppError } = require('../../../shared/middleware/error.middleware');

const router = express.Router();
router.use(authenticate);

// Multer - avatar upload konfiguratsiyasi
const upload = multer({
  dest: 'uploads/avatars/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);
    if (extName && mimeType) return cb(null, true);
    cb(new AppError('Faqat rasm fayl yuklash mumkin', 400, 'INVALID_FILE_TYPE'));
  },
});

// Profil ma'lumotlari
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { statistics: true },
    });
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser } });
  } catch (error) { next(error); }
});

// Boshqa foydalanuvchi profili
router.get('/:id/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        region: true, totalXp: true, level: true, createdAt: true,
        statistics: true,
      },
    });
    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, 'NOT_FOUND');
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

// Profil yangilash
router.patch('/profile', async (req, res, next) => {
  try {
    const { displayName, region } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, region },
      select: { id: true, username: true, displayName: true, avatarUrl: true, region: true },
    });
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

// Avatar yuklash
router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Fayl yuklanmadi', 400, 'NO_FILE');
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });
    res.json({ success: true, data: { avatarUrl } });
  } catch (error) { next(error); }
});

module.exports = router;
