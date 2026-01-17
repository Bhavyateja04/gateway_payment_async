import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique refund ID with format "rfnd_" + 16 alphanumeric chars
 */
export function generateRefundId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'rfnd_';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Create a refund for a payment
 */
export async function createRefund({
  paymentId,
  merchantId,
  amount,
  reason
}) {
  // Verify payment exists and belongs to merchant
  const paymentRes = await pool.query(
    `SELECT * FROM payments WHERE id = $1 AND merchant_id = $2`,
    [paymentId, merchantId]
  );

  if (!paymentRes.rows.length) {
    return { error: 'Payment not found or does not belong to merchant' };
  }

  const payment = paymentRes.rows[0];

  // Verify payment is in success state
  if (payment.status !== 'success') {
    return { error: 'Payment not in refundable state' };
  }

  // Calculate total already refunded
  const totalRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM refunds
     WHERE payment_id = $1 AND (status = 'processed' OR status = 'pending')`,
    [paymentId]
  );

  const totalRefunded = parseInt(totalRes.rows[0].total, 10);
  const availableAmount = payment.amount - totalRefunded;

  // Validate refund amount
  if (amount > availableAmount) {
    return { error: 'Refund amount exceeds available amount' };
  }

  // Generate unique refund ID
  let refundId;
  let unique = false;
  while (!unique) {
    refundId = generateRefundId();
    const checkRes = await pool.query(
      `SELECT id FROM refunds WHERE id = $1`,
      [refundId]
    );
    unique = checkRes.rows.length === 0;
  }

  // Create refund record
  const createRes = await pool.query(
    `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING *`,
    [refundId, paymentId, merchantId, amount, reason || null]
  );

  return createRes.rows[0];
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId, merchantId) {
  const res = await pool.query(
    `SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2`,
    [refundId, merchantId]
  );
  return res.rows[0] || null;
}

/**
 * Get refunds for a payment
 */
export async function getRefundsForPayment(paymentId) {
  const res = await pool.query(
    `SELECT * FROM refunds WHERE payment_id = $1 ORDER BY created_at DESC`,
    [paymentId]
  );
  return res.rows;
}
