-- Migration: Add trigger to handle refunds for group sales
-- Description: Automatically decrements allocation used_quantity when a sale is refunded

-- Create or replace the function to handle refunds
CREATE OR REPLACE FUNCTION handle_group_sale_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If the sale was just marked as refunded (status changed to 'refunded')
  IF NEW.payment_status = 'refunded' AND OLD.payment_status != 'refunded' THEN
    -- Decrement the used_quantity on the allocation
    UPDATE group_ticket_allocations
    SET used_quantity = used_quantity - 1
    WHERE id = NEW.allocation_id
      AND used_quantity > 0;

    RAISE NOTICE 'Decremented used_quantity for allocation % due to refund on sale %', NEW.allocation_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (drop if exists first to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_group_sale_refund ON group_ticket_sales;

CREATE TRIGGER trigger_group_sale_refund
AFTER UPDATE ON group_ticket_sales
FOR EACH ROW
EXECUTE FUNCTION handle_group_sale_refund();

COMMENT ON FUNCTION handle_group_sale_refund() IS
'Handles refund processing for group ticket sales by decrementing the allocation used_quantity';
