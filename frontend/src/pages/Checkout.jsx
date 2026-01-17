// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import './Checkout.css';

// function Checkout() {
//   const [orderId, setOrderId] = useState('');
//   const [order, setOrder] = useState(null);
//   const [selectedMethod, setSelectedMethod] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [paymentState, setPaymentState] = useState('form'); // form, processing, success, error
//   const [paymentId, setPaymentId] = useState('');
//   const [errorMessage, setErrorMessage] = useState('');

//   // UPI form
//   const [vpa, setVpa] = useState('');
//   // Card form
//   const [cardNumber, setCardNumber] = useState('');
//   const [expiry, setExpiry] = useState('');
//   const [cvv, setCvv] = useState('');
//   const [cardholderName, setCardholderName] = useState('');

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const oid = params.get('order_id');
//     if (oid) {
//       setOrderId(oid);
//       fetchOrder(oid);
//     }
//   }, []);

//   const fetchOrder = async (oid) => {
//     try {
//       const response = await axios.get(
//         `http://localhost:8000/api/v1/orders/${oid}/public`
//       );
//       setOrder(response.data);
//     } catch (error) {
//       console.error('Error fetching order:', error);
//       setErrorMessage('Order not found');
//       setPaymentState('error');
//     }
//   };

//   const formatAmount = (amount) => `₹${(amount / 100).toFixed(2)}`;

//   const showUPIForm = () => setSelectedMethod('upi');
//   const showCardForm = () => setSelectedMethod('card');

//   const handleUPISubmit = async (e) => {
//     e.preventDefault();
//     if (!order) return;
//     setLoading(true);
//     setPaymentState('processing');
//     try {
//       const response = await axios.post(
//         'http://localhost:8000/api/v1/payments/public',
//         {
//           order_id: orderId,
//           amount: order.amount, // fixed amount from order
//           method: 'upi',
//           vpa,
//         }
//       );
//       setPaymentId(response.data.id);
//       pollPaymentStatus(response.data.id);
//     } catch (error) {
//       console.error('Payment error:', error);
//       setErrorMessage(
//         error.response?.data?.error?.description || 'Payment failed'
//       );
//       setPaymentState('error');
//       setLoading(false);
//     }
//   };

//   const handleCardSubmit = async (e) => {
//     e.preventDefault();
//     if (!order) return;
//     setLoading(true);
//     setPaymentState('processing');
//     const [expiryMonth, expiryYear] = expiry.split('/');
//     try {
//       const response = await axios.post(
//         'http://localhost:8000/api/v1/payments/public',
//         {
//           order_id: orderId,
//           amount: order.amount, // fixed amount from order
//           method: 'card',
//           card: {
//             number: cardNumber,
//             expiry_month: expiryMonth,
//             expiry_year: expiryYear,
//             cvv,
//             holder_name: cardholderName,
//           },
//         }
//       );
//       setPaymentId(response.data.id);
//       pollPaymentStatus(response.data.id);
//     } catch (error) {
//       console.error('Payment error:', error);
//       setErrorMessage(
//         error.response?.data?.error?.description || 'Payment failed'
//       );
//       setPaymentState('error');
//       setLoading(false);
//     }
//   };

//   const pollPaymentStatus = async (pid) => {
//     const interval = setInterval(async () => {
//       try {
//         const response = await axios.get(
//           `http://localhost:8000/api/v1/payments/${pid}/public`
//         );
//         if (response.data.status === 'success') {
//           clearInterval(interval);
//           setPaymentState('success');
//           setLoading(false);
//         } else if (response.data.status === 'failed') {
//           clearInterval(interval);
//           setErrorMessage(
//             response.data.error_description || 'Payment failed'
//           );
//           setPaymentState('error');
//           setLoading(false);
//         }
//       } catch (error) {
//         console.error('Poll error:', error);
//       }
//     }, 2000);

//     setTimeout(() => {
//       clearInterval(interval);
//       if (paymentState === 'processing') {
//         setErrorMessage('Payment timeout');
//         setPaymentState('error');
//         setLoading(false);
//       }
//     }, 30000);
//   };

//   const retry = () => {
//     setPaymentState('form');
//     setSelectedMethod('');
//     setVpa('');
//     setCardNumber('');
//     setExpiry('');
//     setCvv('');
//     setCardholderName('');
//     setErrorMessage('');
//   };

//   if (!order && paymentState !== 'error') {
//     return (
//       <div className="checkout-page">
//         <div className="checkout-card">
//           <p className="checkout-loading">Loading order...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="checkout-page">
//       <div className="checkout-card">
//         <header className="checkout-header">
//           <div>
//             <h1 className="checkout-title">Payment Checkout</h1>
//             {order && (
//               <p className="checkout-subtitle">
//                 Order <span className="checkout-order-id">#{orderId}</span> ·{' '}
//                 <span className="checkout-amount">
//                   {formatAmount(order.amount)}
//                 </span>
//               </p>
//             )}
//           </div>
//         </header>

//         {paymentState === 'form' && (
//           <>
//             <div className="checkout-method-toggle">
//               <button
//                 type="button"
//                 className={
//                   'checkout-method-button' +
//                   (selectedMethod === 'upi' ? ' is-active' : '')
//                 }
//                 onClick={showUPIForm}
//               >
//                 UPI
//               </button>
//               <button
//                 type="button"
//                 className={
//                   'checkout-method-button' +
//                   (selectedMethod === 'card' ? ' is-active' : '')
//                 }
//                 onClick={showCardForm}
//               >
//                 Card
//               </button>
//             </div>

//             <div className="checkout-body">
//               <aside className="checkout-summary">
//                 <h2 className="checkout-summary-title">Order summary</h2>
//                 {order && (
//                   <>
//                     <p className="checkout-summary-label">Amount payable</p>
//                     <p className="checkout-summary-amount">
//                       {formatAmount(order.amount)}
//                     </p>
//                     <p className="checkout-summary-text">
//                       Complete the payment securely using UPI or card.
//                     </p>
//                   </>
//                 )}
//               </aside>

//               <section className="checkout-form-area">
//                 {!selectedMethod && (
//                   <p className="checkout-hint">
//                     Choose a payment method to continue.
//                   </p>
//                 )}

//                 {selectedMethod === 'upi' && (
//                   <form onSubmit={handleUPISubmit} className="checkout-form">
//                     <label className="checkout-label">
//                       UPI ID
//                       <input
//                         type="text"
//                         value={vpa}
//                         onChange={(e) => setVpa(e.target.value)}
//                         className="checkout-input"
//                         placeholder="name@upi"
//                         required
//                       />
//                     </label>

//                     <button
//                       type="submit"
//                       className="checkout-primary-button"
//                       disabled={loading}
//                     >
//                       {loading ? 'Processing...' : 'Pay with UPI'}
//                     </button>
//                   </form>
//                 )}

//                 {selectedMethod === 'card' && (
//                   <form onSubmit={handleCardSubmit} className="checkout-form">
//                     <label className="checkout-label">
//                       Card number
//                       <input
//                         type="text"
//                         value={cardNumber}
//                         onChange={(e) => setCardNumber(e.target.value)}
//                         className="checkout-input"
//                         placeholder="4111 1111 1111 1111"
//                         required
//                       />
//                     </label>

//                     <div className="checkout-row">
//                       <label className="checkout-label">
//                         Expiry (MM/YY)
//                         <input
//                           type="text"
//                           value={expiry}
//                           onChange={(e) => setExpiry(e.target.value)}
//                           className="checkout-input"
//                           placeholder="12/29"
//                           required
//                         />
//                       </label>

//                       <label className="checkout-label">
//                         CVV
//                         <input
//                           type="password"
//                           value={cvv}
//                           onChange={(e) => setCvv(e.target.value)}
//                           className="checkout-input"
//                           placeholder="123"
//                           required
//                         />
//                       </label>
//                     </div>

//                     <label className="checkout-label">
//                       Name on card
//                       <input
//                         type="text"
//                         value={cardholderName}
//                         onChange={(e) => setCardholderName(e.target.value)}
//                         className="checkout-input"
//                         placeholder="John Doe"
//                         required
//                       />
//                     </label>

//                     <button
//                       type="submit"
//                       className="checkout-primary-button"
//                       disabled={loading}
//                     >
//                       {loading ? 'Processing...' : 'Pay with card'}
//                     </button>
//                   </form>
//                 )}
//               </section>
//             </div>
//           </>
//         )}

//         {paymentState === 'processing' && (
//           <div className="checkout-state">
//             <div className="checkout-spinner" />
//             <p className="checkout-state-title">Processing payment...</p>
//             <p className="checkout-state-text">
//               Do not close this window. This may take a few seconds.
//             </p>
//           </div>
//         )}

//         {paymentState === 'success' && (
//           <div className="checkout-state checkout-success">
//             <p className="checkout-state-title">Payment successful</p>
//             <p className="checkout-state-text">
//               Payment ID: <span className="checkout-accent">{paymentId}</span>
//             </p>
//           </div>
//         )}

//         {paymentState === 'error' && (
//           <div className="checkout-state checkout-error">
//             <p className="checkout-state-title">Payment failed</p>
//             <p className="checkout-state-text">{errorMessage}</p>
//             <button
//               type="button"
//               className="checkout-secondary-button"
//               onClick={retry}
//             >
//               Try again
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Checkout;
