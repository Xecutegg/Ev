import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Otp from '../models/Otp.js';
import Config from '../config/config.js';
import ApiError from '../utils/ApiError.js';

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
const generateOtp = () => {
    // Generate random number between 100000 and 999999
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create a new OTP for the given email
 * - Deletes any existing OTPs for this email+type
 * - Generates new OTP, hashes it, stores in MongoDB
 * - Returns the plain OTP (for sending via email)
 */
const createOtp = async (email, type = 'registration', pendingUserData = null) => {
    // Remove any existing OTPs for this email+type
    await Otp.deleteMany({ email, type });

    // Generate plain OTP
    const plainOtp = generateOtp();

    // Hash the OTP before storing
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedOtp = await bcrypt.hash(plainOtp, salt);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + Config.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store hashed OTP in database
    await Otp.create({
        email,
        otp: hashedOtp,
        type,
        pendingUserData,
        expiresAt,
    });

    // Return plain OTP (to be sent via email)
    return plainOtp;
};

/**
 * Verify an OTP against the stored hash
 * - Checks attempt limit
 * - Compares OTP hash
 * - Deletes OTP on successful verification and returns otpDoc (with pendingUserData)
 */
const verifyOtp = async (email, plainOtp, type = 'registration') => {
    const otpDoc = await Otp.findOne({ email, type });

    if (!otpDoc) {
        throw ApiError.badRequest('OTP expired or not found. Please request a new one.');
    }

    // Check if max attempts exceeded
    if (otpDoc.attempts >= MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: otpDoc._id });
        throw ApiError.tooManyRequests('Too many failed attempts. Please request a new OTP.');
    }

    // Check if OTP has expired
    if (otpDoc.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: otpDoc._id });
        throw ApiError.badRequest('OTP has expired. Please request a new one.');
    }

    // Compare OTP hash
    const isMatch = await bcrypt.compare(plainOtp, otpDoc.otp);

    if (!isMatch) {
        // Increment attempt counter
        otpDoc.attempts += 1;
        await otpDoc.save();
        throw ApiError.badRequest(`Invalid OTP. ${MAX_ATTEMPTS - otpDoc.attempts} attempts remaining.`);
    }

    // Clone pendingUserData before deleting document
    const pendingUserData = otpDoc.pendingUserData ? otpDoc.pendingUserData.toObject() : null;

    // OTP verified — delete it (single use)
    await Otp.deleteOne({ _id: otpDoc._id });

    return { verified: true, pendingUserData };
};

export { generateOtp, createOtp, verifyOtp };
