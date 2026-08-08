import api from './api.js';

/**
 * Create a new Razorpay booking order
 */
const createOrder = async (bookingData) => {
    const response = await api.post('/bookings/create-order', bookingData);
    return response.data;
};

/**
 * Verify Razorpay payment signature
 */
const verifyPayment = async (paymentData) => {
    const response = await api.post('/bookings/verify-payment', paymentData);
    return response.data;
};

/**
 * Fetch all bookings for logged-in user
 */
const getMyBookings = async () => {
    const response = await api.get('/bookings/my-bookings');
    return response.data;
};

export default {
    createOrder,
    verifyPayment,
    getMyBookings,
};
