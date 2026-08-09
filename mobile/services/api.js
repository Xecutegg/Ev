import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Configuration ─────────────────────────────────────────── 
// Change this to your backend URL
// For Android emulator: http://10.0.2.2:2415
// For iOS simulator: http://localhost:2415
// For physical device: http://<your-ip>:2415
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.ev.onedreamesports.in/api';

const ACCESS_TOKEN_KEY = 'ev_access_token';
const REFRESH_TOKEN_KEY = 'ev_refresh_token';

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Token Storage ───────────────────────────────────────────
const setTokens = async (accessToken, refreshToken) => {
    try {
        if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, String(accessToken));
        if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, String(refreshToken));
    } catch (e) {
        console.warn('SecureStore setTokens error:', e);
    }
};

const getAccessToken = async () => {
    try {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
        return null;
    }
};

const getRefreshToken = async () => {
    try {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
        return null;
    }
};

const clearTokens = async () => {
    try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
        console.warn('SecureStore clearTokens error:', e);
    }
};

// ─── Request Interceptor ────────────────────────────────────
// Attach access token to every outgoing request
api.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ─── Response Interceptor ───────────────────────────────────
// On 401: attempt token refresh, then retry the original request
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried and not the refresh endpoint itself
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            if (isRefreshing) {
                // Queue this request while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshTokenValue = await getRefreshToken();
                if (!refreshTokenValue) {
                    throw new Error('No refresh token available');
                }

                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken: refreshTokenValue,
                });

                const { accessToken, refreshToken: newRefreshToken } = data.data;
                await setTokens(accessToken, newRefreshToken);

                processQueue(null, accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                await clearTokens();
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export { api, setTokens, getAccessToken, getRefreshToken, clearTokens, BASE_URL };
export default api;
