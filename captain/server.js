require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);

server.listen(process.env.CAPTAIN_SERVICE_PORT,() => {
    console.log(`Captain service is running on port ${process.env.CAPTAIN_SERVICE_PORT}`);
});