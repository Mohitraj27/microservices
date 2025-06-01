require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);

server.listen(process.env.RIDE_SERVICE_PORT,() => {
    console.log(`Ride service is  running on port ${process.env.RIDE_SERVICE_PORT}`);
});