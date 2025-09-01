-- Fix Emma Graham user account and organization assignment
-- This script will investigate and fix the user's organization membership

-- First, let's check the current status of the user
SELECT 
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.updated_at
FROM auth.users u 
WHERE u.email = 'emma.graham@edgecreative.net';

-- Check if Edge Creative organization exists
SELECT 
    o.id as org_id,
    o.name,
    o.user_id as owner_id,
    o.created_at
FROM organizations o 
WHERE o.name ILIKE '%edge creative%' OR o.name ILIKE '%edgecreative%';

-- Check current organization memberships for Emma
SELECT 
    ou.id as membership_id,
    ou.organization_id,
    ou.user_id,
    ou.role,
    ou.status,
    ou.created_at,
    o.name as organization_name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = (
    SELECT id FROM auth.users WHERE email = 'emma.graham@edgecreative.net'
);

-- Check if there are any pending invitations
SELECT 
    oi.id as invitation_id,
    oi.email,
    oi.organization_id,
    oi.status,
    oi.created_at,
    o.name as organization_name
FROM organization_invitations oi
JOIN organizations o ON oi.organization_id = o.id
WHERE oi.email = 'emma.graham@edgecreative.net';

-- Now let's fix the issues:

-- 1. First, let's get Emma's user ID
DO $$
DECLARE
    emma_user_id uuid;
    edge_creative_org_id uuid;
BEGIN
    -- Get Emma's user ID
    SELECT id INTO emma_user_id 
    FROM auth.users 
    WHERE email = 'emma.graham@edgecreative.net';
    
    -- Get Edge Creative organization ID
    SELECT id INTO edge_creative_org_id 
    FROM organizations 
    WHERE name ILIKE '%edge creative%' OR name ILIKE '%edgecreative%'
    LIMIT 1;
    
    -- If Emma doesn't exist, create her account
    IF emma_user_id IS NULL THEN
        INSERT INTO auth.users (
            email,
            email_confirmed_at,
            created_at,
            updated_at
        ) VALUES (
            'emma.graham@edgecreative.net',
            NOW(),
            NOW(),
            NOW()
        ) RETURNING id INTO emma_user_id;
        
        RAISE NOTICE 'Created new user account for emma.graham@edgecreative.net with ID: %', emma_user_id;
    END IF;
    
    -- If Edge Creative organization doesn't exist, create it
    IF edge_creative_org_id IS NULL THEN
        INSERT INTO organizations (
            name,
            email,
            user_id,
            created_at,
            updated_at,
            system_type
        ) VALUES (
            'Edge Creative',
            'emma.graham@edgecreative.net',
            emma_user_id,
            NOW(),
            NOW(),
            'EVENTS'
        ) RETURNING id INTO edge_creative_org_id;
        
        RAISE NOTICE 'Created Edge Creative organization with ID: %', edge_creative_org_id;
    END IF;
    
    -- Check if Emma is already a member of Edge Creative
    IF NOT EXISTS (
        SELECT 1 FROM organization_users 
        WHERE user_id = emma_user_id AND organization_id = edge_creative_org_id
    ) THEN
        -- Add Emma as a member of Edge Creative
        INSERT INTO organization_users (
            organization_id,
            user_id,
            role,
            status,
            created_at,
            updated_at
        ) VALUES (
            edge_creative_org_id,
            emma_user_id,
            'admin',
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Added Emma as admin member of Edge Creative organization';
    ELSE
        -- Update existing membership to active
        UPDATE organization_users 
        SET status = 'active', role = 'admin', updated_at = NOW()
        WHERE user_id = emma_user_id AND organization_id = edge_creative_org_id;
        
        RAISE NOTICE 'Updated Emma''s membership to active admin role';
    END IF;
    
    -- Remove any pending invitations for Emma
    DELETE FROM organization_invitations 
    WHERE email = 'emma.graham@edgecreative.net';
    
    RAISE NOTICE 'Removed any pending invitations for Emma';
    
END $$;

-- Verify the fix worked
SELECT 
    u.email,
    u.email_confirmed_at,
    o.name as organization_name,
    ou.role,
    ou.status,
    ou.created_at as membership_created
FROM auth.users u
JOIN organization_users ou ON u.id = ou.user_id
JOIN organizations o ON ou.organization_id = o.id
WHERE u.email = 'emma.graham@edgecreative.net';

