import jwt from 'jsonwebtoken';
import Config from '../config/config.js';

/**
 * Generate a short-lived access token (15m default)
 */
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId },
        Config.JWT_ACCESS_SECRET,
        { expiresIn: Config.JWT_ACCESS_EXPIRY }
    );
};

/**
 * Generate a long-lived refresh token (7d default)
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        Config.JWT_REFRESH_SECRET,
        { expiresIn: Config.JWT_REFRESH_EXPIRY }
    );
};

/**
 * Verify and decode an access token
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, Config.JWT_ACCESS_SECRET);
};

/**
 * Verify and decode a refresh token
 */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, Config.JWT_REFRESH_SECRET);
};

/**
 * Generate both access and refresh tokens
 */
const generateTokenPair = (userId) => {
    return {
        accessToken: generateAccessToken(userId),
        refreshToken: generateRefreshToken(userId),
    };
};

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
};
