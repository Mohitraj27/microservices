const userModel = require('../models/user.model');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model');

module.exports.register = async(req, res) => {
    try{
        const { name , email, password} = req.body;
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
        res.cookie('token', token);
        delete newUser._doc.password;
        res.send({message: 'User registered successfully',token, newUser});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.login = async(req, res) => {
    try{
        const { email, password } = req.body;
        const user = await userModel.findOne({email}).select('+password');
        if(!user){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const isMatch = await bycrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        delete user._doc.password;
        res.cookie('token', token);
        res.send({message: 'User logged in successfully', token, user});
    }catch(err){
        return res.status(500).json({message: err.message})
    }   
}

module.exports.logout = async(req, res) => {
    try{
        const token = req.cookies.token;
        await blacklisttokenModel.create({token});
        res.clearCookie('token');
        res.send({message: 'User logged out successfully'});
    }catch(error){
        return res.status(500).json({message: error.message})
    }   
}

module.exports.profile = async(req, res) => {
    try{
        res.send(req.user);
    }catch(error){
        return res.status(500).json({message: error.message})
    }
}