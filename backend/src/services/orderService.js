import { query } from '../config/database.js';
import { generateId } from './validationService.js';

export const createOrder = async (merchantId, orderData) => {
  const orderId = generateId('order_');
  const { amount, currency = 'INR', receipt, notes = {} } = orderData;

  const result = await query(
    `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'created')
     RETURNING *`,
    [orderId, merchantId, amount, currency, receipt, JSON.stringify(notes)]
  );

  return result.rows[0];
};

export const getOrder = async (orderId, merchantId) => {
  const result = await query(
    `SELECT * FROM orders WHERE id = $1 AND merchant_id = $2`,
    [orderId, merchantId]
  );
  return result.rows[0];
};

export const getOrderPublic = async (orderId) => {
  const result = await query(
    `SELECT id, amount, currency, status FROM orders WHERE id = $1`,
    [orderId]
  );
  return result.rows[0];
};
