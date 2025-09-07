-- Add card detail columns to orders table (safe version)
-- These columns are needed to store payment method information for receipts and emails

-- Add columns only if they don't exist
DO $$ 
BEGIN
    -- Add payment_method_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method_type') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method_type TEXT;
    END IF;
    
    -- Add card_last_four if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'card_last_four') THEN
        ALTER TABLE public.orders ADD COLUMN card_last_four TEXT;
    END IF;
    
    -- Add card_brand if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'card_brand') THEN
        ALTER TABLE public.orders ADD COLUMN card_brand TEXT;
    END IF;
    
    -- Add payment_method_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method_id') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method_id TEXT;
    END IF;
    
    -- Add booking_fee if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'booking_fee') THEN
        ALTER TABLE public.orders ADD COLUMN booking_fee DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add processing_fee if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'processing_fee') THEN
        ALTER TABLE public.orders ADD COLUMN processing_fee DECIMAL(10,2);
    END IF;
    
    -- Add subtotal_amount if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'subtotal_amount') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal_amount DECIMAL(10,2);
    END IF;
    
    -- Add booking_fee_amount if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'booking_fee_amount') THEN
        ALTER TABLE public.orders ADD COLUMN booking_fee_amount DECIMAL(10,2);
    END IF;
    
    -- Add booking_fee_enabled if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'booking_fee_enabled') THEN
        ALTER TABLE public.orders ADD COLUMN booking_fee_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- Add stripe_payment_intent_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE public.orders ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
END $$;

-- Add index on stripe_payment_intent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON public.orders(stripe_payment_intent_id);

-- Add index on payment_method_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id ON public.orders(payment_method_id);
