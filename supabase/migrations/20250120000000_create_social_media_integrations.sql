-- Create social_connections table
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook')),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'page', 'company')),
  is_connected BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Create scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook')),
  content TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'published', 'failed')) DEFAULT 'scheduled',
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  image_url TEXT,
  link_url TEXT,
  published_post_id TEXT, -- External post ID from the platform
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social_post_analytics table for tracking performance
CREATE TABLE IF NOT EXISTS social_post_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL, -- External post ID from the platform
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform ON scheduled_posts(platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_social_post_analytics_post_id ON social_post_analytics(post_id);

-- Enable Row Level Security
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own social connections" ON social_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social connections" ON social_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social connections" ON social_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social connections" ON social_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own scheduled posts" ON scheduled_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts" ON scheduled_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts" ON scheduled_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts" ON scheduled_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view analytics for their own posts" ON social_post_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_posts 
      WHERE scheduled_posts.id = social_post_analytics.scheduled_post_id 
      AND scheduled_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analytics for their own posts" ON social_post_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scheduled_posts 
      WHERE scheduled_posts.id = social_post_analytics.scheduled_post_id 
      AND scheduled_posts.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_social_connections_updated_at 
  BEFORE UPDATE ON social_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at 
  BEFORE UPDATE ON scheduled_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle OAuth callback and token exchange
CREATE OR REPLACE FUNCTION handle_social_oauth_callback(
  p_user_id UUID,
  p_platform TEXT,
  p_account_name TEXT,
  p_account_type TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  -- Insert or update the social connection
  INSERT INTO social_connections (
    user_id, 
    platform, 
    account_name, 
    account_type, 
    is_connected, 
    access_token, 
    refresh_token, 
    expires_at
  ) VALUES (
    p_user_id, 
    p_platform, 
    p_account_name, 
    p_account_type, 
    true, 
    p_access_token, 
    p_refresh_token, 
    p_expires_at
  )
  ON CONFLICT (user_id, platform) 
  DO UPDATE SET
    account_name = EXCLUDED.account_name,
    account_type = EXCLUDED.account_type,
    is_connected = true,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    last_sync = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_connection_id;
  
  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON social_connections TO authenticated;
GRANT ALL ON scheduled_posts TO authenticated;
GRANT ALL ON social_post_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION handle_social_oauth_callback TO authenticated;
