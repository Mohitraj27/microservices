const jwt = require('jsonwebtoken');
const rideModel = require('../models/ride.model');
const axios = require('axios');
const blacklisttokenModel = require('../models/blacklisttoken.model');
module.exports.rideAuth = async(req,res,next)=>{
    try{
        const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];
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