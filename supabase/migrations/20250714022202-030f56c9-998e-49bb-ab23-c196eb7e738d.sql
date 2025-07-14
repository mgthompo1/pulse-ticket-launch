-- Add Windcave HIT terminal API configuration fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN windcave_hit_username text,
ADD COLUMN windcave_hit_key text,
ADD COLUMN windcave_station_id text;