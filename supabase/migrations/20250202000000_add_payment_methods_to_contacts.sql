-- Add payment methods column to contacts table
-- Structure allows multiple payment providers: { "stripe": { "customer_id": "...", "payment_method_id": "..." }, "windcave": { "customer_id": "...", "token": "..." } }

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}'::jsonb;

-- Add index for querying payment methods
CREATE INDEX IF NOT EXISTS idx_contacts_payment_methods ON contacts USING gin (payment_methods);

-- Add comment explaining the structure
COMMENT ON COLUMN contacts.payment_methods IS 'Payment method tokens for various providers. Structure: { "stripe": { "customer_id": "cus_xxx", "payment_method_id": "pm_xxx", "last4": "4242", "brand": "visa" }, "windcave": { "customer_id": "...", "token": "..." } }';
