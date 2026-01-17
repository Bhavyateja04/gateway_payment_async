import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-Api-Key': 'key_test_abc123',
    'X-Api-Secret': 'secret_test_xyz789',
  },
});

export const setAuthHeaders = (apiKey, apiSecret) => {
  api.defaults.headers.common['X-Api-Key'] = apiKey;
  api.defaults.headers.common['X-Api-Secret'] = apiSecret;
};

export const getOrders = async () => {
  // For dashboard, we need to fetch all transactions
  const response = await api.get('/api/v1/orders');
  return response.data;
};

export const getPayments = async () => {
  // Custom endpoint to get all payments for a merchant
  const response = await api.get('/api/v1/payments');
  return response.data;
};
export default api;