import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { webhookQueue } from '../queues/index.js';
import pool from '../config/database.js';

/**
 * Create a webhook event and enqueue for delivery
 */
export async function createWebhookEvent({ merchantId, event, payload }) {
  const webhookLogId = uuidv4();

  // Insert webhook log
  await pool.query(
    `
    INSERT INTO webhook_logs (
      id,
      merchant_id,
      event,
      payload,
      status,
      attempts,
      created_at
    )
    VALUES ($1, $2, $3, $4, 'pending', 0, NOW())
    `,
    [
      webhookLogId,
      merchantId,
      event,
      JSON.stringify(payload)
    ]
  );

  // Enqueue delivery job
  await webhookQueue.add(
    'deliver_webhook',
    { webhookLogId },
    {
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  return webhookLogId;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(payload, secret) {
  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);

  return crypto
    .createHmac('sha256', secret || '')
    .update(payloadString)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return signature === expectedSignature;
}

/**
 * Get webhook logs for a merchant
 */
export async function getWebhookLogs(merchantId, limit = 10, offset = 0) {
  const countRes = await pool.query(
    `SELECT COUNT(*) as total FROM webhook_logs WHERE merchant_id = $1`,
    [merchantId]
  );

  const logsRes = await pool.query(
    `SELECT * FROM webhook_logs 
     WHERE merchant_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [merchantId, limit, offset]
  );

  return {
    data: logsRes.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset
  };
}

/**
 * Retry webhook delivery
 */
export async function retryWebhook(webhookId, merchantId) {
  // Fetch webhook and verify it belongs to merchant
  const res = await pool.query(
    `SELECT * FROM webhook_logs WHERE id = $1 AND merchant_id = $2`,
    [webhookId, merchantId]
  );

  if (!res.rows.length) {
    throw new Error('Webhook not found');
  }

  // Reset for retry
  await pool.query(
    `UPDATE webhook_logs 
     SET attempts = 0, status = 'pending', next_retry_at = NULL
     WHERE id = $1`,
    [webhookId]
  );

  // Enqueue delivery job
  await webhookQueue.add(
    'deliver_webhook',
    { webhookLogId: webhookId },
    {
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  return true;
}

/**
 * Get webhook configuration for a merchant
 */
export async function getMerchantWebhookConfig(merchantId) {
  const res = await pool.query(
    `SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1`,
    [merchantId]
  );
  return res.rows[0] || null;
}

/**
 * Update webhook configuration for a merchant
 */
export async function updateMerchantWebhookConfig(merchantId, webhookUrl, webhookSecret = null) {
  const secret = webhookSecret || generateWebhookSecret();
  
  const res = await pool.query(
    `UPDATE merchants 
     SET webhook_url = $1, webhook_secret = $2
     WHERE id = $3
     RETURNING webhook_url, webhook_secret`,
    [webhookUrl, secret, merchantId]
  );

  return res.rows[0];
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret() {
  return 'whsec_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Regenerate webhook secret for a merchant
 */
export async function regenerateWebhookSecret(merchantId) {
  const secret = generateWebhookSecret();
  
  const res = await pool.query(
    `UPDATE merchants 
     SET webhook_secret = $1
     WHERE id = $2
     RETURNING webhook_secret`,
    [secret, merchantId]
  );

  return res.rows[0]?.webhook_secret;}