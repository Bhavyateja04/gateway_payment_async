-- --------------------------------------------------
-- WEBHOOK SUPPORT
-- --------------------------------------------------

-- Add webhook secret to merchants
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64);

-- Set default test webhook secret
UPDATE merchants
SET webhook_secret = 'whsec_test_abc123'
WHERE email = 'test@example.com';

-- Webhook delivery logs
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_merchant
  ON webhook_logs(merchant_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_status
  ON webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_webhooks_retry
  ON webhook_logs(next_retry_at)
  WHERE status = 'pending';
