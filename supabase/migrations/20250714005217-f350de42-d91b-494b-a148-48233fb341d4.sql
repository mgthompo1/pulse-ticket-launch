-- Add Windcave configuration columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS windcave_username TEXT,
ADD COLUMN IF NOT EXISTS windcave_api_key TEXT,
ADD COLUMN IF NOT EXISTS windcave_endpoint TEXT CHECK (windcave_endpoint IN ('SEC', 'UAT')),
ADD COLUMN IF NOT EXISTS windcave_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'windcave'));