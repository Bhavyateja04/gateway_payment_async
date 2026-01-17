import { createPayment, getPayment } from '../services/paymentService.js';
import { getOrder } from '../services/orderService.js';
import {
  validateVPA,
  luhnCheck,
  detectCardNetwork,
  validateExpiry,
} from '../services/validationService.js';
import { paymentQueue, webhookQueue, refundQueue } from '../queues/index.js';
import { createRefund, getRefund } from '../services/refundService.js';
import { getWebhookLogs, retryWebhook } from '../services/webhookService.js';
import pool from '../config/database.js';


/* ================================
   AUTHENTICATED CREATE PAYMENT
================================ */

export const createPaymentHandler = async (req, res) => {
  try {
    const { order_id, method, vpa, card } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    /* ================================
       IDEMPOTENCY CHECK (FIRST)
    ================================ */
    if (idempotencyKey) {
      const existing = await pool.query(
        `SELECT response
         FROM idempotency_keys
         WHERE key = $1
           AND merchant_id = $2
           AND expires_at > NOW()`,
        [idempotencyKey, req.merchantId]
      );

      if (existing.rows.length > 0) {
        return res.status(201).json(existing.rows[0].response);
      }
    }

    /* ================================
       FETCH ORDER
    ================================ */
    const order = await getOrder(order_id, req.merchantId);
    if (!order) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found',
        },
      });
    }

    /* ================================
       BUILD PAYMENT DATA
    ================================ */
    let paymentData = {
      order_id,
      method,
      amount: order.amount,
      currency: order.currency,
      status: 'pending',
    };

    if (method === 'upi') {
      if (!vpa || !validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format',
          },
        });
      }
      paymentData.vpa = vpa;
    } else if (method === 'card') {
      if (!card || !luhnCheck(card.number)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CARD',
            description: 'Invalid card number',
          },
        });
      }

      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_CARD',
            description: 'Card expired',
          },
        });
      }

      const cleaned = card.number.replace(/[\s-]/g, '');
      paymentData.card_last4 = cleaned.slice(-4);
      paymentData.card_network = detectCardNetwork(cleaned);
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Invalid payment method',
        },
      });
    }

    /* ================================
       CREATE PAYMENT
    ================================ */
    const payment = await createPayment(req.merchantId, paymentData);

    /* Force pending state (Deliverable-2 requirement) */
    await pool.query(
      `UPDATE payments SET status = 'pending' WHERE id = $1`,
      [payment.id]
    );

    /* ================================
       ENQUEUE BACKGROUND JOB
    ================================ */
    await paymentQueue.add('process_payment', {
      paymentId: payment.id,
      method: payment.method,
    });

    /* ================================
       RESPONSE
    ================================ */
    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: 'pending',
      created_at: payment.created_at,
    };

    /* ================================
       STORE IDEMPOTENT RESPONSE
    ================================ */
    if (idempotencyKey) {
      await pool.query(
        `INSERT INTO idempotency_keys
         (key, merchant_id, response, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key, merchant_id) DO NOTHING`,
        [idempotencyKey, req.merchantId, response]
      );
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   GET PAYMENT (AUTH)
================================ */

export const getPaymentHandler = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const payment = await getPayment(payment_id, req.merchantId);

    if (!payment) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found',
        },
      });
    }

    return res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   PUBLIC CREATE PAYMENT (CHECKOUT)
================================ */

export const createPaymentPublicHandler = async (req, res) => {
  try {
    const { order_id, method, vpa, card, amount } = req.body;

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found',
        },
      });
    }

    const order = orderResult.rows[0];
    const finalAmount = Number(amount) > 0 ? Number(amount) : order.amount;

    let paymentData = {
      order_id,
      method,
      amount: finalAmount,
      currency: order.currency,
      status: 'pending',
    };

    if (method === 'upi') {
      if (!vpa || !validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format',
          },
        });
      }
      paymentData.vpa = vpa;
    } else if (method === 'card') {
      const cleaned = card.number.replace(/[\s-]/g, '');
      paymentData.card_network = detectCardNetwork(cleaned);
      paymentData.card_last4 = cleaned.slice(-4);
    }

    const payment = await createPayment(order.merchant_id, paymentData);

    await pool.query(
      `UPDATE payments SET status = 'pending' WHERE id = $1`,
      [payment.id]
    );

    await paymentQueue.add('process_payment', {
      paymentId: payment.id,
      method: payment.method,
    });

    return res.status(201).json({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: 'pending',
      created_at: payment.created_at,
    });
  } catch (error) {
    console.error('Create payment public error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   PUBLIC GET PAYMENT
================================ */

export const getPaymentPublicHandler = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [payment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found',
        },
      });
    }

    const payment = result.rows[0];

    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    };

    if (payment.method === 'upi') {
      response.vpa = payment.vpa;
    } else if (payment.method === 'card') {
      response.card_network = payment.card_network;
      response.card_last4 = payment.card_last4;
    }

    if (payment.error_code) {
      response.error_code = payment.error_code;
      response.error_description = payment.error_description;
    }

    return res.json(response);
  } catch (error) {
    console.error('Get payment public error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   CAPTURE PAYMENT (AUTH)
================================ */

export const capturePaymentHandler = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { amount } = req.body;

    // Fetch payment
    const paymentRes = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND merchant_id = $2`,
      [payment_id, req.merchantId]
    );

    if (!paymentRes.rows.length) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found',
        },
      });
    }

    const payment = paymentRes.rows[0];

    // Verify payment is in capturable state (must be success)
    if (payment.status !== 'success') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Payment not in capturable state',
        },
      });
    }

    // Verify amount if provided
    if (amount && amount !== payment.amount) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Partial capture not supported',
        },
      });
    }

    // Update captured flag
    const updateRes = await pool.query(
      `UPDATE payments 
       SET captured = true, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [payment_id]
    );

    const capturedPayment = updateRes.rows[0];

    return res.json({
      id: capturedPayment.id,
      order_id: capturedPayment.order_id,
      amount: capturedPayment.amount,
      currency: capturedPayment.currency,
      method: capturedPayment.method,
      status: capturedPayment.status,
      captured: capturedPayment.captured,
      created_at: capturedPayment.created_at,
      updated_at: capturedPayment.updated_at,
    });
  } catch (error) {
    console.error('Capture payment error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   CREATE REFUND (AUTH)
================================ */

export const createRefundHandler = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Amount is required and must be positive',
        },
      });
    }

    const refund = await createRefund({
      paymentId: payment_id,
      merchantId: req.merchantId,
      amount,
      reason: reason || null
    });

    if (refund.error) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: refund.error,
        },
      });
    }

    // Enqueue refund processing job
    await refundQueue.add('process_refund', {
      refundId: refund.id,
    });

    return res.status(201).json({
      id: refund.id,
      payment_id: refund.payment_id,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      created_at: refund.created_at,
    });
  } catch (error) {
    console.error('Create refund error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   GET REFUND (AUTH)
================================ */

export const getRefundHandler = async (req, res) => {
  try {
    const { refund_id } = req.params;

    const refund = await getRefund(refund_id, req.merchantId);

    if (!refund) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Refund not found',
        },
      });
    }

    return res.json({
      id: refund.id,
      payment_id: refund.payment_id,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      created_at: refund.created_at,
      processed_at: refund.processed_at,
    });
  } catch (error) {
    console.error('Get refund error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   LIST WEBHOOK LOGS (AUTH)
================================ */

export const listWebhookLogsHandler = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 100);
    const offset = parseInt(req.query.offset || '0');

    const logs = await getWebhookLogs(req.merchantId, limit, offset);

    return res.json({
      data: logs.data.map(log => ({
        id: log.id,
        event: log.event,
        status: log.status,
        attempts: log.attempts,
        created_at: log.created_at,
        last_attempt_at: log.last_attempt_at,
        response_code: log.response_code,
      })),
      total: logs.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List webhook logs error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   RETRY WEBHOOK (AUTH)
================================ */

export const retryWebhookHandler = async (req, res) => {
  try {
    const { webhook_id } = req.params;

    await retryWebhook(webhook_id, req.merchantId);

    return res.json({
      id: webhook_id,
      status: 'pending',
      message: 'Webhook retry scheduled',
    });
  } catch (error) {
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Webhook not found',
        },
      });
    }

    console.error('Retry webhook error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error',
      },
    });
  }
};

/* ================================
   JOB QUEUE STATUS (NO AUTH)
================================ */

export const jobQueueStatusHandler = async (req, res) => {
  try {
    const stats = await paymentQueue.getJobCounts();

    return res.json({
      pending: stats.waiting || 0,
      processing: stats.active || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      worker_status: 'running',
    });
  } catch (error) {
    console.error('Job queue status error:', error);
    return res.json({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      worker_status: 'stopped',
    });
  }
};
