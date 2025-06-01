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