import rateLimit from 'express-rate-limit';

/**
 * General auth rate limiter
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * OTP-specific rate limiter
 * 3 OTP requests per 10 minutes per IP
 */
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many OTP requests. Please try again after 10 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export { authLimiter, otpLimiter };
