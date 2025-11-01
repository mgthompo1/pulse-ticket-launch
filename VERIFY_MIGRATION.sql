-- Verification Script for Groups RLS Migration
-- Run this in Supabase SQL Editor to verify the migration was applied correctly

-- ============================================================================
-- 1. Check promo_codes policies (should have 8 policies total)
-- ============================================================================
SELECT
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'promo_codes'
ORDER BY policyname;

-- Expected policies:
-- - Users can view promo codes for their organizations (SELECT)
-- - Users can insert promo codes for their organizations (INSERT)
-- - Users can update promo codes for their organizations (UPDATE)
-- - Users can delete promo codes for their organizations (DELETE)
-- - Group coordinators can view promo codes (SELECT) ✅ NEW
-- - Group coordinators can create promo codes (INSERT) ✅ NEW
-- - Group coordinators can update their promo codes (UPDATE) ✅ NEW
-- - Group coordinators can delete their promo codes (DELETE) ✅ NEW
-- - Public can view active promo codes (SELECT) ✅ NEW

-- ============================================================================
-- 2. Check group_invoices policies (should have 4 policies)
-- ============================================================================
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'group_invoices'
ORDER BY policyname;

-- Expected policies:
-- - Organizations can manage invoices (ALL)
-- - Group coordinators can view their invoices (SELECT)
-- - Service role can update invoices (UPDATE) ✅ NEW

-- ============================================================================
-- 3. Check group_ticket_sales policies (should have 3+ policies)
-- ============================================================================
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'group_ticket_sales'
ORDER BY policyname;

-- Expected policies:
-- - Organizations can view group sales (SELECT)
-- - Group coordinators can view their sales (SELECT)
-- - Service role can create sales (INSERT)
-- - Service role can manage sales (ALL) ✅ NEW

-- ============================================================================
-- 4. Verify groups and related tables exist
-- ============================================================================
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'groups',
    'group_coordinators',
    'group_ticket_allocations',
    'group_ticket_sales',
    'group_invoices',
    'group_invoice_line_items',
    'group_activity_log'
  )
ORDER BY table_name;

-- Should show all 7 tables

-- ============================================================================
-- 5. Check if RLS is enabled on all groups tables
-- ============================================================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'group%'
ORDER BY tablename;

-- All should have rls_enabled = true

-- ============================================================================
-- SUMMARY CHECK
-- ============================================================================
-- Run this to get a quick summary
SELECT
  'promo_codes' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'promo_codes'
UNION ALL
SELECT
  'group_invoices',
  COUNT(*)
FROM pg_policies
WHERE tablename = 'group_invoices'
UNION ALL
SELECT
  'group_ticket_sales',
  COUNT(*)
FROM pg_policies
WHERE tablename = 'group_ticket_sales';

-- Expected results:
-- promo_codes: 8+ policies
-- group_invoices: 3-4 policies
-- group_ticket_sales: 3-4 policies
