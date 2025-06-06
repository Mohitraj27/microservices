const rideModel = require('../models/ride.model');
const { subscribeToQueue ,publishToQueue} = require('../service/rabbit')
const { isValidTransition }= require('../utils/rideStatus.helper.');
module.exports.createRide = async(req, res, next) => {
    const { pickup, destination } = req.body;
    if(!pickup || !destination){
        return res.status(400).json({message: 'pickup and destination is needed to create a ride'});
    }
    const newRide = await rideModel({
        user: {
            _id: req.user?._id,
            name: req.user?.name,
            email: req.user?.email
        },
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
    if (!isValidTransition(ride.status, 'accepted')) {
        return res.status(400).json({ message: `Invalid transition from '${ride.status}' to 'accepted'` });
    }   
    ride.status = 'accepted';
    ride.captain = {
        _id: req.captain._id,
        name: req.captain.name,
        email: req.captain.email,
    };
    await ride.save();
    publishToQueue("ride-accepted",JSON.stringify(ride));
    next();
    res.send({message: 'Ride accepted successfully', ride});
}
module.exports.rejectRide = async (req, res, next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }
    if (!isValidTransition(ride.status, 'rejected')) {
        return res.status(400).json({ message: `Invalid transition from '${ride.status}' to 'rejected'` });
    }    
    ride.status = 'rejected';
    ride.captain = {
        _id: req.captain._id,
        name: req.captain.name,
        email: req.captain.email,
    };
    await ride.save();
    publishToQueue("ride-rejected", JSON.stringify(ride));
    next();
    res.send({ message: 'Ride rejected successfully', ride });
};
module.exports.completeRide = async (req, res, next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }
    if (!isValidTransition(ride.status, 'completed')) {
        return res.status(400).json({ message: `Invalid transition from '${ride.status}' to 'completed'` });
    }
    ride.status = 'completed';
    ride.captain = {
        _id: req.captain._id,
        name: req.captain.name,
        email: req.captain.email,
    };
    await ride.save();
    publishToQueue("ride-completed", JSON.stringify(ride));
    next();
    res.send({ message: 'Ride completed successfully', ride });
};
module.exports.rideStarted = async (req, res, next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }
    if (!isValidTransition(ride.status, 'started')) {
        return res.status(400).json({ message: `Invalid transition from '${ride.status}' to 'started'` });
    }
    ride.status = 'started';
    ride.captain = {
        _id: req.captain._id,
        name: req.captain.name,
        email: req.captain.email,
    };
    await ride.save();
    publishToQueue("ride-started", JSON.stringify(ride));
    next();
    res.send({ message: 'Ride started successfully', ride });
};
subscribeToQueue('get-user-rides', async (msg, channel, msgObj) => {
    const data = JSON.parse(msg);
    const rides = await rideModel.find({'user._id': data.userId});
    channel.sendToQueue(
        msgObj.properties.replyTo,
        Buffer.from(JSON.stringify(rides)),
        { correlationId: msgObj.properties.correlationId }
    );
    channel.ack(msgObj);
});