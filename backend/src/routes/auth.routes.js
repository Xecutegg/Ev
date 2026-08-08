import { Router } from 'express';
import {
    register,
    verifyOtp,
    login,
    refreshToken,
    logout,
    resendOtp,
    getMe,
} from '../controllers/auth.controller.js';
import { authenticate, requireVerified } from '../middlewares/auth.middleware.js';
import { validateRegister, validateLogin, validateOtp, validateResendOtp } from '../middlewares/validate.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Public routes (rate limited)
router.post('/register', authLimiter, validateRegister, register);
router.post('/verify-otp', authLimiter, validateOtp, verifyOtp);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/resend-otp', otpLimiter, validateResendOtp, resendOtp);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, requireVerified, getMe);

export default router;
