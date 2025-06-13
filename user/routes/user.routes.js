const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', authMiddleware.userAuth,userController.logout);
router.get('/profile',authMiddleware.userAuth, userController.profile);
router.get('/ride-current-update', authMiddleware.userAuth, userController.rideCurrentUpdate);
router.get('/notification-ride-update',authMiddleware.userAuth,userController.notifyrideUpdate);
router.patch('/change-password',authMiddleware.userAuth, userController.changePassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

module.exports = router;
