import express from 'express';
import {
    createStation,
    getMyStations,
    getAllStations,
    getStationById,
    updateStation,
    deleteStation,
} from '../controllers/station.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/all', getAllStations);
router.get('/:id', getStationById);

// Protected routes (Requires authentication)
router.use(authenticate);

router.post('/', createStation);
router.get('/my-stations/list', getMyStations);
router.put('/:id', updateStation);
router.delete('/:id', deleteStation);

export default router;
