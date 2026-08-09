import Session from '../models/Session.js';
import Config from '../config/config.js';

/**
 * Session management service combining Redis (express-session) & MongoDB Session model
 */

/**
 * Create a session for the authenticated user (stores in both Redis & MongoDB)
 */
const createSession = async (req, userId, userData = {}) => {
    // 1. Set express-session (stored in Redis)
    req.session.userId = userId;
    req.session.user = userData;
    req.session.isAuthenticated = true;
    req.session.createdAt = Date.now();

    await new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) return reject(err);
            resolve(req.session);
        });
    });

    // 2. Store session record in MongoDB
    const expiresAt = new Date(
        Date.now() + Config.SESSION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const ipAddress =
        req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const mongoSession = await Session.findOneAndUpdate(
        { sessionId: req.sessionID },
        {
            userId,
            sessionId: req.sessionID,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent,
            expiresAt,
            isValid: true,
            lastActiveAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
        expressSession: req.session,
        mongoSession,
    };
};

/**
 * Destroy the current session (from Redis & mark invalid in MongoDB)
 */
const destroySession = async (req) => {
    const sessionId = req.sessionID;

    // 1. Invalidate session in MongoDB
    if (sessionId) {
        await Session.updateOne(
            { sessionId },
            { isValid: false, lastActiveAt: new Date() }
        );
    }

    // 2. Destroy express-session in Redis
    return new Promise((resolve, reject) => {
        req.session.destroy((err) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

/**
 * Get session data for the current request
 */
const getSession = (req) => {
    return {
        userId: req.session?.userId || null,
        user: req.session?.user || null,
        isAuthenticated: req.session?.isAuthenticated || false,
    };
};

/**
 * Get all active MongoDB sessions for a user
 */
const getUserSessions = async (userId) => {
    return Session.find({ userId, isValid: true }).sort({ createdAt: -1 });
};

/**
 * Revoke a specific session by ID in MongoDB
 */
const revokeSession = async (sessionId) => {
    return Session.updateOne({ sessionId }, { isValid: false });
};

/**
 * Revoke all active sessions for a user in MongoDB
 */
const revokeAllUserSessions = async (userId) => {
    return Session.updateMany({ userId, isValid: true }, { isValid: false });
};

export {
    createSession,
    destroySession,
    getSession,
    getUserSessions,
    revokeSession,
    revokeAllUserSessions,
};
