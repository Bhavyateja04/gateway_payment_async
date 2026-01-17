import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

export const paymentQueue = new Queue('payments', {
  connection: redisConnection
});

export const webhookQueue = new Queue('webhooks', {
  connection: redisConnection
});

export const refundQueue = new Queue('refunds', {
  connection: redisConnection
});
