import { Worker } from 'bullmq';
import { redisConnection } from '../queues/index.js';
import pool from '../config/database.js';
import { createWebhookEvent } from '../services/webhookService.js';

console.log('🟢 Payment worker started');

new Worker(
  'payments',
  async (job) => {
    const { paymentId } = job.data;

    console.log(`⚙️ Processing payment ${paymentId}`);

    try {
      // Fetch payment to determine method and get merchant info
      const paymentRes = await pool.query(
        `SELECT * FROM payments WHERE id = $1`,
        [paymentId]
      );

      if (!paymentRes.rows.length) {
        console.error(`❌ Payment not found: ${paymentId}`);
        return;
      }

      const payment = paymentRes.rows[0];

      // Determine processing delay based on test mode
      let delay;
      if (process.env.TEST_MODE === 'true') {
        delay = parseInt(process.env.TEST_PROCESSING_DELAY || '1000', 10);
      } else {
        delay = 5000 + Math.random() * 5000; // 5-10 seconds
      }

      console.log(`⏳ Processing delay: ${Math.floor(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Determine success based on payment method and test mode
      let success;
      if (process.env.TEST_MODE === 'true') {
        success = process.env.TEST_PAYMENT_SUCCESS !== 'false';
      } else {
        // UPI: 90% success, Card: 95% success
        const successRate = payment.method === 'upi' ? 0.9 : 0.95;
        success = Math.random() < successRate;
      }

      if (success) {
        // ✅ Update payment as success
        await pool.query(
          `
          UPDATE payments
          SET status = 'success',
              updated_at = NOW()
          WHERE id = $1
          `,
          [paymentId]
        );

        // Fetch updated payment
        const updatedPaymentRes = await pool.query(
          `SELECT * FROM payments WHERE id = $1`,
          [paymentId]
        );
        const updatedPayment = updatedPaymentRes.rows[0];

        console.log(`✅ Payment success: ${paymentId}`);

        // 🔔 Emit webhook event
        await createWebhookEvent({
          merchantId: updatedPayment.merchant_id,
          event: 'payment.success',
          payload: {
            event: 'payment.success',
            timestamp: Math.floor(Date.now() / 1000),
            data: {
              payment: updatedPayment
            }
          }
        });

      } else {
        // ❌ Update payment as failed
        await pool.query(
          `
          UPDATE payments
          SET status = 'failed',
              error_code = 'PAYMENT_DECLINED',
              error_description = 'Payment declined by processor',
              updated_at = NOW()
          WHERE id = $1
          `,
          [paymentId]
        );

        // Fetch updated payment
        const updatedPaymentRes = await pool.query(
          `SELECT * FROM payments WHERE id = $1`,
          [paymentId]
        );
        const updatedPayment = updatedPaymentRes.rows[0];

        console.log(`❌ Payment failed: ${paymentId}`);

        // 🔔 Emit webhook event
        await createWebhookEvent({
          merchantId: updatedPayment.merchant_id,
          event: 'payment.failed',
          payload: {
            event: 'payment.failed',
            timestamp: Math.floor(Date.now() / 1000),
            data: {
              payment: updatedPayment
            }
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error processing payment ${paymentId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
);
