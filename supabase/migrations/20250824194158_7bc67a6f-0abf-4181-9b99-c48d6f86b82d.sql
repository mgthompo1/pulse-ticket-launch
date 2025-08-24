-- Enhanced security fix for contact_enquiries table - Fixed version

-- First, check current policies
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'contact_enquiries'
ORDER BY policyname;

-- ENHANCED SECURITY FIX 1: Add explicit policy to prevent ANY direct access to customer personal data
-- This creates a "default deny" approach for maximum security
CREATE POLICY "contact_enquiries_default_deny_all" 
ON public.contact_enquiries 
FOR ALL 
TO public 
USING (false);

-- ENHANCED SECURITY FIX 2: Create access logging function (fixed syntax)
CREATE OR REPLACE FUNCTION public.log_contact_enquiry_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any access to contact enquiries for audit purposes
    INSERT INTO public.security_audit_log (
        user_id,
        event_type,
        event_data
    ) VALUES (
        auth.uid(),
        'contact_enquiry_accessed',
        jsonb_build_object(
            'enquiry_id', COALESCE(NEW.id, OLD.id),
            'operation', TG_OP,
            'table_name', TG_TABLE_NAME
        )
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT, UPDATE, DELETE operations only (fixed)
DROP TRIGGER IF EXISTS contact_enquiry_access_log ON public.contact_enquiries;
CREATE TRIGGER contact_enquiry_access_log
    AFTER INSERT OR UPDATE OR DELETE ON public.contact_enquiries
    FOR EACH ROW EXECUTE FUNCTION log_contact_enquiry_access();

-- ENHANCED SECURITY FIX 3: Drop existing broad policies and create restrictive ones
DROP POLICY IF EXISTS "authenticated_users_proper_enquiries_access_only" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Admins can view all enquiries" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Admins can manage all enquiries" ON public.contact_enquiries;

-- New restrictive admin policy with session verification
CREATE POLICY "verified_admins_contact_enquiries_read_only" 
ON public.contact_enquiries 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() IS NOT NULL 
    AND is_authenticated_admin() 
    AND EXISTS (
        SELECT 1 FROM admin_sessions 
        WHERE admin_user_id = auth.uid() 
        AND expires_at > now() 
        AND last_activity > (now() - interval '1 hour')
    )
);

-- ENHANCED SECURITY FIX 4: Organizations can only view their own support tickets
CREATE POLICY "organization_support_tickets_only" 
ON public.contact_enquiries 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() IS NOT NULL 
    AND enquiry_type = 'support' 
    AND organization_id IS NOT NULL 
    AND organization_id IN (
        SELECT o.id 
        FROM organizations o 
        WHERE o.user_id = auth.uid()
    )
);

-- ENHANCED SECURITY FIX 5: Extremely restrictive anonymous insert policy
DROP POLICY IF EXISTS "anonymous_can_create_general_enquiries_only" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Anyone can create public enquiries" ON public.contact_enquiries;

CREATE POLICY "anonymous_general_enquiries_minimal" 
ON public.contact_enquiries 
FOR INSERT 
TO anon 
WITH CHECK (
    enquiry_type = 'general' 
    AND organization_id IS NULL
    AND name IS NOT NULL AND LENGTH(TRIM(name)) > 0
    AND email IS NOT NULL AND LENGTH(TRIM(email)) > 5
    AND message IS NOT NULL AND LENGTH(TRIM(message)) > 10
    AND LENGTH(message) < 5000
    AND email LIKE '%@%'
);

-- Verify the security setup
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'contact_enquiries'
ORDER BY policyname;