-- Add dashboard_config column to organizations for storing customizable dashboard preferences
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.dashboard_config IS 'Stores user preferences for dashboard widget layout, enabled widgets, and chart types';
