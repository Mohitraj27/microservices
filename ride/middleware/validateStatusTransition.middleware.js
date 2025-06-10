const rideModel = require('../models/ride.model');
const  {isValidTransition}  = require('../utils/rideStatus.helper');

module.exports = (nextStatus) => async (req, res, next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (!isValidTransition(ride.status, nextStatus)) {
        return res.status(400).json({
            message: `Invalid ride status transition from '${ride.status}' to '${nextStatus}'`
        });
    }

    req.ride = ride; 
    next();
};
