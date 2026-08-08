import api from './api.js';

/**
 * List a new station
 */
const createStation = async (stationData) => {
    const response = await api.post('/stations', stationData);
    return response.data;
};

/**
 * Get all stations owned by current partner
 */
const getMyStations = async () => {
    const response = await api.get('/stations/my-stations/list');
    return response.data;
};

/**
 * Get all active public stations (for map view)
 */
const getAllStations = async () => {
    const response = await api.get('/stations/all');
    return response.data;
};

/**
 * Update a station by ID
 */
const updateStation = async (id, updateData) => {
    const response = await api.put(`/stations/${id}`, updateData);
    return response.data;
};

/**
 * Delete a station by ID
 */
const deleteStation = async (id) => {
    const response = await api.delete(`/stations/${id}`);
    return response.data;
};

export default {
    createStation,
    getMyStations,
    getAllStations,
    updateStation,
    deleteStation,
};
