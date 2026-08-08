import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Station from '../models/Station.js';
import Config from '../config/config.js';

const RAZORPAY_KEY_ID = Config.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = Config.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = Config.RAZORPAY_WEBHOOK_SECRET;

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay Order and initial Booking record
 */
export const createOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { stationId, slotDate, slotTime, durationHours = 1, connectorType = 'CCS2' } = req.body;

        if (!stationId || !slotDate || !slotTime) {
            return res.status(400).json({
                success: false,
                message: 'Station ID, slot date, and slot time are required',
            });
        }

        const station = await Station.findById(stationId);
        if (!station) {
            return res.status(404).json({
                success: false,
                message: 'Charging station not found',
            });
        }

        const rate = station.priceRate || 15;
        const totalAmount = Math.max(1, rate * Number(durationHours));
        const amountInPaise = Math.round(totalAmount * 100); // Razorpay requires amount in paise

        // Create Razorpay Order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
                stationName: station.stationName,
                slotDate,
                slotTime,
            },
        });

        // Save Booking record in MongoDB
        const booking = await Booking.create({
            user: userId,
            station: station._id,
            stationName: station.stationName,
            operatorBrand: station.operatorBrand || 'Independent',
            slotDate,
            slotTime,
            durationHours: Number(durationHours),
            connectorType,
            amount: totalAmount,
            currency: 'INR',
            razorpayOrderId: order.id,
            paymentStatus: 'Pending',
            status: 'Confirmed',
        });

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: totalAmount,
            amountInPaise,
            currency: 'INR',
            keyId: RAZORPAY_KEY_ID,
            bookingId: booking._id,
            booking,
        });
    } catch (err) {
        console.error('Error creating Razorpay order:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to create booking order',
        });
    }
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifyPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Razorpay order ID, payment ID, and signature are required',
            });
        }

        // Verify HMAC SHA256 Signature
        const body = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isSignatureValid = expectedSignature === razorpaySignature;

        if (!isSignatureValid) {
            if (bookingId) {
                await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'Failed' });
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature verification',
            });
        }

        // Update Booking Status in MongoDB
        const booking = await Booking.findOneAndUpdate(
            { razorpayOrderId },
            {
                razorpayPaymentId,
                razorpaySignature,
                paymentStatus: 'Paid',
                status: 'Confirmed',
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: '🎉 Payment verified and slot booked successfully!',
            data: booking,
        });
    } catch (err) {
        console.error('Error verifying Razorpay payment:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to verify payment',
        });
    }
};

/**
 * Razorpay Webhook Handler
 */
export const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const payload = JSON.stringify(req.body);

        if (signature && RAZORPAY_WEBHOOK_SECRET) {
            const expectedSignature = crypto
                .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
                .update(payload)
                .digest('hex');

            if (expectedSignature !== signature) {
                return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
            }
        }

        const event = req.body.event;
        const paymentEntity = req.body.payload?.payment?.entity;

        if ((event === 'payment.captured' || event === 'order.paid') && paymentEntity) {
            const orderId = paymentEntity.order_id;
            const paymentId = paymentEntity.id;

            await Booking.findOneAndUpdate(
                { razorpayOrderId: orderId },
                {
                    razorpayPaymentId: paymentId,
                    paymentStatus: 'Paid',
                    status: 'Confirmed',
                }
            );
        }

        return res.status(200).json({ success: true, status: 'ok' });
    } catch (err) {
        console.error('Error in Razorpay Webhook:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get User Bookings
 */
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.user._id;
        const bookings = await Booking.find({ user: userId })
            .populate('station', 'stationName operatorBrand address cityState powerOutput')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    } catch (err) {
        console.error('Error fetching user bookings:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch booking history',
        });
    }
};
