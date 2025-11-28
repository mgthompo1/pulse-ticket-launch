-- Post-Event Survey System
-- Allows organizers to send surveys to attendees after events

-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Survey metadata
  title TEXT NOT NULL DEFAULT 'How was your experience?',
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Survey configuration
  questions JSONB NOT NULL DEFAULT '[]',
  -- Each question: { id: string, type: 'rating'|'text'|'multiple_choice'|'nps', question: string, required: boolean, options?: string[] }

  -- Sending configuration
  send_delay_hours INTEGER DEFAULT 24, -- Hours after event ends to send survey
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_delay_hours INTEGER DEFAULT 72,

  -- Thank you configuration
  thank_you_title TEXT DEFAULT 'Thank you for your feedback!',
  thank_you_message TEXT,
  incentive_enabled BOOLEAN DEFAULT false,
  incentive_type TEXT CHECK (incentive_type IN ('discount', 'entry', 'none')),
  incentive_value TEXT, -- Discount code or prize description

  -- Statistics
  total_sent INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  total_reminders_sent INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- Respondent info
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Response data
  responses JSONB NOT NULL DEFAULT '{}',
  -- { question_id: answer_value }

  -- NPS and rating calculations
  nps_score INTEGER, -- 0-10 NPS score if applicable
  overall_rating DECIMAL(3,2), -- Calculated average rating

  -- Metadata
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_to_complete_seconds INTEGER,

  -- Source tracking
  source TEXT DEFAULT 'email', -- email, link, qr
  device_type TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate responses
  UNIQUE(survey_id, customer_email)
);

-- Create survey_emails table to track sent emails
CREATE TABLE IF NOT EXISTS public.survey_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'completed', 'bounced', 'unsubscribed')),
  is_reminder BOOLEAN DEFAULT false,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_surveys_event ON public.surveys(event_id);
CREATE INDEX idx_surveys_org ON public.surveys(organization_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_event ON public.survey_responses(event_id);
CREATE INDEX idx_survey_responses_email ON public.survey_responses(customer_email);
CREATE INDEX idx_survey_emails_survey ON public.survey_emails(survey_id);
CREATE INDEX idx_survey_emails_status ON public.survey_emails(status);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for surveys
CREATE POLICY "Organizations can view their surveys"
  ON public.surveys FOR SELECT
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can create surveys"
  ON public.surveys FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can update their surveys"
  ON public.surveys FOR UPDATE
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can delete their surveys"
  ON public.surveys FOR DELETE
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

-- RLS Policies for survey_responses
CREATE POLICY "Organizations can view their survey responses"
  ON public.survey_responses FOR SELECT
  USING (survey_id IN (
    SELECT id FROM public.surveys WHERE organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Anyone can submit survey responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Respondents can update their own responses"
  ON public.survey_responses FOR UPDATE
  USING (true); -- Allow updates for completing surveys

-- RLS Policies for survey_emails
CREATE POLICY "Organizations can view their survey emails"
  ON public.survey_emails FOR SELECT
  USING (survey_id IN (
    SELECT id FROM public.surveys WHERE organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can manage survey emails"
  ON public.survey_emails FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update survey emails"
  ON public.survey_emails FOR UPDATE
  USING (true);

-- Add survey settings to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS survey_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.surveys(id);

-- Add comment
COMMENT ON TABLE public.surveys IS 'Post-event surveys for collecting attendee feedback';
COMMENT ON TABLE public.survey_responses IS 'Individual responses to surveys';
COMMENT ON TABLE public.survey_emails IS 'Tracks survey invitation emails sent to attendees';
