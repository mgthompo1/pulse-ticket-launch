-- Add ticket delivery method column to events table
ALTER TABLE public.events 
ADD COLUMN ticket_delivery_method TEXT DEFAULT 'qr_ticket' CHECK (ticket_delivery_method IN ('qr_ticket', 'confirmation_email'));