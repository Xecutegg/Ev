import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    otp: {
        type: String,
        required: true, // Stored as bcrypt hash
    },
    type: {
        type: String,
        enum: ['registration', 'password-reset', 'login'],
        required: true,
    },
    pendingUserData: {
        username: { type: String, trim: true, lowercase: true },
        name: { type: String, trim: true },
        password: { type: String }, // Hashed password
    },
    attempts: {
        type: Number,
        default: 0,
        max: 5,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }, // TTL index — MongoDB auto-deletes when expiresAt is reached
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index for efficient OTP lookups
otpSchema.index({ email: 1, type: 1 });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
