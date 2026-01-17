import { useEffect, useState } from 'react';
import axios from 'axios';
import './Checkout.css';

function Checkout() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentState, setPaymentState] = useState('form');
  const [paymentId, setPaymentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [vpa, setVpa] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('order_id');
    const embedded = params.get('embedded') === 'true';
    
    if (embedded) {
      // Store embedded flag for later use
      sessionStorage.setItem('isEmbedded', 'true');
    }
    
    if (oid) {
      setOrderId(oid);
      fetchOrder(oid);
    }
  }, []);

  const fetchOrder = async (oid) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/v1/orders/${oid}/public`
      );
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setErrorMessage('Order not found');
      setPaymentState('error');
    }
  };

  const formatAmount = (amount) => `₹${(amount / 100).toFixed(2)}`;

  const showUPIForm = () => setSelectedMethod('upi');
  const showCardForm = () => setSelectedMethod('card');

  const handleUPISubmit = async (e) => {
    e.preventDefault();
    if (!order) return;
    setLoading(true);
    setPaymentState('processing');
    try {
      const response = await axios.post(
        'http://localhost:8000/api/v1/payments/public',
        {
          order_id: orderId,
          amount: order.amount,
          method: 'upi',
          vpa,
        }
      );
      setPaymentId(response.data.id);
      pollPaymentStatus(response.data.id);
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage(
        error.response?.data?.error?.description || 'Payment failed'
      );
      setPaymentState('error');
      setLoading(false);
    }
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!order) return;
    setLoading(true);
    setPaymentState('processing');
    const [expiryMonth, expiryYear] = expiry.split('/');
    try {
      const response = await axios.post(
        'http://localhost:8000/api/v1/payments/public',
        {
          order_id: orderId,
          amount: order.amount,
          method: 'card',
          card: {
            number: cardNumber,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            cvv,
            holder_name: cardholderName,
          },
        }
      );
      setPaymentId(response.data.id);
      pollPaymentStatus(response.data.id);
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage(
        error.response?.data?.error?.description || 'Payment failed'
      );
      setPaymentState('error');
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (pid) => {
    const isEmbedded = sessionStorage.getItem('isEmbedded') === 'true';
    
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/v1/payments/${pid}/public`
        );
        if (response.data.status === 'success') {
          clearInterval(interval);
          setPaymentState('success');
          setLoading(false);
          
          // Send success message to parent iframe if embedded
          if (isEmbedded && window.parent !== window) {
            window.parent.postMessage({
              type: 'payment_success',
              data: {
                paymentId: response.data.id,
                orderId: response.data.order_id,
                amount: response.data.amount,
              }
            }, '*');
          }
        } else if (response.data.status === 'failed') {
          clearInterval(interval);
          setErrorMessage(
            response.data.error_description || 'Payment failed'
          );
          setPaymentState('error');
          setLoading(false);
          
          // Send failure message to parent iframe if embedded
          if (isEmbedded && window.parent !== window) {
            window.parent.postMessage({
              type: 'payment_failed',
              data: {
                error: response.data.error_description || 'Payment failed',
                errorCode: response.data.error_code || 'PAYMENT_FAILED'
              }
            }, '*');
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      if (paymentState === 'processing') {
        setErrorMessage('Payment timeout');
        setPaymentState('error');
        setLoading(false);
        
        if (isEmbedded && window.parent !== window) {
          window.parent.postMessage({
            type: 'payment_failed',
            data: {
              error: 'Payment timeout',
              errorCode: 'TIMEOUT'
            }
          }, '*');
        }
      }
    }, 30000);
  };

  const retry = () => {
    setPaymentState('form');
    setSelectedMethod('');
    setVpa('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardholderName('');
    setErrorMessage('');
  };

  if (!order && paymentState !== 'error') {
    return (
      <div className="checkout-page" data-test-id="checkout-container">
        <div className="checkout-card">
          <p className="checkout-loading">Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" data-test-id="checkout-container">
      <div className="checkout-card">
        {/* Header with order summary */}
        <header className="checkout-header">
          <div>
            <h1 className="checkout-title">Payment Checkout</h1>
            {order && (
              <p className="checkout-subtitle" data-test-id="order-summary">
                Order <span className="checkout-order-id" data-test-id="order-id">#{orderId}</span> ·{' '}
                <span className="checkout-amount" data-test-id="order-amount">
                  {formatAmount(order.amount)}
                </span>
              </p>
            )}
          </div>
        </header>

        {/* Method toggle buttons */}
        {paymentState === 'form' && (
          <>
            <div className="checkout-method-toggle" data-test-id="payment-methods">
              <button
                type="button"
                data-test-id="method-upi"
                data-method="upi"
                className={
                  'checkout-method-button' +
                  (selectedMethod === 'upi' ? ' is-active' : '')
                }
                onClick={showUPIForm}
              >
                UPI
              </button>
              <button
                type="button"
                data-test-id="method-card"
                data-method="card"
                className={
                  'checkout-method-button' +
                  (selectedMethod === 'card' ? ' is-active' : '')
                }
                onClick={showCardForm}
              >
                Card
              </button>
            </div>

            {/* Two-column layout: summary + forms */}
            <div className="checkout-body">
              {/* Left: Order summary */}
              <aside className="checkout-summary">
                <h2 className="checkout-summary-title">Order summary</h2>
                {order && (
                  <>
                    <p className="checkout-summary-label">Amount payable</p>
                    <p className="checkout-summary-amount">
                      {formatAmount(order.amount)}
                    </p>
                    <p className="checkout-summary-text">
                      Complete the payment securely using UPI or card.
                    </p>
                  </>
                )}
              </aside>

              {/* Right: Payment forms */}
              <section className="checkout-form-area">
                {!selectedMethod && (
                  <p className="checkout-hint">
                    Choose a payment method to continue.
                  </p>
                )}

                {/* UPI form */}
                {selectedMethod === 'upi' && (
                  <form
                    data-test-id="upi-form"
                    onSubmit={handleUPISubmit}
                    className="checkout-form"
                  >
                    <label className="checkout-label">
                      UPI ID
                      <input
                        data-test-id="vpa-input"
                        type="text"
                        value={vpa}
                        onChange={(e) => setVpa(e.target.value)}
                        className="checkout-input"
                        placeholder="name@upi"
                        required
                      />
                    </label>

                    <button
                      data-test-id="pay-button"
                      type="submit"
                      className="checkout-primary-button"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Pay with UPI'}
                    </button>
                  </form>
                )}

                {/* Card form */}
                {selectedMethod === 'card' && (
                  <form
                    data-test-id="card-form"
                    onSubmit={handleCardSubmit}
                    className="checkout-form"
                  >
                    <label className="checkout-label">
                      Card number
                      <input
                        data-test-id="card-number-input"
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="checkout-input"
                        placeholder="4111 1111 1111 1111"
                        required
                      />
                    </label>

                    <div className="checkout-row">
                      <label className="checkout-label">
                        Expiry (MM/YY)
                        <input
                          data-test-id="expiry-input"
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="checkout-input"
                          placeholder="12/29"
                          required
                        />
                      </label>

                      <label className="checkout-label">
                        CVV
                        <input
                          data-test-id="cvv-input"
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="checkout-input"
                          placeholder="123"
                          required
                        />
                      </label>
                    </div>

                    <label className="checkout-label">
                      Name on card
                      <input
                        data-test-id="cardholder-name-input"
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="checkout-input"
                        placeholder="John Doe"
                        required
                      />
                    </label>

                    <button
                      data-test-id="pay-button"
                      type="submit"
                      className="checkout-primary-button"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Pay with card'}
                    </button>
                  </form>
                )}
              </section>
            </div>
          </>
        )}

        {/* Processing state */}
        {paymentState === 'processing' && (
          <div className="checkout-state" data-test-id="processing-state">
            <div className="checkout-spinner" />
            <p className="checkout-state-title">Processing payment...</p>
            <p className="checkout-state-text" data-test-id="processing-message">
              Do not close this window. This may take a few seconds.
            </p>
          </div>
        )}

        {/* Success state */}
        {paymentState === 'success' && (
  <div
    className="checkout-state checkout-success"
    data-test-id="success-state"
  >
    <div className="checkout-icon success-icon">✓</div>

    <p className="checkout-state-title">Payment successful</p>

    <p className="checkout-state-text">
      Payment ID:{' '}
      <span className="checkout-accent" data-test-id="payment-id">
        {paymentId}
      </span>
    </p>

    <span
      data-test-id="success-message"
      style={{ display: 'block', marginTop: '10px' }}
    >
      Your payment has been processed successfully
    </span>
  </div>
)}
        {/* Error state */}
        {paymentState === 'error' && (
          <div
            className="checkout-state checkout-error"
            data-test-id="error-state"
          >
            <div className="checkout-icon error-icon">✕</div>

            <p className="checkout-state-title">Payment failed</p>

            <p
              className="checkout-state-text"
              data-test-id="error-message"
            >
              {errorMessage}
            </p>

            <button
              data-test-id="retry-button"
              type="button"
              className="checkout-secondary-button"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;
