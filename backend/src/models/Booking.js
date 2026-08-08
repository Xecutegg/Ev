import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
            index: true,
        },
        station: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Station',
            required: [true, 'Station is required'],
            index: true,
        },
        stationName: {
            type: String,
            required: true,
        },
        operatorBrand: {
            type: String,
            default: 'Independent',
        },
        slotDate: {
            type: String,
            required: [true, 'Slot date is required'],
        },
        slotTime: {
            type: String,
            required: [true, 'Slot time is required'],
        },
        durationHours: {
            type: Number,
            default: 1,
        },
        connectorType: {
            type: String,
            default: 'CCS2',
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
        },
        currency: {
            type: String,
            default: 'INR',
        },
        razorpayOrderId: {
            type: String,
            required: true,
        },
        razorpayPaymentId: {
            type: String,
        },
        razorpaySignature: {
            type: String,
        },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Paid', 'Failed'],
            default: 'Pending',
        },
        status: {
            type: String,
            enum: ['Confirmed', 'Active', 'Completed', 'Cancelled'],
            default: 'Confirmed',
        },
    },
    {
        timestamps: true,
    }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
