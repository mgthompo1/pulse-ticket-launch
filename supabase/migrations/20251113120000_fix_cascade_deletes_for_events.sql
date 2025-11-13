-- Fix cascade deletes for events and related tables
-- This allows events to be deleted along with all their related data

-- Drop the existing foreign key constraint and recreate with CASCADE
ALTER TABLE payment_intents_log
  DROP CONSTRAINT IF EXISTS payment_intents_log_order_id_fkey;

-- Add the foreign key back with CASCADE delete
ALTER TABLE payment_intents_log
  ADD CONSTRAINT payment_intents_log_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES orders(id)
  ON DELETE CASCADE;

-- Ensure orders table has CASCADE delete from events
-- First check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_event_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_event_id_fkey;
  END IF;
END $$;

-- Add the foreign key back with CASCADE delete
ALTER TABLE orders
  ADD CONSTRAINT orders_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE CASCADE;

-- Add comments
COMMENT ON CONSTRAINT payment_intents_log_order_id_fkey ON payment_intents_log IS 'Cascade delete payment intent logs when order is deleted';
COMMENT ON CONSTRAINT orders_event_id_fkey ON orders IS 'Cascade delete orders when event is deleted';
