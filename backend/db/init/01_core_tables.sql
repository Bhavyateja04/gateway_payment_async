CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  receipt TEXT,
  notes JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  method VARCHAR(20) NOT NULL,
  vpa TEXT,
  card_last4 VARCHAR(4),
  card_network TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_code TEXT,
  error_description TEXT,
  captured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
