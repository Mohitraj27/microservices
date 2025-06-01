const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/create-ride',authMiddleware.rideAuth, rideController.createRide);

module.exports = router;
