-- Migration: Create Stripe Issuing System for Groups
-- Description: Virtual card issuance for coordinators with parent top-ups and interchange tracking

-- ============================================================================
-- 1. Add issuing_enabled feature flag to organizations
-- ============================================================================
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS issuing_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN organizations.issuing_enabled IS
'Feature flag to enable Stripe Issuing for this organization (requires Stripe Connect)';

-- ============================================================================
-- 2. Virtual Cards Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS issuing_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Card type and purpose
  card_type TEXT NOT NULL CHECK (card_type IN ('coordinator', 'leader', 'camper', 'general')),
  purpose TEXT, -- "Youth Leader Gas & Food", "Summer Camp Spending Money", etc.

  -- Stripe Issuing IDs
  stripe_cardholder_id TEXT NOT NULL UNIQUE,
  stripe_card_id TEXT NOT NULL UNIQUE,

  -- Cardholder details
  cardholder_name TEXT NOT NULL,
  cardholder_email TEXT,
  cardholder_phone TEXT,
  cardholder_dob DATE, -- Required for individual cardholders

  -- Card details (non-sensitive)
  card_last4 TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  card_status TEXT NOT NULL DEFAULT 'active' CHECK (
    card_status IN ('active', 'inactive', 'cancelled', 'suspended', 'expired')
  ),

  -- Financial tracking (in cents)
  initial_balance INTEGER NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
  current_balance INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  total_authorized INTEGER NOT NULL DEFAULT 0 CHECK (total_authorized >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),

  -- Spending controls
  spending_limit_amount INTEGER, -- per interval, in cents
  spending_limit_interval TEXT CHECK (
    spending_limit_interval IN ('per_authorization', 'daily', 'weekly', 'monthly', 'yearly', 'all_time')
  ),
  allowed_merchant_categories TEXT[], -- Stripe merchant category codes
  blocked_merchant_categories TEXT[],
  allowed_countries TEXT[] DEFAULT ARRAY['US'],

  -- Lifecycle
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  issued_by UUID REFERENCES auth.users(id),

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_issuing_cards_organization ON issuing_cards(organization_id);
CREATE INDEX idx_issuing_cards_group ON issuing_cards(group_id);
CREATE INDEX idx_issuing_cards_stripe_card ON issuing_cards(stripe_card_id);
CREATE INDEX idx_issuing_cards_stripe_cardholder ON issuing_cards(stripe_cardholder_id);
CREATE INDEX idx_issuing_cards_status ON issuing_cards(card_status);
CREATE INDEX idx_issuing_cards_cardholder_email ON issuing_cards(cardholder_email);

COMMENT ON TABLE issuing_cards IS
'Virtual prepaid cards issued via Stripe Issuing for groups and coordinators';

-- ============================================================================
-- 3. Card Authorizations/Transactions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS issuing_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES issuing_cards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Stripe IDs
  stripe_authorization_id TEXT UNIQUE,
  stripe_transaction_id TEXT UNIQUE,

  -- Transaction details (in cents)
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Merchant details
  merchant_name TEXT,
  merchant_category TEXT,
  merchant_category_code TEXT,
  merchant_city TEXT,
  merchant_state TEXT,
  merchant_country TEXT,
  merchant_postal_code TEXT,

  -- Transaction type and status
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('authorization', 'capture', 'refund', 'reversal')
  ),
  authorization_status TEXT CHECK (
    authorization_status IN ('pending', 'approved', 'declined', 'reversed')
  ),

  -- Approval/decline details
  approved BOOLEAN,
  decline_reason TEXT,

  -- Interchange (in cents) - earned by organization
  interchange_amount INTEGER DEFAULT 0,
  interchange_rate DECIMAL(5,4), -- e.g., 0.0175 for 1.75%

  -- Timestamps
  authorized_at TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_issuing_transactions_card ON issuing_transactions(card_id);
CREATE INDEX idx_issuing_transactions_organization ON issuing_transactions(organization_id);
CREATE INDEX idx_issuing_transactions_group ON issuing_transactions(group_id);
CREATE INDEX idx_issuing_transactions_stripe_auth ON issuing_transactions(stripe_authorization_id);
CREATE INDEX idx_issuing_transactions_stripe_txn ON issuing_transactions(stripe_transaction_id);
CREATE INDEX idx_issuing_transactions_created_at ON issuing_transactions(created_at DESC);
CREATE INDEX idx_issuing_transactions_authorized_at ON issuing_transactions(authorized_at DESC);

COMMENT ON TABLE issuing_transactions IS
'Transaction history for virtual cards, synced from Stripe Issuing webhooks';

COMMENT ON COLUMN issuing_transactions.interchange_amount IS
'Interchange revenue earned by organization from this transaction (in cents)';

-- ============================================================================
-- 4. Card Loads (Funding Events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS issuing_card_loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES issuing_cards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Load details (in cents)
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Source of funds
  source_type TEXT NOT NULL CHECK (
    source_type IN ('organization', 'parent_topup', 'refund', 'adjustment')
  ),

  -- Payment details
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'completed', 'failed', 'refunded')
  ),

  -- Who loaded it
  loaded_by UUID REFERENCES auth.users(id),
  parent_email TEXT, -- If loaded by parent via top-up link

  -- Top-up link tracking
  topup_token TEXT UNIQUE, -- Secure token for parent top-up links
  topup_token_expires_at TIMESTAMP WITH TIME ZONE,
  topup_token_used_at TIMESTAMP WITH TIME ZONE,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_issuing_loads_card ON issuing_card_loads(card_id);
CREATE INDEX idx_issuing_loads_organization ON issuing_card_loads(organization_id);
CREATE INDEX idx_issuing_loads_group ON issuing_card_loads(group_id);
CREATE INDEX idx_issuing_loads_topup_token ON issuing_card_loads(topup_token);
CREATE INDEX idx_issuing_loads_payment_intent ON issuing_card_loads(stripe_payment_intent_id);
CREATE INDEX idx_issuing_loads_created_at ON issuing_card_loads(created_at DESC);

COMMENT ON TABLE issuing_card_loads IS
'History of funds loaded onto virtual cards from various sources';

COMMENT ON COLUMN issuing_card_loads.topup_token IS
'Secure token for parent top-up links (e.g., /topup/abc123xyz)';

-- ============================================================================
-- 5. Interchange Payouts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS issuing_interchange_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Payout period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Financial summary (in cents)
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_transaction_volume INTEGER NOT NULL DEFAULT 0,
  total_interchange_earned INTEGER NOT NULL DEFAULT 0,
  organization_share INTEGER NOT NULL DEFAULT 0, -- e.g., 80% of interchange
  platform_share INTEGER NOT NULL DEFAULT 0, -- e.g., 20% of interchange

  -- Share percentages
  organization_share_percentage DECIMAL(5,2) DEFAULT 80.00, -- 80%
  platform_share_percentage DECIMAL(5,2) DEFAULT 20.00, -- 20%

  -- Payout details
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payout_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')
  ),
  stripe_payout_id TEXT,
  payout_date DATE,
  payout_method TEXT DEFAULT 'stripe_transfer', -- or 'manual', 'invoice_credit'

  -- Notes and metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_interchange_payouts_organization ON issuing_interchange_payouts(organization_id);
CREATE INDEX idx_interchange_payouts_status ON issuing_interchange_payouts(payout_status);
CREATE INDEX idx_interchange_payouts_period ON issuing_interchange_payouts(period_start, period_end);
CREATE INDEX idx_interchange_payouts_created_at ON issuing_interchange_payouts(created_at DESC);

COMMENT ON TABLE issuing_interchange_payouts IS
'Tracks interchange revenue sharing and payouts to organizations';

COMMENT ON COLUMN issuing_interchange_payouts.organization_share IS
'Amount paid to organization from interchange revenue (in cents)';

-- ============================================================================
-- 6. Interchange Balance View (Real-time)
-- ============================================================================
CREATE OR REPLACE VIEW issuing_interchange_balances AS
SELECT
  t.organization_id,
  o.name AS organization_name,
  COUNT(DISTINCT t.card_id) AS active_cards,
  COUNT(t.id) AS total_transactions,
  SUM(t.amount) AS total_volume,
  SUM(t.interchange_amount) AS total_interchange_earned,
  -- Calculate available balance (earned - paid out)
  COALESCE(SUM(t.interchange_amount), 0) - COALESCE(
    (SELECT SUM(organization_share)
     FROM issuing_interchange_payouts
     WHERE organization_id = t.organization_id
     AND payout_status = 'paid'), 0
  ) AS available_balance,
  -- Pending payout
  COALESCE(
    (SELECT SUM(organization_share)
     FROM issuing_interchange_payouts
     WHERE organization_id = t.organization_id
     AND payout_status IN ('pending', 'processing')), 0
  ) AS pending_payout
FROM issuing_transactions t
JOIN organizations o ON o.id = t.organization_id
WHERE t.approved = TRUE
  AND t.transaction_type IN ('authorization', 'capture')
GROUP BY t.organization_id, o.name;

COMMENT ON VIEW issuing_interchange_balances IS
'Real-time view of interchange earnings and available balances per organization';

-- ============================================================================
-- 7. Card Activity Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS issuing_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  card_id UUID REFERENCES issuing_cards(id) ON DELETE SET NULL,

  -- Activity details
  action TEXT NOT NULL, -- 'card_issued', 'card_loaded', 'card_cancelled', 'transaction_approved', etc.
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'coordinator', 'parent')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,

  -- Context
  entity_type TEXT, -- 'card', 'transaction', 'load', 'payout'
  entity_id UUID,

  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_issuing_activity_organization ON issuing_activity_log(organization_id);
CREATE INDEX idx_issuing_activity_group ON issuing_activity_log(group_id);
CREATE INDEX idx_issuing_activity_card ON issuing_activity_log(card_id);
CREATE INDEX idx_issuing_activity_created_at ON issuing_activity_log(created_at DESC);

COMMENT ON TABLE issuing_activity_log IS
'Audit log for all issuing activities (card creation, loads, transactions, etc.)';

-- ============================================================================
-- 8. Functions
-- ============================================================================

-- Function to update card balance after transactions
CREATE OR REPLACE FUNCTION update_card_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update card balances based on transaction type
  IF NEW.transaction_type = 'authorization' AND NEW.approved = TRUE THEN
    UPDATE issuing_cards
    SET
      total_authorized = total_authorized + NEW.amount,
      current_balance = current_balance - NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.card_id;
  ELSIF NEW.transaction_type = 'capture' AND NEW.approved = TRUE THEN
    UPDATE issuing_cards
    SET
      total_spent = total_spent + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.card_id;
  ELSIF NEW.transaction_type = 'refund' THEN
    UPDATE issuing_cards
    SET
      current_balance = current_balance + NEW.amount,
      total_spent = total_spent - NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.card_id;
  ELSIF NEW.transaction_type = 'reversal' THEN
    UPDATE issuing_cards
    SET
      total_authorized = total_authorized - NEW.amount,
      current_balance = current_balance + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.card_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_balance
AFTER INSERT ON issuing_transactions
FOR EACH ROW
EXECUTE FUNCTION update_card_balance_on_transaction();

-- Function to update card balance after loads
CREATE OR REPLACE FUNCTION update_card_balance_on_load()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE issuing_cards
    SET
      current_balance = current_balance + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.card_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_balance_on_load
AFTER INSERT OR UPDATE ON issuing_card_loads
FOR EACH ROW
EXECUTE FUNCTION update_card_balance_on_load();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_issuing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issuing_cards_updated_at
BEFORE UPDATE ON issuing_cards
FOR EACH ROW
EXECUTE FUNCTION update_issuing_updated_at();

CREATE TRIGGER update_interchange_payouts_updated_at
BEFORE UPDATE ON issuing_interchange_payouts
FOR EACH ROW
EXECUTE FUNCTION update_issuing_updated_at();

-- ============================================================================
-- 9. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE issuing_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuing_card_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuing_interchange_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuing_activity_log ENABLE ROW LEVEL SECURITY;

-- Organizations can manage their own issuing cards
CREATE POLICY "Organizations can manage their issuing cards"
ON issuing_cards FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations
    WHERE user_id = auth.uid()
  )
);

-- Organizations can view their transactions
CREATE POLICY "Organizations can view their transactions"
ON issuing_transactions FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
    WHERE user_id = auth.uid()
  )
);

-- Organizations can manage their card loads
CREATE POLICY "Organizations can manage card loads"
ON issuing_card_loads FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations
    WHERE user_id = auth.uid()
  )
);

-- Public can use top-up tokens (for parent top-ups)
CREATE POLICY "Public can create loads with valid topup token"
ON issuing_card_loads FOR INSERT
WITH CHECK (
  topup_token IS NOT NULL
  AND topup_token_expires_at > NOW()
);

-- Organizations can view their interchange payouts
CREATE POLICY "Organizations can view their interchange payouts"
ON issuing_interchange_payouts FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
    WHERE user_id = auth.uid()
  )
);

-- Organizations can view their activity log
CREATE POLICY "Organizations can view their activity log"
ON issuing_activity_log FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 10. Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON issuing_cards TO authenticated;
GRANT SELECT ON issuing_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issuing_card_loads TO authenticated, anon; -- anon for parent top-ups
GRANT SELECT ON issuing_interchange_payouts TO authenticated;
GRANT SELECT ON issuing_activity_log TO authenticated;
GRANT SELECT ON issuing_interchange_balances TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ============================================================================
-- 11. Sample Data Comments
-- ============================================================================

COMMENT ON COLUMN issuing_cards.allowed_merchant_categories IS
'Stripe merchant category codes: gas_stations, restaurants, grocery_stores, etc.
See: https://stripe.com/docs/issuing/controls/spending-controls#categories';

COMMENT ON COLUMN issuing_transactions.interchange_rate IS
'Typical interchange rates: 1.5%-2.5% for credit transactions
Calculated as percentage of transaction amount';

COMMENT ON COLUMN issuing_interchange_payouts.organization_share_percentage IS
'Percentage of interchange shared with organization (default 80%)
Platform keeps remaining 20% for operational costs';
