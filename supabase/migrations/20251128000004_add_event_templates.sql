-- Recurring Event Templates System
-- Allows users to save event configurations as templates for quick creation

-- Create event_templates table
CREATE TABLE IF NOT EXISTS public.event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Event template data (copied from events table structure)
  template_data JSONB NOT NULL DEFAULT '{}',

  -- Recurrence settings
  recurrence_enabled BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  recurrence_days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  recurrence_day_of_month INTEGER,
  recurrence_end_date DATE,
  recurrence_count INTEGER, -- Number of occurrences to create

  -- Auto-create settings
  auto_create_enabled BOOLEAN DEFAULT false,
  auto_create_days_ahead INTEGER DEFAULT 30, -- How many days ahead to auto-create events
  last_auto_created_at TIMESTAMPTZ,

  -- Ticket template data
  ticket_types JSONB DEFAULT '[]',

  -- Widget/customization settings
  widget_customization JSONB DEFAULT '{}',
  ticket_customization JSONB DEFAULT '{}',
  email_customization JSONB DEFAULT '{}',

  -- Usage stats
  times_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_event_templates_org ON public.event_templates(organization_id);
CREATE INDEX idx_event_templates_active ON public.event_templates(is_active);
CREATE INDEX idx_event_templates_recurrence ON public.event_templates(recurrence_enabled, auto_create_enabled);

-- Enable RLS
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can view their templates"
  ON public.event_templates FOR SELECT
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can create templates"
  ON public.event_templates FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can update their templates"
  ON public.event_templates FOR UPDATE
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can delete their templates"
  ON public.event_templates FOR DELETE
  USING (organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
  ));

-- Create table to track events created from templates
CREATE TABLE IF NOT EXISTS public.template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.event_templates(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, event_id)
);

-- Index for template_events
CREATE INDEX idx_template_events_template ON public.template_events(template_id);
CREATE INDEX idx_template_events_event ON public.template_events(event_id);

-- Enable RLS on template_events
ALTER TABLE public.template_events ENABLE ROW LEVEL SECURITY;

-- RLS for template_events (inherits from event_templates)
CREATE POLICY "Organizations can view their template events"
  ON public.template_events FOR SELECT
  USING (template_id IN (
    SELECT id FROM public.event_templates WHERE organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Organizations can create template events"
  ON public.template_events FOR INSERT
  WITH CHECK (template_id IN (
    SELECT id FROM public.event_templates WHERE organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  ));

-- Add comment
COMMENT ON TABLE public.event_templates IS 'Stores reusable event templates for recurring events';
COMMENT ON TABLE public.template_events IS 'Tracks which events were created from which templates';
