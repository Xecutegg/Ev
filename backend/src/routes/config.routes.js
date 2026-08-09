import express from 'express';
import {
    getGoogleMapsKey,
    reverseGeocode,
    placesAutocomplete,
    getPlaceDetails,
} from '../controllers/config.controller.js';

const router = express.Router();

router.get('/google-maps-key', getGoogleMapsKey);
router.get('/reverse-geocode', reverseGeocode);
router.get('/places-autocomplete', placesAutocomplete);
router.get('/place-details', getPlaceDetails);

export default router;
