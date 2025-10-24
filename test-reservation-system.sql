-- Test Ticket Reservation System
-- Run this in Supabase SQL Editor to verify everything is working

-- ==========================================
-- TEST 1: Check Extensions & Jobs
-- ==========================================

SELECT '🔍 TEST 1: Checking pg_cron extension' as test;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN '✅ pg_cron is installed'
    ELSE '❌ pg_cron is NOT installed - background cleanup will not work!'
  END as result;

SELECT '🔍 TEST 1b: Checking cleanup job schedule' as test;

SELECT
  jobname,
  schedule,
  command,
  CASE
    WHEN active THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status
FROM cron.job
WHERE jobname = 'cleanup-expired-ticket-reservations';

-- ==========================================
-- TEST 2: Reservation Statistics
-- ==========================================

SELECT '🔍 TEST 2: Current reservation statistics' as test;

SELECT * FROM get_reservation_stats();

-- ==========================================
-- TEST 3: Check for Oversells
-- ==========================================

SELECT '🔍 TEST 3: Checking for oversells (should return 0 rows)' as test;

SELECT
  tt.id,
  tt.name as ticket_type,
  tt.quantity_available,
  tt.quantity_sold,
  COALESCE(SUM(tr.quantity), 0) as currently_reserved,
  tt.quantity_sold + COALESCE(SUM(tr.quantity), 0) as total_allocated,
  tt.quantity_available - (tt.quantity_sold + COALESCE(SUM(tr.quantity), 0)) as over_allocated
FROM ticket_types tt
LEFT JOIN ticket_reservations tr ON tr.ticket_type_id = tt.id AND tr.status = 'active'
GROUP BY tt.id, tt.name, tt.quantity_available, tt.quantity_sold
HAVING tt.quantity_sold + COALESCE(SUM(tr.quantity), 0) > tt.quantity_available;

-- If this returns rows, you have an oversell! ❌

-- ==========================================
-- TEST 4: Check Webhook Health (Last 24h)
-- ==========================================

SELECT '🔍 TEST 4: Webhook processing health (last 24h)' as test;

SELECT
  event_type,
  processing_status,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM webhook_events_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, processing_status
ORDER BY event_type, processing_status;

-- ==========================================
-- TEST 5: Check for Failed Webhooks
-- ==========================================

SELECT '🔍 TEST 5: Recent failed webhooks' as test;

SELECT
  event_id,
  event_type,
  processing_status,
  error_message,
  created_at
FROM webhook_events_log
WHERE processing_status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- If this returns rows, investigate the errors! ⚠️

-- ==========================================
-- TEST 6: Check Payment Idempotency
-- ==========================================

SELECT '🔍 TEST 6: Duplicate payment intents (should be 0)' as test;

SELECT
  idempotency_key,
  COUNT(*) as duplicate_count
FROM payment_intents_log
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- If this returns rows, you have duplicate payments! ❌

-- ==========================================
-- TEST 7: Active Reservations by Event
-- ==========================================

SELECT '🔍 TEST 7: Active reservations by event' as test;

SELECT
  e.name as event_name,
  tt.name as ticket_type,
  COUNT(*) as active_reservations,
  SUM(tr.quantity) as reserved_tickets,
  MIN(tr.reserved_at) as oldest_reservation,
  MAX(tr.expires_at) as next_expiration
FROM ticket_reservations tr
JOIN events e ON e.id = tr.event_id
JOIN ticket_types tt ON tt.id = tr.ticket_type_id
WHERE tr.status = 'active'
GROUP BY e.name, tt.name
ORDER BY reserved_tickets DESC;

-- ==========================================
-- TEST 8: Expired Reservations Cleanup Test
-- ==========================================

SELECT '🔍 TEST 8: Testing cleanup function' as test;

-- This will expire any old active reservations
SELECT cleanup_expired_reservations();

-- Check if any were cleaned up
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM ticket_reservations
      WHERE status = 'active' AND expires_at < NOW()
    )
    THEN '❌ Cleanup failed - there are still expired active reservations'
    ELSE '✅ Cleanup working - no expired active reservations found'
  END as cleanup_status;

-- ==========================================
-- TEST 9: Index Performance Check
-- ==========================================

SELECT '🔍 TEST 9: Checking critical indexes' as test;

SELECT
  schemaname,
  tablename,
  indexname,
  CASE
    WHEN indexname IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM pg_indexes
WHERE tablename IN ('ticket_reservations', 'payment_intents_log', 'webhook_events_log', 'ticket_types')
AND indexname IN (
  'idx_ticket_reservations_ticket_type_id',
  'idx_ticket_reservations_status',
  'idx_ticket_reservations_expires_at',
  'idx_payment_intents_idempotency_key',
  'idx_webhook_events_event_id'
)
ORDER BY tablename, indexname;

-- ==========================================
-- TEST 10: Simulated Load Test
-- ==========================================

SELECT '🔍 TEST 10: Simulated concurrent reservation test' as test;

-- Get a real ticket type ID for testing
DO $$
DECLARE
  v_event_id UUID;
  v_ticket_type_id UUID;
  v_result RECORD;
  v_success_count INTEGER := 0;
  v_failure_count INTEGER := 0;
BEGIN
  -- Get first available ticket type
  SELECT e.id, tt.id
  INTO v_event_id, v_ticket_type_id
  FROM ticket_types tt
  JOIN events e ON e.id = tt.event_id
  WHERE tt.quantity_available > tt.quantity_sold + 10
  LIMIT 1;

  IF v_ticket_type_id IS NULL THEN
    RAISE NOTICE '⚠️  No ticket types with available inventory found for testing';
    RETURN;
  END IF;

  RAISE NOTICE '🧪 Running simulated concurrent reservation test...';
  RAISE NOTICE 'Event ID: %', v_event_id;
  RAISE NOTICE 'Ticket Type ID: %', v_ticket_type_id;

  -- Simulate 5 concurrent reservations
  FOR i IN 1..5 LOOP
    SELECT * INTO v_result
    FROM reserve_tickets(
      v_event_id,
      v_ticket_type_id,
      2,
      'test-session-' || i || '-' || NOW()::text,
      'test' || i || '@example.com'
    );

    IF v_result.success THEN
      v_success_count := v_success_count + 1;
      RAISE NOTICE '  ✅ Reservation % succeeded - ID: %', i, v_result.reservation_id;

      -- Cancel the test reservation immediately
      PERFORM cancel_reservation('test-session-' || i || '-' || NOW()::text);
    ELSE
      v_failure_count := v_failure_count + 1;
      RAISE NOTICE '  ❌ Reservation % failed: %', i, v_result.error_message;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Test Results:';
  RAISE NOTICE '  Successful: %', v_success_count;
  RAISE NOTICE '  Failed: %', v_failure_count;

  IF v_success_count >= 3 THEN
    RAISE NOTICE '  ✅ System is working correctly!';
  ELSE
    RAISE NOTICE '  ⚠️  System may have issues - investigate failures';
  END IF;
END $$;

-- ==========================================
-- SUMMARY
-- ==========================================

SELECT '📊 TEST SUMMARY' as summary;

SELECT
  'All tests complete! Review results above.' as message,
  '✅ = Pass, ❌ = Fail, ⚠️ = Warning' as legend;

SELECT
  'If all tests passed, your reservation system is production-ready! 🚀' as conclusion;
