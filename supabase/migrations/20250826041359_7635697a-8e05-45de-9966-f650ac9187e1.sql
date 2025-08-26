-- Fix the relationship between scheduled_posts and social_connections
-- First, let's check if we need to add a foreign key or if it exists
-- Add foreign key constraint if it doesn't exist
ALTER TABLE scheduled_posts 
ADD CONSTRAINT fk_scheduled_posts_social_connections 
FOREIGN KEY (user_id) 
REFERENCES social_connections(user_id)
ON DELETE CASCADE;