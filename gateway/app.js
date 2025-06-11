require('dotenv').config();
const express = require('express');
const expressProxy = require('express-http-proxy');
const rateLimit = require('express-rate-limit');

const app = express();
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 30, // Limit each IP to 10 requests per windowMs
    message: {
        message: 'Too many attempts, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(authLimiter);
app.use('/user', expressProxy(process.env.BASE_URL_USER));
app.use('/captain', expressProxy(process.env.BASE_URL_CAPTAIN));
app.use('/ride', expressProxy(process.env.BASE_URL_RIDE));
app.listen(process.env.GATEWAY_PORT, () => {
    console.log(`Gateway server listening  on port ${process.env.GATEWAY_PORT}`);
});