const userModel = require('../models/user.model');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model');
const { subscribeToQueue } = require('../../captain/service/rabbit');
const { rpcRequest } = require('../service/rabbit')
const EventEmitter = require('events');
const rideEventEmitter = new EventEmitter();
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
        const { name , email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({ message: 'Email or Password is a required field' });
        }
        const validation = await validateCredentials(email, password);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }
        const user = await userModel.findOne({email});
        if(user){
            return res.status(400).json({ message: 'User already exists'});
        }
        const hash = await bycrypt.hash(password, 10);
        const newUser = await userModel.create({
            name,
            email,
            password: hash
        });
        await newUser.save();
        const token = jwt.sign({_id: newUser._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        res.cookie('user_auth_token', token);
        delete newUser._doc.password;
        res.send({message: 'User registered successfully',token, newUser});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.login = async(req, res) => {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({ message: 'Email or Password is a required field' });
        }
        const user = await userModel.findOne({email}).select('+password');
        if(!user){
            return res.status(400).json({message:'User does not exist'});
        }
        const isMatch = await bycrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message:'Incorrect Password'});
        }
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        delete user._doc.password;
        res.cookie('user_auth_token', token);
        res.send({message: 'User logged in successfully', token, user});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.logout = async(req, res) => {
    try{
        const token = req.cookies.user_auth_token;
        await blacklisttokenModel.create({token: token});
        res.clearCookie('user_auth_token');
        res.send({message: 'User logged out successfully'});
    }catch(error){
        return res.status(500).json({message: error.message})
    }   
}

module.exports.profile = async(req, res) => {
    try {
        const userId = req.user._id;
        const rides = await rpcRequest('get-user-rides', { userId });
        const user = req.user.toObject ? req.user.toObject() : req.user;
        const response = {
          _id: user._id,
          name: user.name,
          email: user.email,
          message: 'Your rides history fetched successfully',
          rides: rides?.map(ride => ({
            _id: ride._id,
            pickup: ride.pickup,
            destination: ride.destination,
            captain: ride.captain,
            status: ride.status,
            estimated_fare: ride.estimated_fare,
            createdAt: ride.createdAt,
            updatedAt: ride.updatedAt
          }))
        };
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
module.exports.rideCurrentUpdate = async (req, res) => {
    let responded = false;

    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            res.status(204).json({ message: 'No new ride found' });
        }
    }, 30000);

    rideEventEmitter.once('ride-accepted', (ride) => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout); 
            res.send({ message: 'Captain accepted the ride', ride: ride });
        }
    });
    rideEventEmitter.once('ride-started', (ride) => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            res.send({ message: 'Captain started the ride', ride: ride });
        }
    })
    rideEventEmitter.once('ride-rejected', (ride) => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            res.send({ message: 'Captain rejected the ride', ride: ride });
        }
    });
    rideEventEmitter.once('ride-completed', (ride) => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            res.send({ message: 'Captain completed the ride', ride: ride });
        }
    });
};

subscribeToQueue('ride-accepted', (message) => {
    let data = JSON.parse(message);
    if(typeof data === 'string'){
        data = JSON.parse(data);
    }
    rideEventEmitter.emit('ride-accepted', data);
});
subscribeToQueue('ride-started', (message) => {
    let data = JSON.parse(message);
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    rideEventEmitter.emit('ride-started', data);
});
subscribeToQueue('ride-completed', (message) => {
    let data = JSON.parse(message);
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    rideEventEmitter.emit('ride-completed', data);
});
subscribeToQueue('ride-rejected', (message) => {
    let data = JSON.parse(message);
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    rideEventEmitter.emit('ride-rejected', data);
});