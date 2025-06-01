require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);

server.listen(process.env.USER_SERVICE_PORT,() => {
    console.log(`User service is  running on port ${process.env.USER_SERVICE_PORT}`);
});