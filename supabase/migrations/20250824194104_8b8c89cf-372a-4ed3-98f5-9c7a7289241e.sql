-- Enhanced security fix for contact_enquiries table to prevent customer data harvesting

-- First, let's examine the current RLS policies for contact_enquiries
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'contact_enquiries'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contact_enquiries' 
    AND schemaname = 'public';

-- ENHANCED SECURITY FIX 1: Add explicit policy to prevent ANY direct access to customer personal data
-- This creates a "default deny" approach for maximum security
CREATE POLICY "contact_enquiries_default_deny_all" 
ON public.contact_enquiries 
FOR ALL 
TO public 
USING (false);

-- ENHANCED SECURITY FIX 2: Enable detailed access logging for admin access
-- Create a security logging function for contact enquiry access
CREATE OR REPLACE FUNCTION public.log_contact_enquiry_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any access to contact enquiries for audit purposes
    INSERT INTO public.security_audit_log (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        'contact_enquiry_accessed',
        jsonb_build_object(
            'enquiry_id', COALESCE(NEW.id, OLD.id),
            'operation', TG_OP,
            'table_name', TG_TABLE_NAME
        ),
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for access logging
DROP TRIGGER IF EXISTS contact_enquiry_access_log ON public.contact_enquiries;
CREATE TRIGGER contact_enquiry_access_log
    AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.contact_enquiries
    FOR EACH ROW EXECUTE FUNCTION log_contact_enquiry_access();

-- ENHANCED SECURITY FIX 3: Create more restrictive admin access policy
-- Drop the existing broad admin policy and replace with more restrictive one
DROP POLICY IF EXISTS "authenticated_users_proper_enquiries_access_only" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Admins can view all enquiries" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Admins can manage all enquiries" ON public.contact_enquiries;

-- New restrictive admin policy with additional checks
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

-- ENHANCED SECURITY FIX 4: Limit organization access to only their own support tickets
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
-- Replace existing policy with more secure version
DROP POLICY IF EXISTS "anonymous_can_create_general_enquiries_only" ON public.contact_enquiries;
DROP POLICY IF EXISTS "Anyone can create public enquiries" ON public.contact_enquiries;

CREATE POLICY "anonymous_general_enquiries_minimal" 
ON public.contact_enquiries 
FOR INSERT 
TO anon 
WITH CHECK (
    -- Only allow general enquiries from anonymous users
    enquiry_type = 'general' 
    AND organization_id IS NULL
    -- Ensure required fields are present and not empty
    AND name IS NOT NULL AND LENGTH(TRIM(name)) > 0
    AND email IS NOT NULL AND LENGTH(TRIM(email)) > 5
    AND message IS NOT NULL AND LENGTH(TRIM(message)) > 10
    -- Prevent potential abuse - limit message length
    AND LENGTH(message) < 5000
    -- Ensure email format is basic valid (contains @)
    AND email LIKE '%@%'
);

-- ENHANCED SECURITY FIX 6: Data retention policy - automatically delete old general enquiries
-- This reduces the amount of personal data stored long-term
CREATE OR REPLACE FUNCTION public.cleanup_old_contact_enquiries()
RETURNS void AS $$
BEGIN
    -- Delete general enquiries older than 1 year
    DELETE FROM public.contact_enquiries 
    WHERE enquiry_type = 'general' 
    AND organization_id IS NULL 
    AND created_at < (now() - interval '1 year');
    
    -- Log the cleanup action
    INSERT INTO public.security_audit_log (
        event_type,
        event_data
    ) VALUES (
        'contact_enquiries_cleanup',
        jsonb_build_object(
            'deleted_count', ROW_COUNT,
            'cleanup_date', now()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the enhanced security setup
SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'contact_enquiries'
ORDER BY policyname;

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contact_enquiries' 
    AND schemaname = 'public';