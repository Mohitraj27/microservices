const rideModel = require('../models/ride.model');
const { subscribeToQueue ,publishToQueue} = require('../service/rabbit')
module.exports.createRide = async(req, res, next) => {
    const { pickup, destination } = req.body;
    const newRide = await rideModel({
        user: req.user._id,
        pickup,
        destination
    });
    publishToQueue("new-ride",JSON.stringify(newRide));
   await newRide.save();
   next();
   res.send({message: 'Ride created successfully', newRide});
}
module.exports.acceptRide = async(req, res,next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if(!ride){
        return res.status(404).json({message: 'Ride not found'});
    }
    ride.status = 'accepted';
    await ride.save();
    publishToQueue("ride-accepted",JSON.stringify(ride));
    next();
    res.send({message: 'Ride accepted successfully', ride});
}