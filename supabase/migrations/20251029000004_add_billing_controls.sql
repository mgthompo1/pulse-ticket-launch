-- Add billing control fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS billing_suspended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_suspended_by TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Add billing control fields to billing_customers table
ALTER TABLE public.billing_customers
ADD COLUMN IF NOT EXISTS billing_suspended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_interval_days INTEGER NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMP WITH TIME ZONE;

-- Create index for billing suspension lookups
CREATE INDEX IF NOT EXISTS idx_organizations_billing_suspended
ON public.organizations(billing_suspended)
WHERE billing_suspended = true;

CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at
ON public.organizations(trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_customers_next_billing
ON public.billing_customers(next_billing_at)
WHERE next_billing_at IS NOT NULL;

-- Create function to get organization statistics
CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id UUID)
RETURNS TABLE(
  total_events BIGINT,
  active_events BIGINT,
  total_orders BIGINT,
  total_tickets_sold BIGINT,
  total_revenue NUMERIC,
  total_platform_fees NUMERIC,
  pending_invoices BIGINT,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  billing_status TEXT,
  is_trial BOOLEAN,
  trial_days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Events
    (SELECT COUNT(*) FROM public.events WHERE organization_id = p_organization_id)::BIGINT as total_events,
    (SELECT COUNT(*) FROM public.events WHERE organization_id = p_organization_id AND status = 'published')::BIGINT as active_events,

    -- Orders
    (SELECT COUNT(*) FROM public.orders o
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id)::BIGINT as total_orders,

    -- Tickets
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM public.order_items oi
     JOIN public.orders o ON oi.order_id = o.id
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id AND oi.item_type = 'ticket')::BIGINT as total_tickets_sold,

    -- Revenue
    (SELECT COALESCE(SUM(o.total_amount), 0) FROM public.orders o
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id AND o.status = 'paid')::NUMERIC as total_revenue,

    -- Platform Fees
    (SELECT COALESCE(SUM(total_platform_fee), 0) FROM public.usage_records
     WHERE organization_id = p_organization_id)::NUMERIC as total_platform_fees,

    -- Pending Invoices
    (SELECT COUNT(*) FROM public.billing_invoices
     WHERE organization_id = p_organization_id AND status = 'pending')::BIGINT as pending_invoices,

    -- Billing Info
    (SELECT bc.next_billing_at FROM public.billing_customers bc
     WHERE bc.organization_id = p_organization_id
     LIMIT 1) as next_billing_date,

    (SELECT bc.billing_status FROM public.billing_customers bc
     WHERE bc.organization_id = p_organization_id
     LIMIT 1) as billing_status,

    -- Trial Info
    (SELECT o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW()
     FROM public.organizations o
     WHERE o.id = p_organization_id) as is_trial,

    (SELECT CASE
       WHEN o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW()
       THEN EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER
       ELSE 0
     END
     FROM public.organizations o
     WHERE o.id = p_organization_id) as trial_days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_organization_stats(UUID) TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.billing_suspended IS 'Whether billing is suspended for this organization';
COMMENT ON COLUMN public.organizations.billing_suspended_reason IS 'Reason for billing suspension (e.g., trial period, special arrangement)';
COMMENT ON COLUMN public.organizations.billing_suspended_at IS 'When billing was suspended';
COMMENT ON COLUMN public.organizations.billing_suspended_by IS 'Admin email who suspended billing';
COMMENT ON COLUMN public.organizations.trial_ends_at IS 'When the trial period ends';
COMMENT ON COLUMN public.organizations.trial_started_at IS 'When the trial period started';
COMMENT ON FUNCTION get_organization_stats IS 'Get comprehensive statistics for an organization including events, tickets, revenue, and billing info';
