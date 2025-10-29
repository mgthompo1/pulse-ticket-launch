-- =====================================================================
-- Payouts and Fees Tracking System
-- =====================================================================
-- This schema tracks payouts/deposits and associated fees from payment
-- processors (Stripe, Windcave) to organization bank accounts.
--
-- Features:
-- - Track all payouts/deposits from payment processors
-- - Record platform fees, processor fees, and net amounts
-- - Support multiple payment processors (Stripe, Windcave)
-- - Link payouts to specific orders/transactions
-- - Webhook-based automatic sync
-- =====================================================================

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Payment processor info
  payment_processor VARCHAR(50) NOT NULL CHECK (payment_processor IN ('stripe', 'windcave')),
  processor_payout_id VARCHAR(255) UNIQUE NOT NULL, -- Stripe payout ID or Windcave settlement ID
  processor_account_id VARCHAR(255), -- Stripe account ID or Windcave merchant ID

  -- Payout details
  payout_date TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE, -- Expected/actual arrival date in bank account
  payout_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),

  -- Financial breakdown (all amounts in the payout currency)
  gross_amount DECIMAL(12,2) NOT NULL, -- Total before fees
  processor_fees DECIMAL(12,2) NOT NULL DEFAULT 0, -- Stripe/Windcave fees
  platform_fees DECIMAL(12,2) NOT NULL DEFAULT 0, -- Your platform fees (if using Connect)
  refunds_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Refunds deducted from payout
  adjustments_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Other adjustments
  net_amount DECIMAL(12,2) NOT NULL, -- Final amount deposited to bank

  currency VARCHAR(3) NOT NULL DEFAULT 'NZD',

  -- Bank account info
  bank_account_last4 VARCHAR(4),
  bank_name VARCHAR(255),

  -- Metadata
  description TEXT,
  statement_descriptor VARCHAR(255),
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_line_items table (links payouts to specific charges/orders)
CREATE TABLE IF NOT EXISTS public.payout_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,

  -- Link to order/transaction
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_intent_id VARCHAR(255), -- Stripe payment intent or Windcave transaction ID

  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'adjustment', 'fee')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Financial details
  gross_amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NZD',

  -- Description
  description TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_fees_breakdown table (detailed fee breakdown)
CREATE TABLE IF NOT EXISTS public.payout_fees_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,

  -- Fee type
  fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('stripe_fee', 'platform_fee', 'refund_fee', 'chargeback_fee', 'other')),
  fee_description VARCHAR(255),

  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NZD',

  -- Related transaction
  payment_intent_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_fees_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only organization members can view their payouts
CREATE POLICY "payouts_select_org_members"
ON public.payouts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id IN (
    SELECT ou.organization_id
    FROM public.organization_users ou
    WHERE ou.user_id = auth.uid()
  )
);

CREATE POLICY "payout_line_items_select_org_members"
ON public.payout_line_items
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND payout_id IN (
    SELECT p.id FROM public.payouts p
    JOIN public.organization_users ou ON p.organization_id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  )
);

CREATE POLICY "payout_fees_breakdown_select_org_members"
ON public.payout_fees_breakdown
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND payout_id IN (
    SELECT p.id FROM public.payouts p
    JOIN public.organization_users ou ON p.organization_id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  )
);

-- System can insert/update payouts (for webhooks and sync functions)
CREATE POLICY "payouts_insert_system"
ON public.payouts
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "payouts_update_system"
ON public.payouts
FOR UPDATE
TO authenticated, service_role
USING (true);

CREATE POLICY "payout_line_items_insert_system"
ON public.payout_line_items
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "payout_fees_breakdown_insert_system"
ON public.payout_fees_breakdown
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_payouts_org_id ON public.payouts(organization_id);
CREATE INDEX idx_payouts_processor ON public.payouts(payment_processor);
CREATE INDEX idx_payouts_status ON public.payouts(payout_status);
CREATE INDEX idx_payouts_payout_date ON public.payouts(payout_date DESC);
CREATE INDEX idx_payouts_processor_payout_id ON public.payouts(processor_payout_id);
CREATE INDEX idx_payout_line_items_payout_id ON public.payout_line_items(payout_id);
CREATE INDEX idx_payout_line_items_order_id ON public.payout_line_items(order_id);
CREATE INDEX idx_payout_fees_breakdown_payout_id ON public.payout_fees_breakdown(payout_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payouts updated_at
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();

-- Create helper function to get payout summary for an organization
CREATE OR REPLACE FUNCTION get_payout_summary(p_organization_id UUID, p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS TABLE(
  total_payouts BIGINT,
  total_gross DECIMAL(12,2),
  total_fees DECIMAL(12,2),
  total_net DECIMAL(12,2),
  pending_amount DECIMAL(12,2),
  paid_amount DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_payouts,
    COALESCE(SUM(p.gross_amount), 0) as total_gross,
    COALESCE(SUM(p.processor_fees + p.platform_fees), 0) as total_fees,
    COALESCE(SUM(p.net_amount), 0) as total_net,
    COALESCE(SUM(CASE WHEN p.payout_status IN ('pending', 'in_transit') THEN p.net_amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN p.payout_status = 'paid' THEN p.net_amount ELSE 0 END), 0) as paid_amount
  FROM public.payouts p
  WHERE p.organization_id = p_organization_id
    AND (p_start_date IS NULL OR p.payout_date >= p_start_date)
    AND (p_end_date IS NULL OR p.payout_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION get_payout_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.payouts IS 'Tracks all payouts/deposits from payment processors (Stripe, Windcave) to organization bank accounts';
COMMENT ON TABLE public.payout_line_items IS 'Individual transactions (charges, refunds) included in each payout';
COMMENT ON TABLE public.payout_fees_breakdown IS 'Detailed breakdown of fees associated with each payout';
COMMENT ON FUNCTION get_payout_summary IS 'Helper function to get summary statistics for an organization''s payouts over a date range';
