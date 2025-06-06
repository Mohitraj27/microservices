const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/create-ride',authMiddleware.rideAuth, rideController.createRide);
router.put('/accept-ride', authMiddleware.captainAuth, rideController.acceptRide);
router.put('/reject-ride', authMiddleware.captainAuth, rideController.rejectRide);
router.put('/ride-started', authMiddleware.captainAuth, rideController.rideStarted);
router.put('/complete-ride', authMiddleware.captainAuth, rideController.completeRide);
module.exports = router;
