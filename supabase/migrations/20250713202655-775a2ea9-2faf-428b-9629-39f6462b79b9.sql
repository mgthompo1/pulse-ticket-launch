-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up scheduled job to run event reminders daily at 10 AM
SELECT cron.schedule(
  'daily-event-reminders',
  '0 10 * * *', -- 10 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/event-reminder-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create chat_sessions table for AI chatbot conversations
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create email_notifications table to track sent emails
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'confirmation', 'reminder', 'cancellation'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' -- 'sent', 'failed', 'pending'
);

-- Enable RLS on email_notifications  
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for email_notifications (only accessible by event organizers)
CREATE POLICY "Organizers can view emails for their events" 
ON public.email_notifications 
FOR SELECT 
USING (
  order_id IN (
    SELECT o.id 
    FROM orders o
    JOIN events e ON o.event_id = e.id
    JOIN organizations org ON e.organization_id = org.id
    WHERE org.user_id = auth.uid()
  )
);

-- Create ai_generated_content table to store AI suggestions
CREATE TABLE public.ai_generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'event_description', 'marketing_copy', 'email_template'
  input_data JSONB NOT NULL,
  generated_content JSONB NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on ai_generated_content
ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_generated_content
CREATE POLICY "Users can view their own AI content" 
ON public.ai_generated_content 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create AI content" 
ON public.ai_generated_content 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI content" 
ON public.ai_generated_content 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX idx_email_notifications_order_id ON public.email_notifications(order_id);
CREATE INDEX idx_email_notifications_type ON public.email_notifications(email_type);
CREATE INDEX idx_ai_content_user_id ON public.ai_generated_content(user_id);
CREATE INDEX idx_ai_content_type ON public.ai_generated_content(content_type);