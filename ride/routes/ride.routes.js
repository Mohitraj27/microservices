const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validateTransition  = require('../middleware/validateStatusTransition.middleware');

router.post('/create-ride',authMiddleware.rideAuth, rideController.createRide);
router.put('/accept-ride', authMiddleware.captainAuth,validateTransition('accepted'), rideController.acceptRide);
router.put('/reject-ride', authMiddleware.captainAuth, validateTransition('rejected'),rideController.rejectRide);
router.put('/ride-started', authMiddleware.captainAuth,validateTransition('started'), rideController.rideStarted);
router.put('/complete-ride', authMiddleware.captainAuth, validateTransition('completed'),rideController.completeRide);
module.exports = router;
