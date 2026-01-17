// src/worker.js
const { Worker } = require('bullmq');
const { Pool } = require('pg');

const connection = {
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// For now just log; in next step you'll implement full ProcessPaymentJob
const paymentWorker = new Worker(
  'payments',
  async job => {
    console.log('Processing payment job', job.id, job.data);
    // placeholder – will do real processing later
  },
  connection
);

paymentWorker.on('completed', job => {
  console.log('Payment job completed', job.id);
});

paymentWorker.on('failed', (job, err) => {
  console.error('Payment job failed', job && job.id, err);
});

process.on('SIGTERM', async () => {
  await paymentWorker.close();
  await pool.end();
  process.exit(0);
});
