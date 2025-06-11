const rideModel = require('../models/ride.model');
const { createRideNotification } = require('../utils/notification.helper');
const { subscribeToQueue ,publishToQueue} = require('../service/rabbit')
const { executeWithTransaction } = require('../utils/dbTranscation.helper');
const notification = require('../models/notification.model');
const { indexDocument , updateDocument} = require('../utils/elasticSearch.helper');
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
    await indexDocument(("rides"), newRide._id, {
        pickup: newRide.pickup,
        destination: newRide.destination,
        estimated_fare: newRide.estimated_fare,
        userId: newRide.user._id,
        userName: newRide.user.name,
        userEmail: newRide.user.email,
        status: newRide.status,
        rideId: newRide._id,
        indexedAt: new Date(),
    });
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
    await updateDocument(("rides"), ride._id, {
        pickup: ride.pickup,
        destination: ride.destination,
        estimated_fare: ride.estimated_fare,
        userId: ride.user._id,
        userName: ride.user.name,
        userEmail: ride.user.email,
        captainID: ride.captain?._id,
        captainName: ride.captain?.name,
        captainEmail: ride.captain?.email,
        status: ride.status,
        rideId: ride._id,
        indexedAt: new Date(),
    });
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
    await updateDocument(("rides"), ride._id, {
        pickup: ride.pickup,
        destination: ride.destination,
        estimated_fare: ride.estimated_fare,
        userId: ride.user._id,
        userName: ride.user.name,
        userEmail: ride.user.email,
        captainID: ride.captain?._id,
        captainName: ride.captain?.name,
        captainEmail: ride.captain?.email,
        status: ride.status,
        rideId: ride._id,
        indexedAt: new Date(),
    });
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
    await updateDocument(("rides"), ride._id, {
        pickup: ride.pickup,
        destination: ride.destination,
        estimated_fare: ride.estimated_fare,
        userId: ride.user._id,
        userName: ride.user.name,
        userEmail: ride.user.email,
        captainID: ride.captain?._id,
        captainName: ride.captain?.name,
        captainEmail: ride.captain?.email,
        status: ride.status,
        rideId: ride._id,
        indexedAt: new Date(),
    });
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
    await updateDocument(("rides"), ride._id, {
        pickup: ride.pickup,
        destination: ride.destination,
        estimated_fare: ride.estimated_fare,
        userId: ride.user._id,
        userName: ride.user.name,
        userEmail: ride.user.email,
        captainID: ride.captain?._id,
        captainName: ride.captain?.name,
        captainEmail: ride.captain?.email,
        status: ride.status,
        rideId: ride._id,
        indexedAt: new Date(),
    });
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
subscribeToQueue('notify-captain',async(msg,channel,msgObj) => {
    const data = JSON.parse(msg);
    const notifyrides = await notification.find({$and:[{'recipientId':data.captainId},{'recipientType':'Captain'}]});
    channel.sendToQueue(
        msgObj.properties.replyTo,
        Buffer.from(JSON.stringify(notifyrides)),
        { correlationId: msgObj.properties.correlationId }
    );
    channel.ack(msgObj);
});
subscribeToQueue('notify-user',async(msg,channel,msgObj) => {
    const data = JSON.parse(msg);
    const rides = await notification.find({$and:[{'recipientId':data.userId},{'recipientType':'User'}]});
    channel.sendToQueue(
        msgObj.properties.replyTo,
        Buffer.from(JSON.stringify(rides)),
        { correlationId: msgObj.properties.correlationId }
    );
    channel.ack(msgObj);
})