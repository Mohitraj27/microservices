const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    resetPasswordToken: { 
        type: String
    },
    resetPasswordExpires: {
        type: Date 
    },
})

module.exports = mongoose.model('user', userSchema);