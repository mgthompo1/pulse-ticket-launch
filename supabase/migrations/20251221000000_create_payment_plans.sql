-- Migration: Create Payment Plans System
-- Description: Adds payment plans for deposits and installments (requires signed-in user)

-- Create payment_plans table (defines available payment plan options per event/ticket)
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- null = org-wide default
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE, -- null = all tickets
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Plan configuration
  plan_type TEXT NOT NULL DEFAULT 'installment' CHECK (plan_type IN ('deposit', 'installment')),

  -- For deposit plans: initial deposit percentage
  deposit_percentage DECIMAL(5, 2), -- e.g., 50.00 for 50%
  deposit_fixed_amount DECIMAL(10, 2), -- Alternative: fixed deposit amount

  -- For installment plans
  number_of_installments INTEGER DEFAULT 2, -- Total number of payments including initial
  installment_frequency TEXT DEFAULT 'monthly' CHECK (installment_frequency IN ('weekly', 'biweekly', 'monthly')),

  -- Balance due date (for deposits)
  balance_due_days_before_event INTEGER DEFAULT 7, -- Days before event to charge remaining balance

  -- Fees
  payment_plan_fee_percentage DECIMAL(5, 2) DEFAULT 0, -- Additional fee for using payment plan
  payment_plan_fee_fixed DECIMAL(10, 2) DEFAULT 0,

  -- Restrictions
  min_order_amount DECIMAL(10, 2) DEFAULT 0, -- Minimum order to qualify for payment plan
  max_order_amount DECIMAL(10, 2), -- Maximum order for payment plan (null = unlimited)
  requires_account BOOLEAN NOT NULL DEFAULT true, -- Must be signed in to use

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_org ON payment_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_event ON payment_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_ticket ON payment_plans(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(organization_id, is_active);

-- Create order_payment_schedules table (tracks scheduled payments for orders)
CREATE TABLE IF NOT EXISTS order_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Schedule details
  installment_number INTEGER NOT NULL, -- 1 = initial payment, 2+ = subsequent
  amount DECIMAL(10, 2) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,

  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  paid_at TIMESTAMPTZ,

  -- Stripe payment tracking
  stripe_payment_intent_id TEXT,
  stripe_payment_method_id TEXT, -- Saved payment method for auto-charge
  stripe_customer_id TEXT,

  -- Retry/failure handling
  last_attempt_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  failure_reason TEXT,
  next_retry_at TIMESTAMPTZ,

  -- Notifications
  reminder_sent_at TIMESTAMPTZ,
  overdue_notice_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payment_schedules_order ON order_payment_schedules(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_schedules_customer ON order_payment_schedules(customer_email);
CREATE INDEX IF NOT EXISTS idx_order_payment_schedules_status ON order_payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_order_payment_schedules_due ON order_payment_schedules(due_date, status);
CREATE INDEX IF NOT EXISTS idx_order_payment_schedules_pending ON order_payment_schedules(status, due_date) WHERE status = 'pending';

-- Add payment plan reference to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_plan_status TEXT CHECK (payment_plan_status IN ('active', 'completed', 'defaulted', 'cancelled')),
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_payment_plan ON orders(payment_plan_id) WHERE payment_plan_id IS NOT NULL;

-- Add payment_plans_enabled to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS payment_plans_enabled BOOLEAN DEFAULT false;

-- Function to update payment schedule timestamps
CREATE OR REPLACE FUNCTION update_payment_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment schedule updates
DROP TRIGGER IF EXISTS trigger_update_payment_schedule_timestamp ON order_payment_schedules;
CREATE TRIGGER trigger_update_payment_schedule_timestamp
  BEFORE UPDATE ON order_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedule_timestamp();

-- Function to update payment plan timestamps
CREATE OR REPLACE FUNCTION update_payment_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment plan updates
DROP TRIGGER IF EXISTS trigger_update_payment_plan_timestamp ON payment_plans;
CREATE TRIGGER trigger_update_payment_plan_timestamp
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_plan_timestamp();

-- Function to update order payment status when schedules are paid
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid_amount DECIMAL(10, 2);
  total_scheduled DECIMAL(10, 2);
  order_total DECIMAL(10, 2);
BEGIN
  -- Only process if status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Calculate total paid for this order
    SELECT COALESCE(SUM(amount), 0) INTO total_paid_amount
    FROM order_payment_schedules
    WHERE order_id = NEW.order_id AND status = 'paid';

    -- Get total scheduled amount
    SELECT COALESCE(SUM(amount), 0) INTO total_scheduled
    FROM order_payment_schedules
    WHERE order_id = NEW.order_id;

    -- Update the order
    UPDATE orders
    SET
      total_paid = total_paid_amount,
      remaining_balance = total_scheduled - total_paid_amount,
      payment_plan_status = CASE
        WHEN total_paid_amount >= total_scheduled THEN 'completed'
        ELSE 'active'
      END
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order when payment schedule is paid
DROP TRIGGER IF EXISTS trigger_update_order_payment_status ON order_payment_schedules;
CREATE TRIGGER trigger_update_order_payment_status
  AFTER UPDATE ON order_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_order_payment_status();

-- RLS Policies
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Payment Plans policies
CREATE POLICY "Users can view payment plans for their organizations"
  ON payment_plans FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage payment plans"
  ON payment_plans FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public access for active payment plans (for widget)
CREATE POLICY "Public can view active payment plans"
  ON payment_plans FOR SELECT
  USING (is_active = true);

-- Order Payment Schedules policies
CREATE POLICY "Users can view payment schedules for their organization orders"
  ON order_payment_schedules FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can manage payment schedules"
  ON order_payment_schedules FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Customers can view their own payment schedules
CREATE POLICY "Customers can view their payment schedules"
  ON order_payment_schedules FOR SELECT
  USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR customer_id IN (SELECT id FROM contacts WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Grant permissions
GRANT ALL ON payment_plans TO authenticated;
GRANT ALL ON order_payment_schedules TO authenticated;
GRANT SELECT ON payment_plans TO anon;
