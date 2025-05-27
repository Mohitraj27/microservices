const captainModel = require('../models/captain.model');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model');

module.exports.register = async(req, res) => {
    try{
        const { name , email, password} = req.body;
        const captain = await captainModel.findOne({email});
        if(captain){
            return res.status(400).json({ message: 'captain already exists'});
        }
        const hash = await bycrypt.hash(password, 10);
        const newcaptain = await captainModel.create({
            name,
            email,
            password: hash
        });
        await newcaptain.save();
        const token = jwt.sign({_id: newcaptain._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        res.cookie('token', token);
        delete newcaptain._doc.password;
        res.send({message: 'captain registered successfully',token, newcaptain});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.login = async(req, res) => {
    try{
        const { email, password } = req.body;
        const captain = await captainModel.findOne({email}).select('+password');
        if(!captain){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const isMatch = await bycrypt.compare(password, captain.password);
        if(!isMatch){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const token = jwt.sign({_id: captain._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        delete captain._doc.password;
        res.cookie('token', token);
        res.send({message: 'captain logged in successfully', token, captain});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.logout = async(req, res) => {
    try{
        const token = req.cookies.token;
        await blacklisttokenModel.create({token});
        res.clearCookie('token');
        res.send({message: 'captain logged out successfully'});
    }catch(error){
        return res.status(500).json({message: error.message})
    }   
}

module.exports.profile = async(req, res) => {
    try{
        res.send(req.captain);
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}

module.exports.toggleAvailability = async(req, res) => {
    try{
        const captain = await captainModel.findById(req.captain._id);
        captain.isAvailable = !captain.isAvailable;
        await captain.save();
        res.send({message: 'Captain availability toggled successfully', captain});
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}