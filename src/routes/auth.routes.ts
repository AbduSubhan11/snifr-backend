import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  me,
  refresh,
  forgotPassword,
  verifyOTP,
  resetPassword,
  updateProfile,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Validation Rules
const registerRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]{8,20}$/)
    .withMessage('Invalid phone format (e.g., +1234567890)'),
];

const loginRules = [
  body('email').notEmpty(),
  body('password').notEmpty(),
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email required'),
];

const verifyOTPRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const resetPasswordRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const refreshRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// Routes
router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOTPRules, validate, verifyOTP);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);
router.post('/refresh', refreshRules, validate, refresh);

router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);

export default router;
