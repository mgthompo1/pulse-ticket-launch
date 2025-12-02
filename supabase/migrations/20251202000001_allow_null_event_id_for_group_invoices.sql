-- Migration: Allow NULL event_id for group invoices
-- Description: Enables generating invoices across multiple events by allowing event_id to be NULL
-- When event_id is NULL, the invoice covers all events in the billing period

ALTER TABLE group_invoices ALTER COLUMN event_id DROP NOT NULL;

COMMENT ON COLUMN group_invoices.event_id IS
'The event this invoice is for. NULL indicates the invoice covers multiple events.';
