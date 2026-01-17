import { Worker } from 'bullmq';
import { redisConnection } from '../queues/index.js';
import pool from '../config/database.js';
import { createWebhookEvent } from '../services/webhookService.js';

console.log('🟢 Refund worker started');

new Worker(
  'refunds',
  async (job) => {
    const { refundId } = job.data;

    console.log(`⚙️ Processing refund ${refundId}`);

    try {
      // Fetch refund record
      const refundRes = await pool.query(
        `SELECT * FROM refunds WHERE id = $1`,
        [refundId]
      );

      if (!refundRes.rows.length) {
        console.error(`❌ Refund not found: ${refundId}`);
        return;
      }

      const refund = refundRes.rows[0];

      // Fetch associated payment
      const paymentRes = await pool.query(
        `SELECT * FROM payments WHERE id = $1`,
        [refund.payment_id]
      );

      if (!paymentRes.rows.length) {
        console.error(`❌ Payment not found for refund: ${refundId}`);
        return;
      }

      const payment = paymentRes.rows[0];

      // Verify payment is in refundable state (must be 'success')
      if (payment.status !== 'success') {
        console.error(`❌ Payment not in refundable state: ${payment.id}`);
        throw new Error('Payment not in success state');
      }

      // Verify total refunded amount doesn't exceed payment amount
      const totalRefundedRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM refunds
         WHERE payment_id = $1 AND (status = 'processed' OR status = 'pending')`,
        [refund.payment_id]
      );

      const totalRefunded = parseInt(totalRefundedRes.rows[0].total, 10);
      if (totalRefunded > payment.amount) {
        console.error(`❌ Total refunded exceeds payment amount: ${refundId}`);
        throw new Error('Refund amount exceeds available amount');
      }

      // Simulate refund processing delay (3-5 seconds)
      const delay = 3000 + Math.random() * 2000;
      console.log(`⏳ Processing delay: ${Math.floor(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Update refund status to processed
      const now = new Date();
      await pool.query(
        `UPDATE refunds
         SET status = 'processed',
             processed_at = $1
         WHERE id = $2`,
        [now, refundId]
      );

      console.log(`✅ Refund processed: ${refundId}`);

      // Emit webhook event
      const updatedRefundRes = await pool.query(
        `SELECT * FROM refunds WHERE id = $1`,
        [refundId]
      );
      const updatedRefund = updatedRefundRes.rows[0];

      await createWebhookEvent({
        merchantId: refund.merchant_id,
        event: 'refund.processed',
        payload: {
          event: 'refund.processed',
          timestamp: Math.floor(Date.now() / 1000),
          data: {
            refund: updatedRefund
          }
        }
      });

    } catch (error) {
      console.error(`❌ Error processing refund ${refundId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
);
