-- ===============================
-- STEP 2: ASYNC PAYMENT FEATURES
-- ===============================

-- 1️⃣ Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Index for fast refund lookup by payment
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id
ON refunds(payment_id);


-- 2️⃣ Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant_id
ON webhook_logs(merchant_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
ON webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_next_retry
ON webhook_logs(next_retry_at)
WHERE status = 'pending';


-- 3️⃣ Idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (key, merchant_id)
);


-- 4️⃣ Merchants table modification
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64);


-- 5️⃣ Set webhook secret for test merchant
UPDATE merchants
SET webhook_secret = 'whsec_test_abc123'
WHERE email = 'test@example.com';
