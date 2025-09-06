-- Add booking fee columns to orders table for receipt display
ALTER TABLE public.orders 
ADD COLUMN booking_fee_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN booking_fee_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN subtotal_amount DECIMAL(10,2) DEFAULT 0.00;

-- Add comments to explain the columns
COMMENT ON COLUMN public.orders.booking_fee_amount IS 'Booking fee amount charged to customer (1% + $0.50)';
COMMENT ON COLUMN public.orders.booking_fee_enabled IS 'Whether booking fees were applied to this order';
COMMENT ON COLUMN public.orders.subtotal_amount IS 'Ticket subtotal before booking fees';

-- Update existing orders to have subtotal_amount equal to total_amount (for backwards compatibility)
UPDATE public.orders 
SET subtotal_amount = total_amount 
WHERE subtotal_amount = 0.00;
