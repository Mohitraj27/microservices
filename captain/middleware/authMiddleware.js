const jwt = require('jsonwebtoken');
const captainModel = require('../models/captain.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');
module.exports.captainAuth = async(req,res,next)=>{
    try{
        const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];
        if(!token){
            return res.status(401).json({message: 'Unauthorized'});
        }
        const isBlacklisted = await blacklisttokenModel.find({token});
        if(isBlacklisted?.length > 0){
            return res.status(401).json({message: 'JWT Token Expired'});
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const captain = await captainModel.findById(decoded._id);
        if(!captain){
            return res.status(401).json({message: 'Unauthorized'});
        }
        req.captain = captain;
        next();
    }catch(err){
        return res.status(500).json({message: err.message})
    }
}