import express from 'express';
import { healthCheck } from '../controllers/healthController.js';
import { createOrderHandler, getOrderHandler, getOrderPublicHandler } from '../controllers/orderController.js';
import { 
  createPaymentHandler, 
  getPaymentHandler, 
  createPaymentPublicHandler, 
  getPaymentPublicHandler,
  capturePaymentHandler,
  createRefundHandler,
  getRefundHandler,
  listWebhookLogsHandler,
  retryWebhookHandler,
  jobQueueStatusHandler
} from '../controllers/paymentController.js';
import { getTestMerchant } from '../controllers/testController.js';
import { getPaymentsList, getStats } from '../controllers/dashboardController.js';
import { query } from '../config/database.js';

const router = express.Router();

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    console.log('🔍 Auth Check:');
    console.log('  Received headers:', Object.keys(req.headers).filter(h => h.includes('api')));
    console.log('  X-Api-Key:', apiKey);
    console.log('  X-Api-Secret:', apiSecret);

    if (!apiKey || !apiSecret) {
      console.log('❌ Missing headers - rejecting');
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }

    const result = await query(
      `SELECT id FROM merchants WHERE api_key = $1 AND api_secret = $2 AND is_active = true`,
      [apiKey, apiSecret]
    );

    console.log('  DB query result:', result.rows.length, 'rows');
    if (result.rows.length > 0) {
      console.log('✅ Auth successful - merchant found');
    } else {
      console.log('❌ No merchant found with those credentials');
    }

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }

    req.merchantId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};

// Public routes
router.get('/health', healthCheck);
router.get('/api/v1/test/merchant', getTestMerchant);
router.get('/api/v1/test/jobs/status', jobQueueStatusHandler);
router.get('/api/v1/orders/:order_id/public', getOrderPublicHandler);
router.post('/api/v1/payments/public', createPaymentPublicHandler);
router.get('/api/v1/payments/:payment_id/public', getPaymentPublicHandler);

// Protected routes
router.post('/api/v1/orders', authenticate, createOrderHandler);
router.get('/api/v1/orders/:order_id', authenticate, getOrderHandler);

// Put the *specific* payment routes first
router.get('/api/v1/payments/list', authenticate, getPaymentsList);
router.get('/api/v1/payments/stats', authenticate, getStats);

// Payment endpoints
router.post('/api/v1/payments', authenticate, createPaymentHandler);
router.get('/api/v1/payments/:payment_id', authenticate, getPaymentHandler);
router.post('/api/v1/payments/:payment_id/capture', authenticate, capturePaymentHandler);

// Refund endpoints
router.post('/api/v1/payments/:payment_id/refunds', authenticate, createRefundHandler);
router.get('/api/v1/refunds/:refund_id', authenticate, getRefundHandler);

// Webhook endpoints
router.get('/api/v1/webhooks', authenticate, listWebhookLogsHandler);

// Webhook configuration endpoints - must come BEFORE dynamic routes
router.post('/api/v1/webhooks/test', authenticate, async (req, res) => {
  try {
    const { event = 'payment.test' } = req.body;
    
    // Insert a test webhook log
    const logResult = await query(
      `INSERT INTO webhook_logs (merchant_id, event, payload, status, response_code, attempts, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, event, status, attempts, created_at, response_code`,
      [req.merchantId, event, JSON.stringify({ test: true }), 'success', 200, 1]
    );

    return res.status(201).json({
      id: logResult.rows[0].id,
      event: logResult.rows[0].event,
      status: logResult.rows[0].status,
      attempts: logResult.rows[0].attempts,
      response_code: logResult.rows[0].response_code,
      created_at: logResult.rows[0].created_at,
      message: 'Test webhook created successfully'
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Failed to create test webhook'
      }
    });
  }
});

// Dynamic webhook routes
router.post('/api/v1/webhooks/:webhook_id/retry', authenticate, retryWebhookHandler);

export default router;