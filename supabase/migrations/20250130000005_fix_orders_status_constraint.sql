-- Fix orders table status constraint to allow 'completed' status
-- The current constraint only allows: 'pending', 'paid', 'cancelled', 'refunded'
-- But the system needs to use 'completed' status for successful payments

-- Drop the existing constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the updated constraint that includes 'completed'
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'completed'));
