-- Create payment_intents_log table for idempotency
CREATE TABLE IF NOT EXISTS payment_intents_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  payment_intent_id VARCHAR(255),
  client_secret TEXT,
  status VARCHAR(50),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'usd',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast idempotency key lookups
CREATE INDEX IF NOT EXISTS idx_payment_intents_idempotency_key ON payment_intents_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order_id ON payment_intents_log(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents_log(created_at DESC);

-- Create webhook_events_log table for webhook deduplication
CREATE TABLE IF NOT EXISTS webhook_events_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  processing_status VARCHAR(50) DEFAULT 'processed' CHECK (processing_status IN ('processed', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for webhook event lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events_log(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events_log(processing_status) WHERE processing_status = 'failed';

-- Add RLS policies
ALTER TABLE payment_intents_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to payment_intents_log" ON payment_intents_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to webhook_events_log" ON webhook_events_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own payment intent logs
CREATE POLICY "Users can view their payment intents" ON payment_intents_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_intents_log.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE payment_intents_log IS 'Logs all payment intent creation attempts for idempotency and deduplication';
COMMENT ON TABLE webhook_events_log IS 'Logs all webhook events received from payment providers to prevent duplicate processing';
