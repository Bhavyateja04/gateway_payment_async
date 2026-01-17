# Payment Gateway

A full-featured payment gateway implementation similar to Razorpay and Stripe, supporting UPI and Card payments. Built with modern web technologies and fully containerized for easy deployment.

## 🚀 Features

- Multi-method payment processing (UPI & Card)
- Merchant dashboard with analytics & transaction history
- Hosted checkout page
- Secure API key authentication
- Payment validation (UPI + Card Luhn + CVV)
- Docker-based deployment
- PostgreSQL persistence
- Pre-seeded test merchant
- Simulated payment success rates

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL 15
- node-postgres (`pg`)
- Custom API auth

### Frontend
- React 18
- Vite
- React Router v6
- Axios
- Custom CSS

### DevOps
- Docker & Docker Compose
- Nginx for serving React builds

---

## 📋 Prerequisites

Install before starting:

- Docker (20.10+)
- Docker Compose (2.0+)
- Git

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd payment-gateway
````

### 2. Start All Services

```bash
docker-compose up -d
```

This will:

* Build Docker images
* Start PostgreSQL
* Apply DB schema
* Seed test merchant
* Start backend API
* Start dashboard
* Start checkout

### 3. Verify Containers

```bash
docker-compose ps
```

Expected services:

| Container         | Purpose      |
| ----------------- | ------------ |
| pg_gateway        | PostgreSQL   |
| gateway_api       | Backend API  |
| gateway_dashboard | Dashboard UI |
| gateway_checkout  | Checkout UI  |

### 4. Access Application

| Service      | URL                                                          |
| ------------ | ------------------------------------------------------------ |
| Dashboard    | [http://localhost:3000](http://localhost:3000)               |
| Checkout     | [http://localhost:3001](http://localhost:3001)               |
| Backend API  | [http://localhost:8000](http://localhost:8000)               |
| Health Check | [http://localhost:8000/health](http://localhost:8000/health) |

---

## 🔑 Test Credentials

### Merchant Login

```
Email: test@example.com
Password: password123 (or any)
```

### API Credentials

```
API Key: key_test_abc123
API Secret: secret_test_xyz789
```

---

## 💳 Test Cards

| Card Type  | Number              |
| ---------- | ------------------- |
| Visa       | 4111 1111 1111 1111 |
| Mastercard | 5555 5555 5555 4444 |

Use:

* Expiry: any future date (e.g., 12/25)
* CVV: any 3 digits (e.g., 123)

### 🅿 Test UPI IDs

Examples:

```
test@upi
user@paytm
demo@ybl
```

---

## 📖 Usage Guide

### 1. Login to Dashboard

* Go to: `http://localhost:3000`
* Use test credentials
* View API keys & stats

### 2. Create Test Order via Dashboard

* Click **"Create test order"**
* Checkout UI opens automatically

### 3. Complete Payment

* Select UPI or Card
* Submit form
* Wait 5-10 seconds
* View result (success/failure)

### 4. View Transaction History

* Return to dashboard
* Click **Transactions**

---

## 🧪 Using the API Directly

### Create an Order

```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123",
    "notes": {
      "customer_name": "John Doe"
    }
  }'
```

### Get Order

```bash
curl http://localhost:8000/api/v1/orders/order_123 \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

### Create UPI Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments/public \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_123",
    "method": "upi",
    "vpa": "user@paytm"
  }'
```

### Create Card Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments/public \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_123",
    "method": "card",
    "card": {
      "number": "4111111111111111",
      "expiry_month": "12",
      "expiry_year": "2025",
      "cvv": "123",
      "holder_name": "John Doe"
    }
  }'
```

---

## 🗄️ Database Schema

### Merchants

```
id (UUID) PK
email (unique)
api_key
api_secret
webhook_url
created_at
updated_at
```

### Orders

```
id
merchant_id → merchants.id
amount
currency
receipt
notes (JSONB)
status
created_at
updated_at
```

### Payments

```
id
order_id → orders.id
merchant_id → merchants.id
amount
currency
method
status
vpa
card_network
card_last4
error_code
error_description
created_at
updated_at
```

---

## 🔒 Security Features

* API key + secret authentication
* No CVV stored
* No full card number stored
* VPA format validation
* Luhn algorithm for card validation
* Expiry validation

---

## 🧪 Payment Processing Logic

* UPI success rate: **90%**
* Card success rate: **95%**
* Processing time: **5–10 sec**
* Status flow: `processing → success / failed`

---

## 🌐 API Endpoints

### Public

```
GET /health
GET /api/v1/test/merchant
GET /api/v1/orders/:id/public
POST /api/v1/payments/public
GET /api/v1/payments/:id/public
```

### Protected (API Key Required)

```
POST /api/v1/orders
GET /api/v1/orders/:id
POST /api/v1/payments
GET /api/v1/payments/:id
GET /api/v1/payments/list
GET /api/v1/payments/stats
```

---

## ⚙️ Configuration

`.env.example` includes:

```
DATABASE_URL=postgresql://gateway_user:gateway_pass@postgres:5432/payment_gateway
PORT=8000
TEST_MERCHANT_EMAIL=test@example.com
TEST_API_KEY=key_test_abc123
TEST_API_SECRET=secret_test_xyz789
UPI_SUCCESS_RATE=0.90
CARD_SUCCESS_RATE=0.95
PROCESSING_DELAY_MIN=5000
PROCESSING_DELAY_MAX=10000
TEST_MODE=false
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
```

---

## 🧹 Maintenance

### Stop App

```bash
docker-compose down
```

### Reset DB & Containers

```bash
docker-compose down -v
docker-compose up -d --build
```

### Logs

```bash
docker-compose logs -f
```

---

## 🐛 Troubleshooting

| Issue           | Fix                               |
| --------------- | --------------------------------- |
| Not reachable   | Check ports 3000/3001/8000        |
| DB errors       | `docker-compose restart postgres` |
| Frontend stale  | Hard refresh / rebuild            |
| Wrong API creds | Use `/api/v1/test/merchant`       |

---
