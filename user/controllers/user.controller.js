require('dotenv').config();
const userModel = require('../models/user.model');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model');
const { subscribeToQueue } = require('../../captain/service/rabbit');
const { rpcRequest } = require('../service/rabbit')
const {executeWithTransaction} = require('../utils/dbTranscation.helper');
const { indexDocument } = require('../utils/elasticSearch.helper');
const crypto = require('crypto');
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
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
        await executeWithTransaction(async (session) => {
            const { name , email, password} = req.body;
            if(!email || !password){
                return res.status(400).json({ error: 'Email or Password is a required field' });
            }
            const validation = await validateCredentials(email, password);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.message });
            }
            const user = await userModel.findOne({email}).session(session);
            if(user){
                return res.status(400).json({ error: 'User already exists'});
            }
            const hash = await bycrypt.hash(password, SALT_ROUNDS);
            const newUser = await userModel.create([{
                name: name,
                email: email,
                password: hash
            }], {session});
            const token = jwt.sign({_id: newUser[0]._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
            res.cookie('user_auth_token', token);
            delete newUser[0]._doc.password;
            await indexDocument("users", newUser[0]._id, {
                name: newUser[0].name,
                email: newUser[0].email,
                indexedAt: new Date(),
              });
            res.send({message: 'User registered successfully',token, user: newUser[0]});
        })
    }catch(err){
        return res.status(500).json({error: err.message})
    }   
}

module.exports.login = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
            const { email, password } = req.body;
            if(!email || !password){
                return res.status(400).json({ error: 'Email or Password is a required field' });
            }
            const user = await userModel.findOne({ email }).session(session).select('+password');
            if(!user){
                return res.status(400).json({error:'User does not exist'});
            }
            const isMatch = await bycrypt.compare(password, user.password);
            if(!isMatch){
                return res.status(400).json({error:'Incorrect Password'});
            }
            const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
            delete user._doc.password;
            res.cookie('user_auth_token', token);
            res.send({message: 'User logged in successfully', token, user});
        });
    }catch(err){
        return res.status(500).json({error: err.message})
    }   
}

module.exports.logout = async(req, res) => {
    try{
        await executeWithTransaction(async (session) => {
        const token = req.cookies.user_auth_token;
        await blacklisttokenModel.create([{token: token}], {session});
        res.clearCookie('user_auth_token');
        res.send({message: 'User logged out successfully'});
        });
    }catch(error){
        return res.status(500).json({error: error.message})
    }   
}

module.exports.profile = async(req, res) => {
    try {
        const userId = req.user._id;
        let rides = await rpcRequest('get-user-rides', { userId });
        rides = Array.isArray(rides) ? rides : [];
        const user = req.user.toObject ? req.user.toObject() : req.user;
        const response = {
          _id: user._id,
          name: user.name,
          email: user.email,
          totalRides: rides.length,
          message: rides?.length ? 'Your rides history fetched successfully': 'No rides found',
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
        return res.status(500).json({ error: error.message });
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

module.exports.notifyrideUpdate = async (req, res) => {
    try{
        const userId = req.user._id;
        let ridesNotification = await rpcRequest('notify-user', { userId });
        ridesNotification = Array.isArray(ridesNotification) ? ridesNotification : [];
        const response = {
            userId: userId,
            email: req.user.email,
            totalNotifications: ridesNotification.length,
            message: ridesNotification?.length ? `${req.user.name}, Your notifications fetched successfully`: `${req.user.name}, No notifications found`,
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
        return res.status(500).json({error: error.message})
    }
}
module.exports.changePassword = async (req, res) => {
    try {
        await executeWithTransaction(async (session) => {
            const userId = req.user._id;
            
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                throw new Error('Both old and new passwords are required.');
            }
            const user = await userModel.findById(userId).select('+password').session(session);
            if (!user) throw new Error('User not found.');
            
            const [isOldPasswordValid, isNewPasswordSame] = await Promise.all([
                bycrypt.compare(oldPassword, user.password),
                bycrypt.compare(newPassword, user.password),
            ]);

            if (!isOldPasswordValid) throw new Error('Old password is incorrect.');
            if (isNewPasswordSame) throw new Error('New password must be different from the old one.');

            const validation = await validateCredentials(user.email, newPassword);
            if (!validation.valid) throw new Error(validation.message);
            
            user.password = await bycrypt.hash(newPassword, SALT_ROUNDS);
           
            await user.save({ session });
           
            res.clearCookie('user_auth_token');
            
            res.status(200).json({ message: 'Password changed successfully. Please log in again.' });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
module.exports.forgotPassword = async (req, res) => {
    try {
        await executeWithTransaction(async (session) => {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email is required.' });
            }
            const user = await userModel.findOne({ email: email }).session(session);
            if (!user) {
              return res.status(404).json({ error: 'User not found.' });
            }
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
          
            user.resetPasswordToken = hashedToken;
            user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
            await user.save({ session });
          
          
            res.status(200).json({ message: 'Reset link sent to email if it exists.',resetToken: resetToken });
        });
    } catch(err){
        res.status(500).json({ error: err.message });
    }
};
module.exports.resetPassword = async (req, res) => {
    try{
        await executeWithTransaction(async (session) => {

            const { token, newPassword, confirmNewPassword } = req.body;
            if (!token || !newPassword || !confirmNewPassword) {
                return res.status(400).json({ error: 'Required fields token, newPassword or confirmNewPassword are missing' });
            }
            if(newPassword !== confirmNewPassword){
                throw new Error('newPassword and confirmNewPassword should match with each other');
            }
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            const user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            }).session(session).select('+password');
        
            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired token' });
            }
        
            const validation = await validateCredentials(user.email, newPassword);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.message });
            }
        
            const hashedPassword = await bycrypt.hash(newPassword, parseInt(process.env.SALT_ROUNDS));
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ session });
        
            res.status(200).json({ message: 'Password has been reset successfully, Please login to continue ' });
        
        })
    }catch(err){
        res.status(500).json({ error: err.message });
    }
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