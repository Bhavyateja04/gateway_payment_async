import { Worker } from 'bullmq';
import crypto from 'crypto';
import { redisConnection, webhookQueue } from '../queues/index.js';
import pool from '../config/database.js';

console.log('🟢 Webhook worker started');

// Production retry delays (in seconds)
const PROD_RETRY_DELAYS = [0, 60, 300, 1800, 7200]; // 0s, 1m, 5m, 30m, 2h

// Test retry delays (in seconds)
const TEST_RETRY_DELAYS = [0, 5, 10, 15, 20]; // 0s, 5s, 10s, 15s, 20s

function getRetryDelays() {
  return process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true' 
    ? TEST_RETRY_DELAYS 
    : PROD_RETRY_DELAYS;
}

new Worker(
  'webhooks',
  async (job) => {
    const { webhookLogId } = job.data;

    try {
      const { rows } = await pool.query(
        `SELECT * FROM webhook_logs WHERE id = $1`,
        [webhookLogId]
      );
      if (!rows.length) {
        console.log(`⚠️ Webhook log not found: ${webhookLogId}`);
        return;
      }

      const webhook = rows[0];
      const RETRY_DELAYS = getRetryDelays();

      // Max attempts reached → permanently fail
      if (webhook.attempts >= 5) {
        await pool.query(
          `UPDATE webhook_logs
           SET status='failed'
           WHERE id=$1`,
          [webhook.id]
        );
        console.log(`❌ Webhook permanently failed after 5 attempts: ${webhook.id}`);
        return;
      }

      const merchantRes = await pool.query(
        `SELECT webhook_url, webhook_secret FROM merchants WHERE id=$1`,
        [webhook.merchant_id]
      );
      const merchant = merchantRes.rows[0];
      
      // Skip if merchant doesn't have webhook URL configured
      if (!merchant?.webhook_url) {
        console.log(`⚠️ Merchant webhook URL not configured: ${webhook.merchant_id}`);
        return;
      }

      const payload = JSON.stringify(webhook.payload);

      const signature = crypto
        .createHmac('sha256', merchant.webhook_secret || '')
        .update(payload)
        .digest('hex');

      try {
        console.log(`📤 Attempting to deliver webhook ${webhook.id} (attempt ${webhook.attempts + 1}/5)`);
        
        const res = await fetch(merchant.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature
          },
          body: payload,
          timeout: 5000
        });

        // Success (HTTP 200-299)
        if (res.status >= 200 && res.status < 300) {
          const responseBody = await res.text();
          await pool.query(
            `UPDATE webhook_logs
             SET status='success',
                 attempts=attempts+1,
                 last_attempt_at=NOW(),
                 response_code=$1,
                 response_body=$2
             WHERE id=$3`,
            [res.status, responseBody, webhook.id]
          );
          console.log(`✅ Webhook delivered successfully: ${webhook.id}`);
          return;
        }

        // Non-success HTTP response
        throw new Error(`HTTP ${res.status}`);

      } catch (err) {
        console.log(`⚠️ Webhook delivery failed: ${webhook.id} - ${err.message}`);
        
        const nextAttemptNumber = webhook.attempts + 1;
        const nextRetryDelay = RETRY_DELAYS[nextAttemptNumber];

        if (nextAttemptNumber < 5) {
          // Schedule retry
          const nextRetryAt = new Date(Date.now() + nextRetryDelay * 1000);
          
          await pool.query(
            `UPDATE webhook_logs
             SET attempts=$1,
                 last_attempt_at=NOW(),
                 next_retry_at=$2,
                 status='pending'
             WHERE id=$3`,
            [nextAttemptNumber, nextRetryAt, webhook.id]
          );

          console.log(`⏳ Scheduling retry for webhook ${webhook.id} in ${nextRetryDelay}s`);

          // Re-enqueue webhook with delay
          await webhookQueue.add(
            'deliver_webhook',
            { webhookLogId },
            { delay: nextRetryDelay * 1000 }
          );
        } else {
          // Final failure
          await pool.query(
            `UPDATE webhook_logs
             SET attempts=$1,
                 last_attempt_at=NOW(),
                 status='failed'
             WHERE id=$2`,
            [nextAttemptNumber, webhook.id]
          );
          console.log(`❌ Webhook failed permanently after max attempts: ${webhook.id}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing webhook job:`, error);
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 5
  }
);
