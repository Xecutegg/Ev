import api from './api.js';

/**
 * Register a new user
 */
const register = async (username, name, email, password, confirmPassword) => {
    const response = await api.post('/auth/register', {
        username,
        name,
        email,
        password,
        confirmPassword,
    });
    return response.data;
};

/**
 * Verify OTP
 */
const verifyOtp = async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
};

/**
 * Login with email and password
 */
const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
};

/**
 * Logout
 */
const logout = async (refreshToken) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
};

/**
 * Resend OTP
 */
const resendOtp = async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
};

/**
 * Refresh access token
 */
const refreshToken = async (token) => {
    const response = await api.post('/auth/refresh', { refreshToken: token });
    return response.data;
};

/**
 * Get current user profile
 */
const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export default {
    register,
    verifyOtp,
    login,
    logout,
    resendOtp,
    refreshToken,
    getMe,
};
