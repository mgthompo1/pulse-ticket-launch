-- Abandoned Cart Recovery System
-- Tracks incomplete checkouts and enables recovery emails

-- Create abandoned_carts table
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Customer info captured during checkout
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,

  -- Cart contents (JSON array of ticket selections)
  cart_items JSONB NOT NULL DEFAULT '[]',
  cart_total DECIMAL(10,2) DEFAULT 0,

  -- Tracking
  session_id TEXT, -- Browser session identifier
  source_url TEXT, -- Where they came from (UTM tracking)
  device_type TEXT, -- desktop, mobile, tablet

  -- Recovery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'email_sent', 'recovered', 'expired', 'unsubscribed')),
  emails_sent INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_order_id UUID REFERENCES public.orders(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Unique constraint to prevent duplicates per session
  UNIQUE(event_id, customer_email, session_id)
);

-- Create index for efficient queries
CREATE INDEX idx_abandoned_carts_event ON public.abandoned_carts(event_id);
CREATE INDEX idx_abandoned_carts_org ON public.abandoned_carts(organization_id);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts(customer_email);
CREATE INDEX idx_abandoned_carts_created ON public.abandoned_carts(created_at);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their abandoned carts"
  ON public.abandoned_carts FOR SELECT
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert abandoned carts"
  ON public.abandoned_carts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Organizations can update their abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

-- Add abandoned cart settings to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abandoned_cart_delay_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS abandoned_cart_email_subject TEXT DEFAULT 'You left something behind!',
ADD COLUMN IF NOT EXISTS abandoned_cart_email_content TEXT,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_code TEXT,
ADD COLUMN IF NOT EXISTS abandoned_cart_discount_percent INTEGER DEFAULT 10;

-- Create function to mark cart as recovered when order is placed
CREATE OR REPLACE FUNCTION mark_cart_recovered()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.abandoned_carts
  SET
    status = 'recovered',
    recovered_at = NOW(),
    recovered_order_id = NEW.id,
    updated_at = NOW()
  WHERE
    event_id = NEW.event_id
    AND customer_email = NEW.customer_email
    AND status IN ('pending', 'email_sent');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-mark recovered carts
DROP TRIGGER IF EXISTS trigger_mark_cart_recovered ON public.orders;
CREATE TRIGGER trigger_mark_cart_recovered
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION mark_cart_recovered();

-- Add comment
COMMENT ON TABLE public.abandoned_carts IS 'Tracks incomplete checkouts for recovery email campaigns';
