import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { createOtp, verifyOtp as verifyOtpService } from '../services/otp.service.js';
import { sendOtpEmail } from '../services/email.service.js';
import { generateTokenPair, verifyRefreshToken } from '../services/token.service.js';
import { createSession, destroySession } from '../services/session.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/auth/register
 * Send OTP for email verification without creating User document in DB yet
 */
const register = asyncHandler(async (req, res) => {
    const { username, name, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists in User collection
    const existingUser = await User.findOne({
        $or: [
            { email: cleanEmail },
            { username: cleanUsername },
        ],
    });

    if (existingUser) {
        if (existingUser.email === cleanEmail) {
            throw ApiError.conflict('An account with this email already exists. Please login.');
        }
        throw ApiError.conflict('This username is already taken');
    }

    // Save pending registration payload in OTP record (expires automatically via TTL index in 10 mins)
    const pendingUserData = {
        username: username.trim(),
        name: name.trim(),
        password, // Plain password, will be hashed when User.create() runs on verification
    };

    // Generate OTP and queue email
    const otp = await createOtp(cleanEmail, 'registration', pendingUserData);
    await sendOtpEmail(cleanEmail, otp);

    return ApiResponse.created(res, 'Verification code sent to your email. Please verify to complete registration.', {
        email: cleanEmail,
        requiresOtp: true,
    });
});

/**
 * POST /api/auth/verify-otp
 * Verify email OTP and CREATE user in database ONLY when OTP is verified
 */
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check if user is already registered and verified
    let user = await User.findOne({ email: cleanEmail });
    if (user && user.isVerified) {
        throw ApiError.badRequest('Email is already verified. Please login.');
    }

    // Verify OTP and retrieve pending user data
    const { verified, pendingUserData } = await verifyOtpService(cleanEmail, otp.trim(), 'registration');

    if (!user) {
        if (!pendingUserData) {
            throw ApiError.badRequest('Registration data expired or invalid. Please register again.');
        }

        // Check again for username/email conflicts before creating
        const conflictCheck = await User.findOne({
            $or: [
                { email: cleanEmail },
                { username: pendingUserData.username.toLowerCase() },
            ],
        });
        if (conflictCheck) {
            throw ApiError.conflict('User or username already exists');
        }

        // CREATE USER IN MONGODB NOW THAT OTP IS VERIFIED
        user = await User.create({
            username: pendingUserData.username,
            name: pendingUserData.name,
            email: cleanEmail,
            password: pendingUserData.password, // Pre-save hook hashes this password automatically
            isVerified: true,
        });
    } else {
        // User exists but was not verified
        user.isVerified = true;
    }

    // Generate token pair
    const tokens = generateTokenPair(user._id.toString());

    // Store refresh token
    user.refreshTokens = [tokens.refreshToken];
    await user.save();

    // Create session (Redis & MongoDB)
    await createSession(req, user._id.toString(), {
        email: user.email,
        username: user.username,
        name: user.name,
    });

    return ApiResponse.success(res, 'Email verified and account created successfully', {
        user: {
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    });
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +refreshTokens');
    if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if verified
    if (!user.isVerified) {
        // Send new OTP
        const otp = await createOtp(user.email, 'registration');
        await sendOtpEmail(user.email, otp);

        return ApiResponse.error(res, 'Email not verified. A new verification code has been sent to your email.', 403, {
            requiresVerification: true,
            email: user.email,
        });
    }

    // Generate token pair
    const tokens = generateTokenPair(user._id.toString());

    // Store refresh token (keep max 5 active sessions)
    if (user.refreshTokens.length >= 5) {
        user.refreshTokens = user.refreshTokens.slice(-4);
    }
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    // Create session
    await createSession(req, user._id.toString(), {
        email: user.email,
        username: user.username,
        name: user.name,
    });

    return ApiResponse.success(res, 'Login successful', {
        user: {
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token (with rotation)
 */
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.body;

    if (!oldRefreshToken) {
        throw ApiError.badRequest('Refresh token is required');
    }

    // Verify the refresh token
    let decoded;
    try {
        decoded = verifyRefreshToken(oldRefreshToken);
    } catch (error) {
        throw ApiError.unauthorized('Invalid or expired refresh token. Please login again.');
    }

    // Find user and check if token exists
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user) {
        throw ApiError.unauthorized('User not found. Please login again.');
    }

    // Check if this refresh token is in user's token list
    const tokenIndex = user.refreshTokens.indexOf(oldRefreshToken);
    if (tokenIndex === -1) {
        // Token reuse detected — possible token theft, invalidate all tokens
        user.refreshTokens = [];
        await user.save();
        throw ApiError.unauthorized('Token reuse detected. All sessions invalidated. Please login again.');
    }

    // Generate new token pair (rotation)
    const tokens = generateTokenPair(user._id.toString());

    // Replace old refresh token with new one
    user.refreshTokens[tokenIndex] = tokens.refreshToken;
    await user.save();

    return ApiResponse.success(res, 'Token refreshed successfully', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    });
});

/**
 * POST /api/auth/logout
 * Logout — remove refresh token and destroy session
 */
const logout = asyncHandler(async (req, res) => {
    const { refreshToken: tokenToRemove } = req.body;

    // Remove refresh token from user's list
    if (tokenToRemove && req.user) {
        const user = await User.findById(req.user._id).select('+refreshTokens');
        if (user) {
            user.refreshTokens = user.refreshTokens.filter((t) => t !== tokenToRemove);
            await user.save();
        }
    }

    // Destroy session
    try {
        await destroySession(req);
    } catch (error) {
        // Session might not exist, that's ok
    }

    return ApiResponse.success(res, 'Logged out successfully');
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification
 */
const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check if user is already registered and verified
    const user = await User.findOne({ email: cleanEmail });
    if (user && user.isVerified) {
        throw ApiError.badRequest('Email is already verified. Please login.');
    }

    // Find existing pending OTP record to keep pendingUserData
    const existingOtp = await Otp.findOne({ email: cleanEmail, type: 'registration' });
    const pendingUserData = existingOtp ? existingOtp.pendingUserData : null;

    if (!user && !pendingUserData) {
        throw ApiError.notFound('No pending registration found for this email. Please register again.');
    }

    // Generate new OTP and queue email
    const otp = await createOtp(cleanEmail, 'registration', pendingUserData);
    await sendOtpEmail(cleanEmail, otp);

    return ApiResponse.success(res, 'A new verification code has been sent to your email');
});

/**
 * GET /api/auth/me
 * Get authenticated user's profile
 */
const getMe = asyncHandler(async (req, res) => {
    return ApiResponse.success(res, 'User profile retrieved', {
        user: {
            _id: req.user._id,
            username: req.user.username,
            name: req.user.name,
            email: req.user.email,
            isVerified: req.user.isVerified,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt,
        },
    });
});

export { register, verifyOtp, login, refreshToken, logout, resendOtp, getMe };
