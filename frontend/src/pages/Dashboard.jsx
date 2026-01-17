import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0,
  });

  const apiKey = 'key_test_abc123';
  const apiSecret = 'secret_test_xyz789';
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v1/payments/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalTransactions: 0,
        totalAmount: 0,
        successRate: 0,
      });
    }
  };
const createTestOrder = async () => {
  try {
    const res = await api.post('/api/v1/orders', {
      amount: 1000,
      currency: 'INR',
      description: 'Test order from dashboard',
    });

    const orderId = res.data.id;
    window.location.href = `http://localhost:3001/checkout?order_id=${orderId}`;
  } catch (err) {
    console.error('Create order failed', err);
    alert(err.response?.data?.error?.description || 'Failed to create order');
  }
};


  const formatAmount = (amount) => {
    return `₹${(amount / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="dashboard-page" data-test-id="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Merchant Dashboard</h1>
          <p className="dashboard-subtitle">
            Monitor payments and test checkout flow
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="dashboard-primary-button"
            onClick={createTestOrder}
          >
            Create test order
          </button>

          <Link
            to="/dashboard/transactions"
            className="dashboard-link-button"
          >
            View transactions
          </Link>

          <Link
            to="/dashboard/webhooks"
            className="dashboard-link-button"
          >
            Webhooks
          </Link>

          <Link
            to="/dashboard/docs"
            className="dashboard-link-button"
          >
            Docs
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="dashboard-content">
        {/* API Credentials */}
        <div
          className="dashboard-card dashboard-credentials"
          data-test-id="api-credentials"
        >
          <h2 className="dashboard-card-title">API Credentials</h2>

          <div className="dashboard-credentials-row">
            <span className="dashboard-label">API Key</span>
            <div
              className="dashboard-code"
              title="Click to copy"
              data-test-id="api-key"
              onClick={() => navigator.clipboard.writeText(apiKey)}
            >
              {apiKey}
            </div>
          </div>

          <div className="dashboard-credentials-row">
            <span className="dashboard-label">API Secret</span>
            <div
              className="dashboard-code sensitive"
              title="Click to copy"
              data-test-id="api-secret"
              onClick={() => navigator.clipboard.writeText(apiSecret)}
            >
              ••••••••••••••
            </div>
          </div>

          <p className="dashboard-help">
            Click on a credential to copy. Keep your secret key secure.
          </p>
        </div>

        {/* Stats */}
        <div
          className="dashboard-stats-grid"
          data-test-id="stats-container"
        >
          <div className="dashboard-card stat-card">
            <p className="dashboard-label">Total Transactions</p>
            <p
              className="dashboard-stat"
              data-test-id="total-transactions"
            >
              {stats.totalTransactions}
            </p>
          </div>

          <div className="dashboard-card stat-card">
            <p className="dashboard-label">Total Amount</p>
            <p className="dashboard-stat" data-test-id="total-amount">
              {formatAmount(stats.totalAmount)}
            </p>
          </div>

          <div className="dashboard-card stat-card">
            <p className="dashboard-label">Success Rate</p>
            <p className="dashboard-stat" data-test-id="success-rate">
              {stats.successRate}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
