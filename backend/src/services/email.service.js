import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import Config from '../config/config.js';

/**
 * BullMQ is used HERE and ONLY HERE because:
 * - SMTP calls to Mailcow can take 2-5 seconds
 * - SMTP connections may timeout or fail intermittently
 * - Without a queue, users wait for email to send before getting API response
 * - BullMQ provides automatic retries with exponential backoff
 * 
 * BullMQ uses its own internal ioredis connection (separate from the app's redis client)
 */

// Nodemailer transporter configured for Mailcow SMTP with Connection Pooling
const transporter = nodemailer.createTransport({
    host: Config.SMTP_HOST,
    port: Config.SMTP_PORT,
    secure: Config.SMTP_PORT === 465, // true for 465, false for 587
    pool: true, // Keep TCP/TLS connection open in background for ultra-fast sends
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: Config.SMTP_USER,
        pass: Config.SMTP_PASS,
    },
});

// Warm up and verify Mailcow SMTP server connection in background on startup
transporter.verify((error) => {
    if (error) {
        console.warn('⚠️ [SMTP] Connection warning:', error.message);
    } else {
        console.log('⚡ [SMTP] Mailcow SMTP server connected & pre-warmed in background');
    }
});

// Helper to parse Redis URL with credentials for BullMQ / ioredis
const getBullMqConnection = () => {
    try {
        const parsed = new URL(Config.REDIS_URL);
        const options = {
            host: parsed.hostname || 'localhost',
            port: parseInt(parsed.port) || 6379,
            maxRetriesPerRequest: null,
        };
        if (parsed.password) {
            options.password = decodeURIComponent(parsed.password);
        }
        if (parsed.username) {
            options.username = decodeURIComponent(parsed.username);
        }
        return options;
    } catch (e) {
        return { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
    }
};

const redisConnection = getBullMqConnection();

// BullMQ Queue — jobs are added here
const emailQueue = new Queue('email-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
    },
});

/**
 * Generate professional HTML email template for OTP
 */
const generateOtpEmailHtml = (otp, expiryMinutes) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 230, 118, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center;">
                                <div style="font-size: 36px; margin-bottom: 8px;">⚡</div>
                                <h1 style="color: #00E676; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 1px;">EV Charging</h1>
                                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 2px;">Station Finder</p>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 20px 40px;">
                                <h2 style="color: #e2e8f0; font-size: 20px; text-align: center; margin: 0 0 12px;">Verify Your Email</h2>
                                <p style="color: #94a3b8; font-size: 14px; text-align: center; line-height: 1.6; margin: 0 0 30px;">
                                    Use the verification code below to complete your registration. This code expires in <strong style="color: #00E676;">${expiryMinutes} minutes</strong>.
                                </p>
                                <!-- OTP Code -->
                                <div style="background: rgba(0, 230, 118, 0.08); border: 2px solid rgba(0, 230, 118, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 30px;">
                                    <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #00E676; font-family: 'Courier New', monospace;">${otp}</span>
                                </div>
                                <p style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.5; margin: 0;">
                                    If you didn't request this code, please ignore this email.<br>
                                    Do not share this code with anyone.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid rgba(100, 116, 139, 0.2);">
                                <p style="color: #475569; font-size: 11px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} EV Charging Station Finder. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

/**
 * BullMQ Worker — processes email jobs in the background
 */
const emailWorker = new Worker(
    'email-queue',
    async (job) => {
        const { to, subject, html } = job.data;

        console.log(`[EmailWorker] Processing job ${job.id}: sending to ${to}`);

        const info = await transporter.sendMail({
            from: Config.SMTP_FROM,
            to,
            subject,
            html,
        });

        console.log(`[EmailWorker] Job ${job.id} completed: messageId=${info.messageId}`);
        return { messageId: info.messageId };
    },
    {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 emails concurrently
    }
);

emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
});

/**
 * Add an OTP email job to the queue
 */
const sendOtpEmail = async (email, otp) => {
    const html = generateOtpEmailHtml(otp, Config.OTP_EXPIRY_MINUTES);

    await emailQueue.add('send-otp', {
        to: email,
        subject: `${otp} — Your EV Charging Verification Code`,
        html,
    });

    console.log(`[EmailService] OTP email job queued for ${email}`);
};

export { emailQueue, emailWorker, sendOtpEmail };
