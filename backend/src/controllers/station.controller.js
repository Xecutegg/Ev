import Station from '../models/Station.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Create / List a new EV Charging Station
 * Automatically upgrades user's role to 'partner' on first station creation
 */
const createStation = asyncHandler(async (req, res) => {
    const {
        stationName,
        operatorBrand,
        cityState,
        address,
        latitude,
        longitude,
        locationType,
        chargerLevel,
        powerOutput,
        totalPorts,
        availablePorts,
        connectors,
        amenities,
        pricingType,
        priceRate,
        status,
    } = req.body;

    // Validation
    if (!stationName || !stationName.trim()) {
        throw ApiError.badRequest('Station name is required');
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
        throw ApiError.badRequest('Valid latitude and longitude coordinates are required');
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        throw ApiError.badRequest('Latitude must be between -90 and 90, and longitude between -180 and 180');
    }

    const rateNum = parseFloat(priceRate) || 0;
    if (rateNum < 0) {
        throw ApiError.badRequest('Price rate cannot be negative');
    }

    const portsNum = parseInt(totalPorts) || 4;
    const availNum = availablePorts !== undefined ? parseInt(availablePorts) : portsNum;

    // Create Station document
    const station = await Station.create({
        owner: req.user._id,
        stationName: stationName.trim(),
        operatorBrand: operatorBrand ? operatorBrand.trim() : 'Independent',
        cityState: cityState ? cityState.trim() : '',
        address: address ? address.trim() : '',
        location: {
            type: 'Point',
            coordinates: [lngNum, latNum], // GeoJSON order: [longitude, latitude]
        },
        locationType: locationType || 'Suburban',
        chargerLevel: chargerLevel || 'Level 2 (Faster AC)',
        powerOutput: powerOutput || '7.2 kW',
        totalPorts: portsNum,
        availablePorts: availNum,
        connectors: Array.isArray(connectors) ? connectors : ['CCS2', 'Type 2'],
        amenities: Array.isArray(amenities) ? amenities : [],
        pricingType: pricingType || 'per_kwh',
        priceRate: rateNum,
        status: status || 'Available',
    });

    // Automatically update user role to 'partner' if currently 'user'
    let updatedUser = req.user;
    if (req.user.role === 'user') {
        req.user.role = 'partner';
        await req.user.save();
        updatedUser = req.user;
    }

    res.status(201).json({
        success: true,
        message: 'Charging station listed successfully!',
        data: {
            station,
            user: updatedUser.toJSON(),
        },
    });
});

/**
 * Get all stations owned by the authenticated partner
 */
const getMyStations = asyncHandler(async (req, res) => {
    const stations = await Station.find({ owner: req.user._id }).sort({ createdAt: -1 });

    res.json({
        success: true,
        count: stations.length,
        data: stations,
    });
});

/**
 * Get all public charging stations (for map view)
 */
const getAllStations = asyncHandler(async (req, res) => {
    const { status, level, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (level) filter.chargerLevel = level;

    const stations = await Station.find(filter)
        .populate('owner', 'name email username')
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: stations.length,
        data: stations,
    });
});

/**
 * Get single station details by ID
 */
const getStationById = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id).populate('owner', 'name email username');
    if (!station) {
        throw ApiError.notFound('Charging station not found');
    }

    res.json({
        success: true,
        data: station,
    });
});

/**
 * Update an existing station
 */
const updateStation = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id);
    if (!station) {
        throw ApiError.notFound('Charging station not found');
    }

    // Verify ownership
    if (!station.owner.equals(req.user._id) && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to update this charging station');
    }

    const {
        stationName,
        operatorBrand,
        cityState,
        address,
        latitude,
        longitude,
        locationType,
        chargerLevel,
        powerOutput,
        totalPorts,
        availablePorts,
        connectors,
        amenities,
        pricingType,
        priceRate,
        status,
    } = req.body;

    if (stationName) station.stationName = stationName.trim();
    if (operatorBrand !== undefined) station.operatorBrand = operatorBrand.trim();
    if (cityState !== undefined) station.cityState = cityState.trim();
    if (address !== undefined) station.address = address.trim();

    if (latitude !== undefined && longitude !== undefined) {
        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);
        if (!isNaN(latNum) && !isNaN(lngNum)) {
            station.location = {
                type: 'Point',
                coordinates: [lngNum, latNum],
            };
        }
    }

    if (locationType) station.locationType = locationType;
    if (chargerLevel) station.chargerLevel = chargerLevel;
    if (powerOutput) station.powerOutput = powerOutput;
    if (totalPorts !== undefined) station.totalPorts = parseInt(totalPorts) || station.totalPorts;
    if (availablePorts !== undefined) station.availablePorts = parseInt(availablePorts);
    if (connectors && Array.isArray(connectors)) station.connectors = connectors;
    if (amenities && Array.isArray(amenities)) station.amenities = amenities;
    if (pricingType) station.pricingType = pricingType;
    if (priceRate !== undefined) station.priceRate = parseFloat(priceRate) || 0;
    if (status) station.status = status;

    await station.save();

    res.json({
        success: true,
        message: 'Charging station updated successfully!',
        data: station,
    });
});

/**
 * Delete a station
 */
const deleteStation = asyncHandler(async (req, res) => {
    const station = await Station.findById(req.params.id);
    if (!station) {
        throw ApiError.notFound('Charging station not found');
    }

    // Verify ownership
    if (!station.owner.equals(req.user._id) && req.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have permission to delete this charging station');
    }

    await station.deleteOne();

    res.json({
        success: true,
        message: 'Charging station deleted successfully!',
    });
});

export {
    createStation,
    getMyStations,
    getAllStations,
    getStationById,
    updateStation,
    deleteStation,
};
