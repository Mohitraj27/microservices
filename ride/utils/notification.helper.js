const Notification = require('../models/notification.model'); 

const createRideNotification = async (ride, type, userMessage, captainMessage, title, session) => {
  const notifications = [
    {
      recipientId: ride.user._id,
      recipientType: 'User',
      type,
      title,
      message: userMessage,
      rideId: ride._id,
      pickup: ride.pickup,
      destination: ride.destination,
      estimated_fare: ride.estimated_fare,
      status: ride.status,
      data: {
        captain: ride.captain,
        user: ride.user,
       }
    },
    {
      recipientId: ride.captain._id,
      recipientType: 'Captain',
      type,
      title,
      message: captainMessage,
      rideId: ride._id,
      pickup: ride.pickup,
      destination: ride.destination,
      estimated_fare: ride.estimated_fare,
      status: ride.status,
      data: {
        captain: ride.captain,
        user: ride.user,
      }
    }
  ];

  try {
    return await Notification.insertMany(notifications, { session});
  } catch (error) {
    throw error; 
  }
};

module.exports = { createRideNotification };
