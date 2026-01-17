import { query } from '../config/database.js';

export const getTestMerchant = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, api_key FROM merchants WHERE email = $1`,
      ['test@example.com']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Test merchant not found'
        }
      });
    }

    const merchant = result.rows[0];
    res.json({
      id: merchant.id,
      email: merchant.email,
      api_key: merchant.api_key,
      seeded: true
    });
  } catch (error) {
    console.error('Get test merchant error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
};
