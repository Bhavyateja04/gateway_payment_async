// src/queues/paymentQueue.js
const { Queue } = require('bullmq');

const connection = {
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

const paymentQueue = new Queue('payments', connection);

module.exports = { paymentQueue };
