import { query } from '../config/database.js';

export const getPaymentsList = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC`,
      [req.merchantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get payments list error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM payments WHERE merchant_id = $1`,
      [req.merchantId]
    );

    const amountResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE merchant_id = $1 AND status = 'success'`,
      [req.merchantId]
    );

    const successResult = await query(
      `SELECT COUNT(*) as count FROM payments WHERE merchant_id = $1 AND status = 'success'`,
      [req.merchantId]
    );

    const totalTransactions = parseInt(totalResult.rows[0].count);
    const totalAmount = parseInt(amountResult.rows[0].total);
    const successCount = parseInt(successResult.rows[0].count);
    const successRate = totalTransactions > 0 
      ? Math.round((successCount / totalTransactions) * 100) 
      : 0;

    res.json({
      totalTransactions,
      totalAmount,
      successRate
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};
