-- Add custom_answers field to orders table to track customer responses
ALTER TABLE public.orders 
ADD COLUMN custom_answers JSONB DEFAULT '{}';

-- Create an index for better performance when querying custom answers
CREATE INDEX idx_orders_custom_answers ON public.orders USING gin(custom_answers);