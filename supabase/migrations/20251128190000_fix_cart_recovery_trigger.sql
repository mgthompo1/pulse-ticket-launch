-- Fix the cart recovery trigger to only mark as recovered on COMPLETED orders
-- The original trigger marked carts as recovered on ANY order insert, even pending ones

-- Drop the old trigger
DROP TRIGGER IF EXISTS trigger_mark_cart_recovered ON public.orders;

-- Create improved function that only recovers on completed orders
CREATE OR REPLACE FUNCTION mark_cart_recovered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark as recovered if the order is actually completed/paid
  IF NEW.status IN ('completed', 'paid') THEN
    UPDATE public.abandoned_carts
    SET
      status = 'recovered',
      recovered_at = NOW(),
      recovered_order_id = NEW.id,
      updated_at = NOW()
    WHERE
      event_id = NEW.event_id
      AND customer_email = NEW.customer_email
      AND status IN ('pending', 'email_sent')
      -- Only mark if cart was created before this order (prevents marking future carts)
      AND created_at < NEW.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT (new completed orders)
CREATE TRIGGER trigger_mark_cart_recovered_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION mark_cart_recovered();

-- Also create trigger for UPDATE (when order status changes to completed)
CREATE TRIGGER trigger_mark_cart_recovered_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION mark_cart_recovered();

-- Reset any incorrectly marked carts that don't have a valid completed order
UPDATE public.abandoned_carts ac
SET
  status = 'email_sent',
  recovered_at = NULL,
  recovered_order_id = NULL,
  updated_at = NOW()
WHERE
  ac.status = 'recovered'
  AND (
    -- No recovered_order_id set
    ac.recovered_order_id IS NULL
    OR
    -- The linked order is not completed
    NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = ac.recovered_order_id
      AND o.status IN ('completed', 'paid')
    )
  );

-- Also reset carts marked as recovered but where emails_sent = 0
-- (they were never actually sent recovery emails, so can't claim recovery)
UPDATE public.abandoned_carts
SET
  status = CASE
    WHEN emails_sent > 0 THEN 'email_sent'
    ELSE 'pending'
  END,
  recovered_at = NULL,
  recovered_order_id = NULL,
  updated_at = NOW()
WHERE
  status = 'recovered'
  AND recovered_order_id IS NULL;

COMMENT ON FUNCTION mark_cart_recovered IS 'Marks abandoned carts as recovered when a completed order is placed by the same customer for the same event';
