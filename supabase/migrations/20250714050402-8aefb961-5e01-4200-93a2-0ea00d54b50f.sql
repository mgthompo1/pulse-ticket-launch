-- Add windcave_session_id field to orders table
ALTER TABLE public.orders 
ADD COLUMN windcave_session_id TEXT;