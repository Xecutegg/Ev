import Config from '../config/config.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

/**
 * Proxy reverse geocode request to Google Maps Geocoding API
 */
const reverseGeocode = asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        throw ApiError.badRequest('Latitude (lat) and Longitude (lng) are required.');
    }

    const key = Config.GOOGLE_MAPS_API_KEY;
    if (!key) {
        throw ApiError.notFound('Google Maps API key is not configured on backend.');
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const formattedAddress = data.results[0].formatted_address;
            return res.status(200).json({
                success: true,
                data: {
                    address: formattedAddress,
                    results: data.results,
                },
            });
        }

        return res.status(200).json({
            success: false,
            message: data.error_message || `Geocoding status: ${data.status}`,
            data: null,
        });
    } catch (error) {
        throw ApiError.internal(error.message || 'Failed to fetch reverse geocode data');
    }
});

/**
 * Places Autocomplete / Geocoding suggestions endpoint
 * Returns matching locations for user input (debounced by client)
 */
const placesAutocomplete = asyncHandler(async (req, res) => {
    const { input } = req.query;
    if (!input || input.trim().length < 2) {
        return res.status(200).json({
            success: true,
            data: [],
        });
    }

    const key = Config.GOOGLE_MAPS_API_KEY;
    if (!key) {
        throw ApiError.notFound('Google Maps API key is not configured on backend.');
    }

    try {
        // 1. Try Google Places Autocomplete API first
        const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input.trim())}&key=${key}`;
        const response = await fetch(placesUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
            const suggestions = data.predictions.map((p) => ({
                description: p.description,
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
            }));
            return res.status(200).json({
                success: true,
                data: suggestions,
            });
        }

        // 2. Fallback to Google Geocoding API if Places API returns no results or is restricted
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input.trim())}&key=${key}`;
        const geoResponse = await fetch(geocodeUrl);
        const geoData = await geoResponse.json();

        if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
            const suggestions = geoData.results.map((r) => ({
                description: r.formatted_address,
                placeId: r.place_id,
                lat: r.geometry.location.lat,
                lng: r.geometry.location.lng,
                mainText: r.formatted_address.split(',')[0],
                secondaryText: r.formatted_address.split(',').slice(1).join(',').trim(),
            }));
            return res.status(200).json({
                success: true,
                data: suggestions,
            });
        }

        return res.status(200).json({
            success: true,
            data: [],
        });
    } catch (error) {
        throw ApiError.internal(error.message || 'Failed to fetch location suggestions');
    }
});

/**
 * Get Place Details (latitude & longitude) by placeId or address
 */
const getPlaceDetails = asyncHandler(async (req, res) => {
    const { placeId, address } = req.query;
    const key = Config.GOOGLE_MAPS_API_KEY;
    if (!key) {
        throw ApiError.notFound('Google Maps API key is not configured on backend.');
    }

    try {
        if (placeId) {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${key}`;
            const response = await fetch(detailsUrl);
            const data = await response.json();
            if (data.status === 'OK' && data.result?.geometry?.location) {
                return res.status(200).json({
                    success: true,
                    data: {
                        lat: data.result.geometry.location.lat,
                        lng: data.result.geometry.location.lng,
                        address: data.result.formatted_address,
                    },
                });
            }
        }

        if (address) {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
                return res.status(200).json({
                    success: true,
                    data: {
                        lat: data.results[0].geometry.location.lat,
                        lng: data.results[0].geometry.location.lng,
                        address: data.results[0].formatted_address,
                    },
                });
            }
        }

        throw ApiError.notFound('Location details not found');
    } catch (error) {
        throw ApiError.internal(error.message || 'Failed to fetch place details');
    }
});

export { reverseGeocode, placesAutocomplete, getPlaceDetails };
