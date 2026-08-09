import api from './api.js';

const configService = {

    reverseGeocode: async (lat, lng) => {
        try {
            const response = await api.get(`/config/reverse-geocode?lat=${lat}&lng=${lng}`);
            return response.data;
        } catch (error) {
            console.warn('Failed to reverse geocode from backend:', error.message);
            return { success: false, data: null };
        }
    },

    getPlacesAutocomplete: async (input) => {
        try {
            const response = await api.get(`/config/places-autocomplete?input=${encodeURIComponent(input)}`);
            return response.data;
        } catch (error) {
            console.warn('Failed to fetch places autocomplete from backend:', error.message);
            return { success: false, data: [] };
        }
    },

    getPlaceDetails: async (placeId, address) => {
        try {
            const response = await api.get(
                `/config/place-details?placeId=${placeId || ''}&address=${encodeURIComponent(address || '')}`
            );
            return response.data;
        } catch (error) {
            console.warn('Failed to fetch place details from backend:', error.message);
            return { success: false, data: null };
        }
    },
};

export default configService;
