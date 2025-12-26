-- Add attraction dashboard configuration column to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS attraction_dashboard_config JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.attraction_dashboard_config IS 'JSON configuration for attraction dashboard widgets layout and settings';
