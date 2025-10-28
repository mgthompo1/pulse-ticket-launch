-- Add comprehensive tax system to TicketFlo
-- Supports GST (NZ, AU), VAT (UK, EU), Sales Tax (US), and GST/HST/PST (Canada)

-- Add tax configuration to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50) DEFAULT 'Tax',
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_country VARCHAR(2),
ADD COLUMN IF NOT EXISTS tax_region VARCHAR(100);

-- Add comments explaining each field
COMMENT ON COLUMN public.organizations.tax_enabled IS 'Whether tax collection is enabled for this organization';
COMMENT ON COLUMN public.organizations.tax_name IS 'Display name for tax (GST, VAT, Sales Tax, HST, etc.)';
COMMENT ON COLUMN public.organizations.tax_rate IS 'Tax rate as percentage (e.g., 15.00 for 15%)';
COMMENT ON COLUMN public.organizations.tax_inclusive IS 'TRUE = prices include tax (AU, NZ, UK, EU). FALSE = tax added at checkout (US, CA)';
COMMENT ON COLUMN public.organizations.tax_number IS 'Tax registration number (GST number, VAT number, etc.)';
COMMENT ON COLUMN public.organizations.tax_country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN public.organizations.tax_region IS 'State/Province for US/Canada tax jurisdictions';

-- Add tax tracking to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_on_tickets DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_on_addons DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_on_donations DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_on_fees DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS booking_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS booking_fee_tax DECIMAL(10,2) DEFAULT 0.00;

-- Add comments for order tax fields
COMMENT ON COLUMN public.orders.subtotal IS 'Pre-tax amount (tickets + add-ons + donations)';
COMMENT ON COLUMN public.orders.tax_rate IS 'Tax rate applied at time of purchase (historical record)';
COMMENT ON COLUMN public.orders.tax_amount IS 'Total tax charged (sum of all tax components)';
COMMENT ON COLUMN public.orders.tax_name IS 'Tax name at time of purchase (GST, VAT, etc.)';
COMMENT ON COLUMN public.orders.tax_inclusive IS 'Whether prices included tax at purchase time';
COMMENT ON COLUMN public.orders.tax_on_tickets IS 'Tax specifically on ticket sales';
COMMENT ON COLUMN public.orders.tax_on_addons IS 'Tax on add-ons/merchandise';
COMMENT ON COLUMN public.orders.tax_on_donations IS 'Tax on donations';
COMMENT ON COLUMN public.orders.tax_on_fees IS 'Tax on booking/service fees';
COMMENT ON COLUMN public.orders.booking_fee IS 'Booking fee charged (before tax)';
COMMENT ON COLUMN public.orders.booking_fee_tax IS 'Tax on the booking fee';

-- Migrate existing orders to have subtotal = total_amount (backward compatibility)
UPDATE public.orders
SET subtotal = total_amount
WHERE subtotal IS NULL;

-- Create tax presets table for easy configuration
CREATE TABLE IF NOT EXISTS public.tax_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  tax_name VARCHAR(50) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_inclusive BOOLEAN NOT NULL,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common tax presets
INSERT INTO public.tax_presets (country_code, country_name, region, tax_name, tax_rate, tax_inclusive, display_order, notes) VALUES
-- New Zealand
('NZ', 'New Zealand', NULL, 'GST', 15.00, true, 1, 'Goods and Services Tax - 15% on all supplies'),

-- Australia
('AU', 'Australia', NULL, 'GST', 10.00, true, 2, 'Goods and Services Tax - 10% on most goods and services'),

-- United Kingdom
('GB', 'United Kingdom', NULL, 'VAT', 20.00, true, 3, 'Value Added Tax - Standard rate 20%'),
('GB', 'United Kingdom', NULL, 'VAT (Reduced)', 5.00, true, 4, 'Value Added Tax - Reduced rate for some events'),

-- European Union (sample countries)
('IE', 'Ireland', NULL, 'VAT', 23.00, true, 5, 'Value Added Tax - Standard rate'),
('FR', 'France', NULL, 'VAT', 20.00, true, 6, 'TVA - Standard rate'),
('DE', 'Germany', NULL, 'VAT', 19.00, true, 7, 'Mehrwertsteuer (MwSt)'),
('ES', 'Spain', NULL, 'VAT', 21.00, true, 8, 'IVA - Standard rate'),

-- Canada (Provincial variations)
('CA', 'Canada', 'Federal', 'GST', 5.00, false, 10, 'Federal GST only'),
('CA', 'Canada', 'Ontario', 'HST', 13.00, false, 11, 'Harmonized Sales Tax (GST + PST combined)'),
('CA', 'Canada', 'British Columbia', 'GST + PST', 12.00, false, 12, '5% GST + 7% PST'),
('CA', 'Canada', 'Quebec', 'GST + QST', 14.975, false, 13, '5% GST + 9.975% QST'),
('CA', 'Canada', 'Alberta', 'GST', 5.00, false, 14, 'GST only (no provincial tax)'),
('CA', 'Canada', 'Nova Scotia', 'HST', 15.00, false, 15, 'Harmonized Sales Tax'),

-- United States (sample states - organizers will need to configure their specific location)
('US', 'United States', 'California', 'Sales Tax', 7.25, false, 20, 'Base state rate - local rates may apply'),
('US', 'United States', 'New York', 'Sales Tax', 4.00, false, 21, 'State rate - NYC adds 4.5% + 0.375%'),
('US', 'United States', 'Texas', 'Sales Tax', 6.25, false, 22, 'State rate - local jurisdictions add more'),
('US', 'United States', 'Florida', 'Sales Tax', 6.00, false, 23, 'State rate - some counties add local tax'),
('US', 'United States', 'Illinois', 'Sales Tax', 6.25, false, 24, 'State rate - Chicago adds significant local tax'),
('US', 'United States', 'No Tax States', 'Sales Tax', 0.00, false, 25, 'Alaska, Delaware, Montana, New Hampshire, Oregon');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tax_presets_country ON public.tax_presets(country_code);
CREATE INDEX IF NOT EXISTS idx_tax_presets_region ON public.tax_presets(country_code, region);

-- Enable RLS on tax_presets (read-only for all authenticated users)
ALTER TABLE public.tax_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tax presets are viewable by authenticated users"
ON public.tax_presets
FOR SELECT
TO authenticated
USING (true);

-- Grant access
GRANT SELECT ON public.tax_presets TO authenticated;
GRANT ALL ON public.tax_presets TO service_role;

-- Create indexes on orders for tax reporting
CREATE INDEX IF NOT EXISTS idx_orders_tax_amount ON public.orders(tax_amount) WHERE tax_amount > 0;
CREATE INDEX IF NOT EXISTS idx_orders_tax_country ON public.orders((
  SELECT tax_country FROM organizations WHERE id = orders.event_id::text::uuid
));
