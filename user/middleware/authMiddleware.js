const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const blacklisttokenModel = require('../models/blacklisttoken.model');
module.exports.userAuth = async(req,res,next)=>{
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
        const user = await userModel.findById(decoded._id);
        if(!user){
            return res.status(401).json({message: 'Unauthorized'});
        }
        req.user = user;
        next();
    }catch(err){
        return res.status(500).json({message: err.message})
    }
}