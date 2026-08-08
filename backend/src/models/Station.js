import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Station owner is required'],
            index: true,
        },
        stationName: {
            type: String,
            required: [true, 'Station name is required'],
            trim: true,
            minlength: [2, 'Station name must be at least 2 characters'],
            maxlength: [100, 'Station name cannot exceed 100 characters'],
        },
        operatorBrand: {
            type: String,
            trim: true,
            default: 'Independent',
        },
        cityState: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, 'Location coordinates [lng, lat] are required'],
            },
        },
        locationType: {
            type: String,
            enum: ['Suburban', 'Urban', 'Highway', 'Commercial'],
            default: 'Suburban',
        },
        chargerLevel: {
            type: String,
            enum: ['Level 2', 'DC Fast Charger', 'Level 3'],
            default: 'Level 2',
        },
        powerOutput: {
            type: String,
            default: '7.2 kW',
        },
        totalPorts: {
            type: Number,
            required: [true, 'Total ports is required'],
            min: [1, 'At least 1 port is required'],
            default: 4,
        },
        availablePorts: {
            type: Number,
            min: [0, 'Available ports cannot be negative'],
            default: 4,
        },
        connectors: {
            type: [String],
            default: ['CCS2', 'Type 2'],
        },
        amenities: {
            type: [String],
            default: [],
        },
        pricingType: {
            type: String,
            enum: ['per_kwh', 'per_hour', 'per_min', 'free'],
            default: 'per_kwh',
        },
        priceRate: {
            type: Number,
            default: 0,
            min: [0, 'Price rate cannot be negative'],
        },
        operatingDays: {
            type: String,
            default: '24/7 (Mon - Sun)',
        },
        openTime: {
            type: String,
            default: '06:00 AM',
        },
        closeTime: {
            type: String,
            default: '10:00 PM',
        },
        status: {
            type: String,
            enum: ['Available', 'Under Maintenance', 'Offline'],
            default: 'Available',
        },
    },
    {
        timestamps: true,
    }
);

// 2DSphere index for geospatial queries (finding nearby stations)
stationSchema.index({ location: '2dsphere' });

const Station = mongoose.model('Station', stationSchema);

export default Station;
