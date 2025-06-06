const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
   captain:{
    _id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
   },
   user: {
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      }
   },
   pickup: {
    type: String,
    required: true
   },
   destination: {
    type: String,
    required: true
   },
   estimated_fare: {
    type: Number,
    required: true
   },
   status : {
    type: String,
    enum: ['requested', 'accepted','started', 'rejected', 'completed'],
    default: 'requested',
   }
},{
    timestamps: true
});

module.exports = mongoose.model('ride', rideSchema);