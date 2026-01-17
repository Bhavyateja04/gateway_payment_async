import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');
        const apiSecret = localStorage.getItem('apiSecret');
        
        if (!apiKey || !apiSecret) {
          navigate('/login', { replace: true });
          return;
        }

        // Changed endpoint to /payments/history
        const response = await axios.get('http://localhost:8000/api/v1/payments/list', {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-Secret': apiSecret,
          },
        });

        setTransactions(response.data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [navigate]);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="transactions-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="transactions-container">
      <div className="transactions-content">
        <button onClick={handleBackToDashboard} className="back-button">
          ← Back to Dashboard
        </button>

        <h1 className="transactions-title">Transactions</h1>

        <div className="transactions-table-wrapper">
          <table className="transactions-table" data-test-id="transactions-table">
  <thead>
    <tr>
      <th>PAYMENT ID</th>
      <th>ORDER ID</th>
      <th>AMOUNT</th>
      <th>METHOD</th>
      <th>STATUS</th>
      <th>CREATED</th>
    </tr>
  </thead>
  <tbody>
    {transactions.length === 0 ? (
      <tr>
        <td colSpan="6" className="no-transactions">
          No transactions found
        </td>
      </tr>
    ) : (
      transactions.map((transaction) => (
        <tr 
          key={transaction.id} 
          data-test-id="transaction-row" 
          data-payment-id={transaction.id}
        >
          <td className="payment-id" data-test-id="payment-id">{transaction.id}</td>
          <td className="order-id" data-test-id="order-id">{transaction.order_id}</td>
          <td className="amount" data-test-id="amount">{(transaction.amount / 100).toFixed(2)}</td>
          <td className="method" data-test-id="method">
            <span className="method-badge">{transaction.method}</span>
          </td>
          <td className="status" data-test-id="status">
            <span className={`status-badge status-${transaction.status.toLowerCase()}`}>
              {transaction.status}
            </span>
          </td>
          <td className="created" data-test-id="created-at">
            {new Date(transaction.created_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>

        </div>
      </div>
    </div>
  );
};

export default Transactions;
