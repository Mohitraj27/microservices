const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
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
    channel.consume(queueName, (message) => {
        if (message !== null) {
            callback(message.content.toString());
            channel.ack(message);
        }
    });
}

async function publishToQueue(queueName,data) {
    if(!channel) await connect();
    await channel.assertQueue(queueName);
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
}

async function rpcRequest(queueName, data) {
    if (!channel) await connect();
    const correlationId = uuidv4();
    const replyQueue = await channel.assertQueue('', { exclusive: true });
    const dataPromise = new Promise((resolve, reject) => {
        channel.consume(replyQueue.queue, (msg) => {
            if (msg.properties.correlationId === correlationId) {
                resolve(JSON.parse(msg.content.toString()));
            }
        }, { noAck: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
            correlationId,
            replyTo: replyQueue.queue
        });
    });
    return dataPromise;
}
module.exports = { subscribeToQueue, publishToQueue, connect ,rpcRequest};
