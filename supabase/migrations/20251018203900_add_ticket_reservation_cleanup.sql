-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to clean up expired ticket reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Update expired reservations to 'expired' status
  WITH expired_reservations AS (
    UPDATE public.ticket_reservations
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count
  FROM expired_reservations;

  -- Log the cleanup
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired ticket reservations', v_deleted_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION cleanup_expired_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_reservations() TO service_role;

-- Schedule the cleanup function to run every 5 minutes
-- Note: pg_cron jobs are scoped to the database and run with the postgres user
SELECT cron.schedule(
  'cleanup-expired-ticket-reservations',
  '*/5 * * * *', -- Every 5 minutes
  'SELECT cleanup_expired_reservations();'
);

-- Create a function to get active reservation count for monitoring
CREATE OR REPLACE FUNCTION get_reservation_stats()
RETURNS TABLE (
  active_count BIGINT,
  expired_count BIGINT,
  completed_count BIGINT,
  oldest_active_reservation TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    MIN(reserved_at) FILTER (WHERE status = 'active') AS oldest_active_reservation
  FROM public.ticket_reservations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_reservation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_reservation_stats() TO service_role;

-- Add comment to document the cleanup job
COMMENT ON FUNCTION cleanup_expired_reservations() IS 'Automatically marks expired ticket reservations as expired. Runs every 5 minutes via pg_cron.';
COMMENT ON FUNCTION get_reservation_stats() IS 'Returns statistics about ticket reservations for monitoring purposes.';
