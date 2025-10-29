-- Add admin response fields to contact_enquiries table
ALTER TABLE public.contact_enquiries
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responded_by TEXT;

-- Add comments
COMMENT ON COLUMN public.contact_enquiries.admin_notes IS 'Internal notes for admins (not shared with user)';
COMMENT ON COLUMN public.contact_enquiries.admin_response IS 'Response sent to the user';
COMMENT ON COLUMN public.contact_enquiries.responded_at IS 'Timestamp when admin responded';
COMMENT ON COLUMN public.contact_enquiries.responded_by IS 'Email of admin who responded';
