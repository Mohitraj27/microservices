const captainModel = require('../models/captain.model');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model');
const { subscribeToQueue ,publishToQueue} = require('../service/rabbit');
const { rpcRequest } = require('../service/rabbit');
const { executeWithTransaction } = require('../utils/dbTranscation.helper');
const { indexDocument } = require('../utils/elasticSearch.helper');
const pendingRequests = [];
const validateCredentials = async (email, password) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Invalid email address' };
    }

    if (!passwordRegex.test(password)) {
        return { valid: false, message: 'Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, and one special character' };
    }

    return { valid: true };
};

module.exports.register = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
            const { name , email, password} = req.body;
            if(!email || !password){
                return res.status(400).json({ message: 'Email or Password is a required field' });
            }
            const validation = await validateCredentials(email, password);
            if (!validation.valid) {
                return res.status(400).json({ message: validation.message });
            }
            const captain = await captainModel.findOne({email}).session(session);
            if(captain){
                return res.status(400).json({ message: 'captain already exists'});
            }
            const hash = await bycrypt.hash(password, 10);
            const newcaptain = await captainModel.create([{
                name,
                email,
                password: hash
            }], {session});
            const token = jwt.sign({_id: newcaptain[0]._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
            res.cookie('captain_auth_token', token);
            delete newcaptain[0]._doc.password;
            await indexDocument("captains", newcaptain[0]._id, {
                name: newcaptain[0].name,
                email: newcaptain[0].email,
                indexedAt: new Date(),
              });
            res.send({message: 'captain registered successfully!',token, newcaptain: newcaptain[0]});
        });
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.login = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
            const { email, password } = req.body;
            const captain = await captainModel.findOne({email}).session(session).select('+password');
            if(!captain){
                return res.status(400).json({message:'Captain does not exist'});
            }
            const isMatch = await bycrypt.compare(password, captain.password);
            if(!isMatch){
                return res.status(400).json({message:'Incorrect Password'});
            }
            const token = jwt.sign({_id: captain._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
            delete captain._doc.password;
            res.cookie('captain_auth_token', token);
            res.send({message: 'captain logged in successfully', token, captain});
        });
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.logout = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
        const token = req.cookies.captain_auth_token;
        await blacklisttokenModel.create([{token: token}], {session});
        res.clearCookie('captain_auth_token');
        res.send({message: 'captain logged out successfully'});
        })
    }catch(error){
        return res.status(500).json({message: error.message})
    }   
}

module.exports.profile = async(req, res) => {
    try{
        const captainId = req.captain._id;
        let rides = await rpcRequest('get-captain-rides', { captainId });
        rides = Array.isArray(rides) ? rides : [];
        const captain = req.captain.toObject ? req.captain.toObject() : req.captain;
        const response = {
          _id: captain._id,
          name: captain.name,
          email: captain.email,
          totalRides: rides.length,
          message: rides?.length ? 'Your rides history fetched successfully': 'No rides found',
          rides: rides?.map(ride => ({
            _id: ride._id,
            pickup: ride.pickup,
            destination: ride.destination,
            status: ride.status,
            user: ride.user,
            estimated_fare: ride.estimated_fare,
            createdAt: ride.createdAt,
            updatedAt: ride.updatedAt
          }))
        };
        return res.status(200).json(response);
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}

module.exports.toggleAvailability = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
        const captain = await captainModel.findById(req.captain._id).session(session);
        captain.isAvailable = !captain.isAvailable;
        await captain.save({ session });
        res.send({message: 'Captain availability toggled successfully', captain});
        })
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}
module.exports.waitForNewRide = async(req, res) => {
    // Set a timeout for long pooling (30 seconds)
    req.setTimeout(30000,() => {
        res.status(204).json({message: 'No new ride found'}).end();
    });
    pendingRequests.push(res);
}
module.exports.notifyrideUpdate = async(req,res)=>{
    try{
        const captainId = req.captain._id;
        let ridesNotification = await rpcRequest('notify-captain', { captainId });
        ridesNotification = Array.isArray(ridesNotification) ? ridesNotification : [];
        const response = {
            captainId: captainId,
            email: req.captain.email,
            totalNotifications: ridesNotification.length,
            message: ridesNotification?.length ? `${req.captain.name}, Your notifications fetched successfully`: `${req.captain.name}, No notifications found`,
            notifications: ridesNotification?.map(notification => ({
                notificationId: notification._id,
                rideId: notification.rideId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                pickup: notification.pickup,
                destination: notification.destination,
                status: notification.status,
                estimated_fare: notification.estimated_fare,
                recipientType: notification.recipientType,
                data: {
                    captain: notification.data?.captain,
                    user: notification.data?.user
                },
                createdAt: notification.createdAt,
                updatedAt: notification.updatedAt
            }))
        };
        return res.status(200).json(response);
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}
subscribeToQueue("new-ride", async (data) => {
    try {
        let rideData = JSON.parse(data);
        if (typeof rideData === 'string') {
            rideData = JSON.parse(rideData);
        }
        pendingRequests.forEach((res) => {
            if (!res.headersSent) {
                res.status(200).json({ message: 'New ride found', ride: rideData});
            }
        });
        
        pendingRequests.length = 0;
    } catch (error) {
        pendingRequests.forEach((res) => {
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to processing ride data'});
            }
        });
        pendingRequests.length = 0;
    }
})