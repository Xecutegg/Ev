import { verifyAccessToken } from '../services/token.service.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Authentication middleware
 * Checks for JWT in Authorization header OR valid session
 * Attaches user info to req.user
 */
const authenticate = asyncHandler(async (req, res, next) => {
    let userId = null;

    // Strategy 1: Check JWT Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = verifyAccessToken(token);
            userId = decoded.userId;
        } catch (error) {
            // Token expired or invalid — fall through to session check
        }
    }

    // Strategy 2: Check session (fallback)
    if (!userId && req.session?.isAuthenticated && req.session?.userId) {
        userId = req.session.userId;
    }

    // No valid auth found
    if (!userId) {
        throw ApiError.unauthorized('Authentication required. Please login.');
    }

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
        throw ApiError.unauthorized('User not found. Please login again.');
    }

    // Attach user to request
    req.user = user;
    next();
});

/**
 * Require user to be email-verified
 * Must be used AFTER authenticate middleware
 */
const requireVerified = asyncHandler(async (req, res, next) => {
    if (!req.user.isVerified) {
        throw ApiError.forbidden('Email not verified. Please verify your email first.');
    }
    next();
});

export { authenticate, requireVerified };
