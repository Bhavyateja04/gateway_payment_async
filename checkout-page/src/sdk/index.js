/**
 * Checkout SDK Bundle
 * This file is bundled and served as checkout.js
 */

import PaymentGateway from './PaymentGateway.js';

// Expose to global scope
window.PaymentGateway = PaymentGateway;

export default PaymentGateway;
