import express from 'express';
import cors from 'cors';
// Updated Station schema enums
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';

import Config from './config/config.js';
import { redisClient, connectRedis } from './config/redis.js';
import DataBase from './database/index.js';
import authRoutes from './routes/auth.routes.js';
import stationRoutes from './routes/station.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import configRoutes from './routes/config.routes.js';
import ApiError from './utils/ApiError.js';

// Import email worker so it starts processing jobs
import './services/email.service.js';

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({
    origin: Config.CLIENT_URL === '*' ? true : Config.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Session (Redis-backed) ─────────────────────────────────
app.use(session({
    store: new RedisStore({
        client: redisClient,
        prefix: 'ev:sess:',
    }),
    secret: Config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: Config.SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
        sameSite: 'lax',
    },
    name: 'ev.sid',
}));

// ─── Routes ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'EV Charging API is running',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/config', configRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
    // Log error
    console.error(`[Error] ${err.message}`, err.stack);

    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors.length > 0 ? err.errors : undefined,
        });
    }

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Validation failed',
            errors,
        });
    }

    // Handle mongoose duplicate key errors
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            success: false,
            statusCode: 409,
            message: `${field} already exists`,
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            statusCode: 401,
            message: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            statusCode: 401,
            message: 'Token expired',
        });
    }

    // Default 500 error
    res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
    });
});

// ─── Start Server ────────────────────────────────────────────
const startServer = async () => {
    try {
        // Connect to Redis
        await connectRedis();

        // Connect to MongoDB
        await DataBase();

        // Start Express
        app.listen(Config.PORT, () => {
            console.log(`\n⚡ EV Charging API Server`);
            console.log(`  → Port:     ${Config.PORT}`);
            console.log(`  → MongoDB:  Connected`);
            console.log(`  → Redis:    Connected`);
            console.log(`  → BullMQ:   Email worker active`);
            console.log(`  → Health:   http://localhost:${Config.PORT}/api/health\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
