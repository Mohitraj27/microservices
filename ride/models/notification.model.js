const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientType'
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['User', 'Captain']
  },
  type: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
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
  status: {
    type: String,
    enum: [ 'accepted', 'started', 'rejected', 'completed'],
    default: 'requested'
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  data: {
    captain: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      }
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('notification', notificationSchema);
