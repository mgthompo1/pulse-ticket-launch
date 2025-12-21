-- Add payment_plans_enabled option to groups
-- Allows group coordinators to configure whether payment plans are available for their group members

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS payment_plans_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN groups.payment_plans_enabled IS 'Whether payment plans (deposits/installments) are available for this group''s members';

-- Also add to group_ticket_allocations for per-allocation control (optional override)
ALTER TABLE group_ticket_allocations
ADD COLUMN IF NOT EXISTS payment_plans_enabled BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN group_ticket_allocations.payment_plans_enabled IS 'Override group payment plan setting for this specific allocation (NULL = use group setting)';
