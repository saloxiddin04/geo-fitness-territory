/**
 * Auth Validators - Joi asosida input tekshiruvi
 */

const Joi = require('joi');
const { AppError } = require('../../../shared/middleware/error.middleware');

// O'zbekiston viloyatlari
const UZBEKISTAN_REGIONS = [
  'toshkent_shahar', 'toshkent_viloyat', 'andijon', 'fargona', 'namangan',
  'samarqand', 'buxoro', 'qashqadaryo', 'surxondaryo', 'jizzax',
  'sirdaryo', 'navoiy', 'xorazm', 'qoraqalpogiston',
];

// Register schema
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Username faqat harf va raqamlardan iborat bo\'lishi kerak',
      'string.min': 'Username kamida 3 ta belgi bo\'lishi kerak',
      'string.max': 'Username maksimal 50 ta belgi bo\'lishi kerak',
      'any.required': 'Username majburiy',
    }),
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'To\'g\'ri email manzil kiriting',
      'any.required': 'Email majburiy',
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Parol kamida 8 ta belgi bo\'lishi kerak',
      'string.pattern.base': 'Parol katta harf, kichik harf va raqam o\'z ichiga olishi kerak',
      'any.required': 'Parol majburiy',
    }),
  displayName: Joi.string().min(2).max(100).optional(),
  region: Joi.string().valid(...UZBEKISTAN_REGIONS).optional(),
  devicePlatform: Joi.string().valid('ios', 'android').optional(),
  fcmToken: Joi.string().max(500).optional(),
  apnsToken: Joi.string().max(500).optional(),
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  fcmToken: Joi.string().max(500).optional().allow(null, ''),
  apnsToken: Joi.string().max(500).optional().allow(null, ''),
});

// Refresh token schema
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token majburiy',
  }),
});

/**
 * Joi schemasi asosida validatsiya middleware yaratuvchi helper
 */
function createValidator(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Barcha xatolarni birdan ko'rsatish
      stripUnknown: true, // Noma'lum maydonlarni olib tashlash
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return next(new AppError(messages, 400, 'VALIDATION_ERROR'));
    }

    req.body = value;
    next();
  };
}

const validateRegister = createValidator(registerSchema);
const validateLogin = createValidator(loginSchema);
const validateRefreshToken = createValidator(refreshTokenSchema);

module.exports = { validateRegister, validateLogin, validateRefreshToken };
