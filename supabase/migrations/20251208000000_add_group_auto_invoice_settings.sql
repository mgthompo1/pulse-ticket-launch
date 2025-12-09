-- Add auto-invoice settings for group sales
-- Allows organizations to configure automatic invoice generation frequency

-- Add column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS group_auto_invoice_frequency TEXT DEFAULT NULL;

-- Valid values: 'daily', '3_days', 'weekly', 'biweekly', 'monthly', NULL (disabled/manual)

-- Add column to track last auto-invoice run
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS group_auto_invoice_last_run TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.group_auto_invoice_frequency IS 'Auto-invoice frequency for group sales: daily, 3_days, weekly, biweekly, monthly, or NULL for manual';
COMMENT ON COLUMN organizations.group_auto_invoice_last_run IS 'Timestamp of last automatic invoice generation run';
