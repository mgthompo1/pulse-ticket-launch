-- Update the specific invoice that was paid via Windcave
UPDATE invoices 
SET status = 'paid', paid_at = NOW() 
WHERE invoice_number = 'INV-2025-529749';