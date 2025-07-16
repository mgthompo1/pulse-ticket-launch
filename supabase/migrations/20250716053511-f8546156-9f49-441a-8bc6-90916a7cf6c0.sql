-- Add address and phone fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'New Zealand',
ADD COLUMN IF NOT EXISTS phone TEXT;