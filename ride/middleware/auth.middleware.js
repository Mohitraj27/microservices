const jwt = require('jsonwebtoken');
const rideModel = require('../models/ride.model');
const axios = require('axios');
const blacklisttokenModel = require('../models/blacklisttoken.model');
module.exports.rideAuth = async(req,res,next)=>{
    try{
        const token = req.cookies?.user_auth_token || req.headers?.authorization?.split(' ')[ 1 ];
        if(!token){
            return res.status(401).json({message: 'Unauthorized'});
        }
     
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const response = await axios.get(`${process.env.BASE_URL}/user/profile`,{
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const user = response.data;
        if(!user){
            return res.status(401).json({message: 'Unauthorized'});
        }
        req.user = user;
        next();
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}
module.exports.captainAuth = async(req,res,next)=>{
    try{
        const token = req.cookies.captain_auth_token || req.headers?.authorization?.split(' ')[ 1 ];
        if(!token){
            return res.status(401).json({message: 'Unauthorized'});
        }
        const isBlacklisted = await blacklisttokenModel.find({token});
        if(isBlacklisted?.length > 0){
            return res.status(401).json({message: 'JWT Token Expired'});
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const response = await axios.get(`${process.env.BASE_URL}/captain/profile`,{
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const captain = response.data;
        if(!captain){
            return res.status(401).json({message: 'Unauthorized'});
        }
        req.captain = captain;
        next();
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}