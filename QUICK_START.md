# 🚀 Quick Start Guide — Production Payment Gateway

## 📦 Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL 15 (included in Docker)
- Redis 7 (included in Docker)

---

# ⚙️ Setup & Launch

## 1. Start All Services
```bash
cd payment-gateway
docker-compose up --build
````

### Startup Order (with health checks)

1. PostgreSQL — `5432`
2. Redis — `6379`
3. API Server — `8000`
4. Worker — background jobs
5. Dashboard — `3000`
6. Checkout Page — `3001`

---

## 2. Verify Services

```bash
# Check API health
curl http://localhost:8000/health

# Check job queue status
curl http://localhost:8000/api/v1/test/jobs/status

# Check Redis
redis-cli -p 6379 ping
```

---

## 3. Obtain Test Credentials

```bash
curl http://localhost:8000/api/v1/test/merchant
```

Expected Response:

```json
{
  "id": "merchant-uuid",
  "api_key": "key_test_abc123",
  "api_secret": "secret_test_xyz789",
  "webhook_url": null,
  "webhook_secret": "whsec_test_abc123"
}
```

---

# 🧪 Testing the Payment Flow

## Step 1: Login to Dashboard

1. Open: [http://localhost:3000](http://localhost:3000)
2. Login using returned test credentials
3. View dashboard

---

## Step 2: Create Test Order

1. Click **"Create Test Order"**
2. Redirects to checkout page
3. Complete simulated payment

---

## Step 3: Monitor Processing

Open:

```bash
curl http://localhost:8000/api/v1/test/jobs/status
```

Job states will update:

```
pending → processing → completed
```

---

## Step 4: Test Webhook Delivery

### Start Test Merchant Receiver

```bash
cd test-merchant
npm install
node webhook.js
```

### Set Webhook URL in Dashboard

* Mac/Windows:

  ```
  http://host.docker.internal:4000/webhook
  ```
* Linux:

  ```
  http://172.17.0.1:4000/webhook
  ```

### Trigger Webhooks

Create a new payment and observe test merchant logs.

---

## Step 5: Test Refunds

API:

```bash
curl -X POST http://localhost:8000/api/v1/payments/{payment_id}/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "reason": "Customer requested"
  }'
```

---

# 🌐 API Examples

## Create Order

```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'
```

---

## Create Payment (Idempotent)

```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: unique-request-123" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_abc123",
    "method": "upi",
    "vpa": "user@paytm"
  }'
```

---

## Get Payment Status

```bash
curl http://localhost:8000/api/v1/payments/{payment_id}/public
```

---

## List Webhook Logs

```bash
curl http://localhost:8000/api/v1/webhooks \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

---

## Retry Failed Webhook

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/{webhook_id}/retry \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

---

# 💳 SDK Integration

## Embed on Website

```html
<script src="http://localhost:3001/checkout.js"></script>
<button id="pay-button">Pay Now</button>

<script>
document.getElementById('pay-button').addEventListener('click', () => {
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_xyz',
    onSuccess: (resp) => console.log('Success:', resp.paymentId),
    onFailure: (err) => console.log('Failed:', err),
    onClose: () => console.log('Modal closed')
  });
  checkout.open();
});
</script>
```

---

# 🧪 Testing Modes

## Deterministic Payment Behavior

Backend `.env`:

```env
# Force success
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000

# Force failure
TEST_MODE=true
TEST_PAYMENT_SUCCESS=false
TEST_PROCESSING_DELAY=500
```

---

## Fast Webhook Retry Mode

```env
WEBHOOK_RETRY_INTERVALS_TEST=true
```

Test retry timing:

```
0s → 5s → 10s → 15s → 20s
```

---

# 🗄️ Database Debugging

## Connect to PostgreSQL

```bash
psql postgresql://gateway_user:gateway_pass@localhost:5432/payment_gateway
```

## Useful Queries

```sql
SELECT id, status FROM payments ORDER BY created_at DESC LIMIT 10;
SELECT id, event, attempts FROM webhook_logs ORDER BY created_at DESC;
SELECT id, payment_id, status FROM refunds ORDER BY created_at DESC;
SELECT key, merchant_id FROM idempotency_keys;
```

---

# 🧰 Redis Debugging

## Connect

```bash
redis-cli -p 6379
```

## Useful Commands

```bash
LLEN bull:payments:wait
LLEN bull:webhooks:wait
LLEN bull:refunds:wait

HGETALL bull:payments:stats
MONITOR
```

---

# 🐛 Logs & Troubleshooting

## View Logs

```bash
docker-compose logs -f
docker-compose logs -f api
docker-compose logs -f worker
```

---

## Common Issues

### ❌ Webhooks Not Delivering

Check:

* Webhook URL configured in dashboard
* Test receiver running
* Internet access / firewall

### ❌ Jobs Not Processing

Check:

* `redis-cli ping` → should return PONG
* `docker-compose logs worker`
* `curl /api/v1/test/jobs/status`

### ❌ Signature Mismatch

Verify:

* webhook_secret matches
* no JSON whitespace changes

---

# ⚡ Performance Tuning

## Increase Worker Concurrency

```js
new Worker('queue', processor, {
  connection: redisConnection,
  concurrency: 10
});
```

## Redis Connection Optimization

```js
const redis = new IORedis({
  host: 'redis',
  port: 6379,
  enableOfflineQueue: true
});
```

## Database Pooling

```js
const pool = new Pool({
  max: 20,
  min: 5
});
```

---

# 🛑 Stopping Services

```bash
docker-compose down
docker-compose down -v
docker-compose restart
```

---

# 🏭 Production Deployment Checklist

### ✔ Environment

* Secure API key/secret
* `TEST_MODE=false`
* HTTPS enabled
* Redis persistence enabled

### ✔ Database

* Managed PostgreSQL
* Automated backups
* Monitoring enabled

### ✔ Redis

* Managed Redis cluster
* Replication
* Persistence

### ✔ Security

* WAF enabled
* Rate limiting
* Secret rotation
* VPC isolation

### ✔ Monitoring

* Error tracking (Sentry, etc.)
* Queue depth alerts
* Webhook failure alerts

### ✔ Scaling

* Multiple workers
* Load balanced API
* Horizontal Redis scaling

---

# 📚 Support & Documentation

* Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
* Webhooks: [http://localhost:3000/dashboard/webhooks](http://localhost:3000/dashboard/webhooks)
* API Docs: [http://localhost:3000/dashboard/docs](http://localhost:3000/dashboard/docs)
* Implementation Guide: `IMPLEMENTATION_GUIDE.md`

---

🎉 **Happy Testing!**
Your payment gateway is now fully operational.

```
