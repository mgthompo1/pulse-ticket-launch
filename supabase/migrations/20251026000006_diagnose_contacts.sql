-- Diagnostic query to see what's preventing contact creation

-- 1. Check organization
SELECT 'Organization Check' as check_type, id, name, crm_enabled
FROM organizations
WHERE id = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13';

-- 2. Check orders for this organization
SELECT 'Orders Check' as check_type, COUNT(*) as count
FROM orders o
INNER JOIN events e ON o.event_id = e.id
WHERE e.organization_id = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13';

-- 3. Check orders with email
SELECT 'Orders with Email' as check_type, COUNT(*) as count
FROM orders o
INNER JOIN events e ON o.event_id = e.id
WHERE e.organization_id = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13'
  AND o.customer_email IS NOT NULL
  AND o.customer_email != '';

-- 4. Check if contacts exist
SELECT 'Contacts Check' as check_type, COUNT(*) as count
FROM contacts
WHERE organization_id = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13';

-- 5. Try to manually insert one contact to see if RLS is blocking
DO $$
BEGIN
  -- Try to insert a test contact
  BEGIN
    INSERT INTO contacts (
      organization_id,
      email,
      full_name,
      created_at,
      updated_at
    ) VALUES (
      'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13',
      'test@example.com',
      'Test User',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Successfully inserted test contact';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to insert test contact: %', SQLERRM;
  END;
END $$;

-- 6. Check if test contact was created
SELECT 'Test Contact Check' as check_type, COUNT(*) as count
FROM contacts
WHERE organization_id = 'a0fb92a2-2cd1-48e2-93b1-1b6294a9da13'
  AND email = 'test@example.com';

-- 7. Check RLS policies on contacts table
SELECT 'RLS Policies' as check_type,
       schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'contacts';
