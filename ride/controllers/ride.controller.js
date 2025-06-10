const rideModel = require('../models/ride.model');
const { createRideNotification } = require('../utils/notification.helper');
const { subscribeToQueue ,publishToQueue} = require('../service/rabbit')
const { isValidTransition }= require('../utils/rideStatus.helper');
const { executeWithTransaction } = require('../utils/dbTranscation.helper');
module.exports.createRide = async(req, res, next) => {
    await executeWithTransaction(async (session) => {
    const { pickup, destination } = req.body;
    if(!pickup || !destination){
        return res.status(400).json({message: 'pickup and destination is needed to create a ride'});
    }
    const estimated_fare = Math.floor(Math.random() * (9999 - 100 + 1)) + 100;
    const newRide = await rideModel({
        user: {
            _id: req.user?._id,
            name: req.user?.name,
            email: req.user?.email
        },
        pickup: pickup,
        destination: destination,
        estimated_fare: estimated_fare
    });
    publishToQueue("new-ride",JSON.stringify(newRide));
   await newRide.save({session});
   next();
   res.send({message: 'Ride created successfully', newRide});
    });
}
module.exports.acceptRide = async(req, res,next) => {
    await executeWithTransaction(async (session) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId).session(session);
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
    publishToQueue("ride-accepted",ride);
    await createRideNotification(ride,
        'RIDE_STATUS',
        `${ride.user.name}, your ride from ${ride.pickup} to ${ride.destination} has been accepted by ${ride.captain.name}.`,
        `${ride.captain.name}, you have accepted a ride from ${ride.pickup} to ${ride.destination} for ${ride.user.name}.`,
        'Ride Accepted',
        session
      );
    await ride.save({ session });
    next();
    res.send({message: 'Ride accepted successfully', ride});
    });
}
module.exports.rejectRide = async (req, res, next) => {
    await executeWithTransaction(async (session) => {
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
    publishToQueue("ride-rejected",ride);
    await createRideNotification(ride,
        'RIDE_STATUS',
        `${ride.user.name}, your ride from ${ride.pickup} to ${ride.destination} has been rejected by ${ride.captain.name}.`,
        `${ride.captain.name}, you have rejected a ride from ${ride.pickup} to ${ride.destination} for ${ride.user.name}.`,
        'Ride Rejected',
        session
    );
    await ride.save({ session });
    next();
    res.send({ message: 'Ride rejected successfully', ride });
    });
};
module.exports.completeRide = async (req, res, next) => {
    await executeWithTransaction(async (session) => {
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
    publishToQueue("ride-completed", ride);
    await createRideNotification(ride,
        'RIDE_STATUS',
        `${ride.user.name}, your ride from ${ride.pickup} to ${ride.destination} has been completed by ${ride.captain.name}.`,
        `${ride.captain.name}, you have completed a ride from ${ride.pickup} to ${ride.destination} for ${ride.user.name}.`,
        'Ride Completed',
        session
      );
    await ride.save({ session });
    next();
    res.send({ message: 'Ride completed successfully', ride });
    });
};
module.exports.rideStarted = async (req, res, next) => {
    await executeWithTransaction(async (session) => {
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
    publishToQueue("ride-started", ride);
    await createRideNotification(ride,
        'RIDE_STATUS',
        `${ride.user.name}, your ride from ${ride.pickup} to ${ride.destination} has been started by ${ride.captain.name}.`,
        `${ride.captain.name}, you have started a ride from ${ride.pickup} to ${ride.destination} for ${ride.user.name}.`,
        'Ride Started',
        session
      );
    await ride.save({ session });
    next();
    res.send({ message: 'Ride started successfully', ride });
    });
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
subscribeToQueue('get-captain-rides', async (msg, channel, msgObj) => {
    const data = JSON.parse(msg);
    const rides = await rideModel.find({'captain._id': data.captainId});
    channel.sendToQueue(
        msgObj.properties.replyTo,
        Buffer.from(JSON.stringify(rides)),
        { correlationId: msgObj.properties.correlationId }
    );
    channel.ack(msgObj);
});