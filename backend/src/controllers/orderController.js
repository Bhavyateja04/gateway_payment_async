import { createOrder, getOrder, getOrderPublic } from '../services/orderService.js';

export const createOrderHandler = async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'amount must be at least 100'
        }
      });
    }

    const order = await createOrder(req.merchantId, { amount, currency, receipt, notes });
    
    res.status(201).json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      status: order.status,
      created_at: order.created_at
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};

export const getOrderHandler = async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await getOrder(order_id, req.merchantId);

    if (!order) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }

    res.json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};

export const getOrderPublicHandler = async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await getOrderPublic(order_id);

    if (!order) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order public error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};
