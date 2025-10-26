-- Add donation_amount field to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS donation_amount DECIMAL(10, 2) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_donation_amount ON orders(donation_amount) WHERE donation_amount > 0;
