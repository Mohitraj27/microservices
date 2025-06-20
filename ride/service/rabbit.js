const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL;

let connection, channel;
async function connect() {
    console.log('connecting to RabbitMQ');
     connection = await amqp.connect(RABBITMQ_URL);
     channel = await connection.createChannel();
     console.log('connected to RabbitMQ');
}

async function subscribeToQueue(queueName, callback) {
    if(!channel) await connect();
    await channel.assertQueue(queueName);
    channel.consume(queueName, (msg) => {
        if (msg !== null) {
            const msgContent = msg.content.toString();
            callback(msgContent, channel, msg); 
        }
    });
}

async function publishToQueue(queueName,data) {
    if(!channel) await connect();
    await channel.assertQueue(queueName);
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
}

module.exports = { subscribeToQueue, publishToQueue, connect };
