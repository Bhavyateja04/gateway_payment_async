// backend/src/queues.js
import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

export const paymentQueue = new Bull('payments', REDIS_URL);
export const webhookQueue = new Bull('webhooks', REDIS_URL);
export const refundQueue = new Bull('refunds', REDIS_URL);
