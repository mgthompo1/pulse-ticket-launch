-- Fix the database relationship issue
-- The error indicates we need a proper relationship between scheduled_posts and social_connections
-- Let's check what columns we have and create a proper structure

-- First, let's add a foreign key from scheduled_posts to social_connections using a different approach
-- since user_id might not be unique in social_connections, let's add a connection_id field

-- Add connection_id to scheduled_posts to reference social_connections directly
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES social_connections(id) ON DELETE CASCADE;

-- Update existing posts to link to the social connection
UPDATE scheduled_posts 
SET connection_id = (
  SELECT sc.id 
  FROM social_connections sc 
  WHERE sc.user_id = scheduled_posts.user_id 
  AND sc.platform = scheduled_posts.platform 
  AND sc.is_connected = true 
  LIMIT 1
) 
WHERE connection_id IS NULL;