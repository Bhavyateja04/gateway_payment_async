import './ApiDocs.css';

function ApiDocs() {
  return (
    <div className="api-docs-page">
      <div className="api-docs-container" data-test-id="api-docs">
        <button 
          className="api-docs-back-button"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
        
        <h1>Integration Guide</h1>
        <p className="api-docs-subtitle">Learn how to integrate the Payment Gateway API into your application</p>

        <div className="docs-section" data-test-id="section-create-order">
          <h2>1. Create Order</h2>
          <p>First, create an order using your API credentials.</p>
          <pre data-test-id="code-snippet-create-order"><code>{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}</code></pre>
        </div>

        <div className="docs-section" data-test-id="section-sdk-integration">
          <h2>2. SDK Integration</h2>
          <p>Include the SDK on your website and open the payment modal:</p>
          <pre data-test-id="code-snippet-sdk"><code>{`&lt;script src="http://localhost:3001/checkout.js"&gt;&lt;/script&gt;
&lt;button id="pay-button"&gt;Pay Now&lt;/button&gt;

&lt;script&gt;
document.getElementById('pay-button').addEventListener('click', function() {
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_xyz',
    onSuccess: (response) => {
      console.log('Payment ID:', response.paymentId);
      // Handle success
    },
    onFailure: (error) => {
      console.log('Error:', error);
      // Handle failure
    },
    onClose: () => {
      console.log('Modal closed');
    }
  });
  checkout.open();
});
&lt;/script&gt;`}</code></pre>
        </div>

        <div className="docs-section" data-test-id="section-webhook-verification">
          <h2>3. Verify Webhook Signature</h2>
          <p>Verify webhook signatures using HMAC-SHA256:</p>
          <pre data-test-id="code-snippet-webhook"><code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// In your webhook endpoint:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (verifyWebhook(payload, signature, 'your-webhook-secret')) {
    console.log('✅ Webhook verified');
    res.status(200).send('OK');
  } else {
    console.log('❌ Invalid signature');
    res.status(401).send('Unauthorized');
  }
});`}</code></pre>
        </div>

        <div className="docs-section">
          <h2>Webhook Events</h2>
          <ul>
            <li><code>payment.created</code> - When payment record is created</li>
            <li><code>payment.pending</code> - When payment enters pending state</li>
            <li><code>payment.success</code> - When payment succeeds</li>
            <li><code>payment.failed</code> - When payment fails</li>
            <li><code>refund.created</code> - When refund is initiated</li>
            <li><code>refund.processed</code> - When refund completes</li>
          </ul>
        </div>

        <div className="docs-section">
          <h2>Webhook Payload Format</h2>
          <pre><code>{`{
  "event": "payment.success",
  "timestamp": 1705315870,
  "data": {
    "payment": {
      "id": "pay_H8sK3jD9s2L1pQr",
      "order_id": "order_NXhj67fGH2jk9mPq",
      "amount": 50000,
      "currency": "INR",
      "method": "upi",
      "status": "success",
      "created_at": "2024-01-15T10:31:00Z"
    }
  }
}`}</code></pre>
        </div>

        <div className="docs-section">
          <h2>API Endpoints</h2>
          
          <div className="endpoint">
            <h3>Create Payment</h3>
            <code>POST /api/v1/payments</code>
            <p>Create an asynchronous payment request with optional idempotency key support.</p>
          </div>

          <div className="endpoint">
            <h3>Get Payment</h3>
            <code>GET /api/v1/payments/{'{payment_id}'}</code>
            <p>Retrieve payment details by ID.</p>
          </div>

          <div className="endpoint">
            <h3>Capture Payment</h3>
            <code>POST /api/v1/payments/{'{payment_id}'}/capture</code>
            <p>Capture a successful payment for settlement.</p>
          </div>

          <div className="endpoint">
            <h3>Create Refund</h3>
            <code>POST /api/v1/payments/{'{payment_id}'}/refunds</code>
            <p>Initiate a full or partial refund for a payment.</p>
          </div>

          <div className="endpoint">
            <h3>Get Refund</h3>
            <code>GET /api/v1/refunds/{'{refund_id}'}</code>
            <p>Retrieve refund details by ID.</p>
          </div>

          <div className="endpoint">
            <h3>List Webhooks</h3>
            <code>GET /api/v1/webhooks</code>
            <p>List webhook delivery logs with pagination support.</p>
          </div>

          <div className="endpoint">
            <h3>Retry Webhook</h3>
            <code>POST /api/v1/webhooks/{'{webhook_id}'}/retry</code>
            <p>Manually retry a failed webhook delivery.</p>
          </div>
        </div>

        <div className="docs-section info-box">
          <h3>Authentication</h3>
          <p>All authenticated endpoints require the following headers:</p>
          <ul>
            <li><code>X-Api-Key: your_api_key</code></li>
            <li><code>X-Api-Secret: your_api_secret</code></li>
            <li><code>Content-Type: application/json</code></li>
          </ul>
        </div>

        <div className="docs-section info-box">
          <h3>Idempotency</h3>
          <p>To prevent duplicate charges on network retries, include an <code>Idempotency-Key</code> header with a unique request identifier. The response will be cached for 24 hours.</p>
        </div>

        <div className="docs-section info-box">
          <h3>Webhook Retry Logic</h3>
          <p>Failed webhooks are automatically retried with exponential backoff:</p>
          <ul>
            <li>Attempt 1: Immediate</li>
            <li>Attempt 2: After 1 minute</li>
            <li>Attempt 3: After 5 minutes</li>
            <li>Attempt 4: After 30 minutes</li>
            <li>Attempt 5: After 2 hours</li>
          </ul>
          <p>After 5 attempts, the webhook is marked as permanently failed. You can manually retry from the dashboard.</p>
        </div>
      </div>
    </div>
  );
}

export default ApiDocs;
