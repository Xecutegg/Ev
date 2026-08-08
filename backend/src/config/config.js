import dotenv from 'dotenv';
dotenv.config();

const Config = {
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,

    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

    // Session
    SESSION_SECRET: process.env.SESSION_SECRET,
    SESSION_EXPIRY_HOURS: parseInt(process.env.SESSION_EXPIRY_HOURS) || 24,

    // Redis
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // SMTP (Mailcow)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,

    // OTP
    OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,

    // Client
    CLIENT_URL: process.env.CLIENT_URL,

    // Google Maps API Key
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

    // Razorpay Credentials
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
};

export default Config;