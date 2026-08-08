import { createClient } from 'redis';
import Config from './config.js';

const redisClient = createClient({
    url: Config.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis: Max reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
            }
            // Exponential backoff: 2^retries * 100ms, capped at 30s
            return Math.min(retries * 100, 30000);
        },
    },
});

redisClient.on('connect', () => {
    console.log('Redis: Connected');
});

redisClient.on('ready', () => {
    console.log('Redis: Ready');
});

redisClient.on('error', (err) => {
    console.error('Redis: Error -', err.message);
});

redisClient.on('reconnecting', () => {
    console.log('Redis: Reconnecting...');
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Redis: Failed to connect -', error.message);
        process.exit(1);
    }
};

export { redisClient, connectRedis };
