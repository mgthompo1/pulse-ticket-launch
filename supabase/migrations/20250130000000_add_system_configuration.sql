-- Add system configuration to organizations table
ALTER TABLE organizations 
ADD COLUMN system_type VARCHAR(20) DEFAULT 'EVENTS' CHECK (system_type IN ('EVENTS', 'ATTRACTIONS'));

-- Comment explaining the system types
COMMENT ON COLUMN organizations.system_type IS 'System configuration: EVENTS for event-based ticketing, ATTRACTIONS for attraction booking system';
