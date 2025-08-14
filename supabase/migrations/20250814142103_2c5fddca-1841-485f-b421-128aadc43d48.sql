-- Fix remaining function search path issues
-- Check and update all functions that don't have SET search_path

-- Update existing functions to have immutable search paths
ALTER FUNCTION public.log_security_event(uuid, uuid, text, jsonb, inet, text) SET search_path = '';
ALTER FUNCTION public.calculate_platform_fee() SET search_path = '';
ALTER FUNCTION public.get_user_organization_id(uuid) SET search_path = '';
ALTER FUNCTION public.user_owns_organization(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.update_billing_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.generate_ticket_code() SET search_path = '';
ALTER FUNCTION public.update_seat_maps_updated_at() SET search_path = '';
ALTER FUNCTION public.calculate_platform_fee(numeric) SET search_path = '';
ALTER FUNCTION public.calculate_platform_fee(bigint) SET search_path = '';
ALTER FUNCTION public.update_landing_content_updated_at() SET search_path = '';