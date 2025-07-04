const express = require('express');
const router = express.Router();
const captainController = require('../controllers/captain.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', captainController.register);
router.post('/login', captainController.login);
router.post('/logout', authMiddleware.captainAuth,captainController.logout);
router.get('/profile',authMiddleware.captainAuth, captainController.profile);
router.patch('/toggle-availability', authMiddleware.captainAuth, captainController.toggleAvailability);
router.get('/new-ride', authMiddleware.captainAuth, captainController.waitForNewRide);
router.get('/notification-ride-update',authMiddleware.captainAuth,captainController.notifyrideUpdate);
router.patch('/change-password', authMiddleware.captainAuth, captainController.changePassword);
router.post('/forgot-password', captainController.forgotPassword);
router.post('/reset-password', captainController.resetPassword);

module.exports = router;
