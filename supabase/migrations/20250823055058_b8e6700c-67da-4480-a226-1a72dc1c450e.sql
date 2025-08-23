-- Create contact_enquiries table to store all contact form submissions
CREATE TABLE public.contact_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  enquiry_type TEXT NOT NULL DEFAULT 'general', -- 'general' for public, 'support' for organizations
  organization_id UUID, -- NULL for public enquiries, set for organization support tickets
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create public enquiries" 
ON public.contact_enquiries 
FOR INSERT 
WITH CHECK (enquiry_type = 'general' AND organization_id IS NULL);

CREATE POLICY "Organizations can create their own support tickets" 
ON public.contact_enquiries 
FOR INSERT 
WITH CHECK (
  enquiry_type = 'support' 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organizations can view their own support tickets" 
ON public.contact_enquiries 
FOR SELECT 
USING (
  enquiry_type = 'support' 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all enquiries" 
ON public.contact_enquiries 
FOR SELECT 
USING (is_authenticated_admin());

CREATE POLICY "Admins can manage all enquiries" 
ON public.contact_enquiries 
FOR UPDATE 
USING (is_authenticated_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_contact_enquiries_updated_at
BEFORE UPDATE ON public.contact_enquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();