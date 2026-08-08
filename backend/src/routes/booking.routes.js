import express from 'express';
import {
    createOrder,
    verifyPayment,
    handleWebhook,
    getUserBookings,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public Webhook route (Razorpay callback)
router.post('/webhook', handleWebhook);

// Authenticated Booking routes
router.use(authenticate);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/my-bookings', getUserBookings);

export default router;
