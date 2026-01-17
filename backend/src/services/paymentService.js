import { query } from '../config/database.js';
import { generateId } from './validationService.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const createPayment = async (merchantId, paymentData) => {
  const paymentId = generateId('pay_');
  const { order_id, method, amount, currency = 'INR', vpa, card_network, card_last4 } = paymentData;

  const result = await query(
    `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, $8, $9)
     RETURNING *`,
    [paymentId, order_id, merchantId, amount, currency, method, vpa, card_network, card_last4]
  );

  return result.rows[0];
};

export const processPayment = async (paymentId, method) => {
  const testMode = process.env.TEST_MODE === 'true';
  
  // Delay
  if (testMode) {
    const delay = parseInt(process.env.TEST_PROCESSING_DELAY || '1000');
    await sleep(delay);
  } else {
    const min = parseInt(process.env.PROCESSING_DELAY_MIN || '5000');
    const max = parseInt(process.env.PROCESSING_DELAY_MAX || '10000');
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await sleep(delay);
  }

  // Determine success
  let isSuccess;
  if (testMode) {
    isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
  } else {
    const successRate = method === 'upi' 
      ? parseFloat(process.env.UPI_SUCCESS_RATE || '0.90')
      : parseFloat(process.env.CARD_SUCCESS_RATE || '0.95');
    isSuccess = Math.random() < successRate;
  }

  // Update payment
  if (isSuccess) {
    await query(
      `UPDATE payments SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [paymentId]
    );
  } else {
    await query(
      `UPDATE payments SET status = 'failed', error_code = 'PAYMENT_FAILED', 
       error_description = 'Payment processing failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [paymentId]
    );
  }

  const result = await query(`SELECT * FROM payments WHERE id = $1`, [paymentId]);
  return result.rows[0];
};

export const getPayment = async (paymentId, merchantId) => {
  const result = await query(
    `SELECT * FROM payments WHERE id = $1 AND merchant_id = $2`,
    [paymentId, merchantId]
  );
  return result.rows[0];
};
