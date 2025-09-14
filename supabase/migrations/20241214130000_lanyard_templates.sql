-- Create lanyard templates table
CREATE TABLE IF NOT EXISTS lanyard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimensions JSONB NOT NULL DEFAULT '{"width": 85, "height": 120, "unit": "mm"}',
  background JSONB NOT NULL DEFAULT '{"color": "#ffffff", "pattern": "none"}',
  blocks JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE lanyard_templates ENABLE ROW LEVEL SECURITY;

-- Policy for organizations to manage their own templates
CREATE POLICY "Organizations can manage their lanyard templates" ON lanyard_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy for public read access (for preview purposes)
CREATE POLICY "Public read access to lanyard templates" ON lanyard_templates
  FOR SELECT USING (true);

-- Create index for performance
CREATE INDEX lanyard_templates_organization_id_idx ON lanyard_templates(organization_id);
CREATE INDEX lanyard_templates_is_default_idx ON lanyard_templates(organization_id, is_default);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_lanyard_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_lanyard_template_updated_at
  BEFORE UPDATE ON lanyard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lanyard_template_updated_at();

-- Insert a default template for testing
INSERT INTO lanyard_templates (
  name,
  organization_id,
  dimensions,
  background,
  blocks,
  is_default
) VALUES (
  'Default Lanyard Template',
  (SELECT id FROM organizations LIMIT 1), -- Use first organization for demo
  '{"width": 85, "height": 120, "unit": "mm"}',
  '{"color": "#ffffff", "pattern": "none"}',
  '[
    {
      "id": "org-logo",
      "type": "organization_logo",
      "position": {"x": 10, "y": 10},
      "size": {"width": 65, "height": 20},
      "style": {
        "textAlign": "center",
        "backgroundColor": "transparent",
        "fontSize": 12,
        "fontWeight": "normal",
        "color": "#000000",
        "borderRadius": 0,
        "padding": 4
      },
      "fallbackText": "ORG LOGO"
    },
    {
      "id": "event-title",
      "type": "event_title",
      "position": {"x": 10, "y": 35},
      "size": {"width": 65, "height": 15},
      "style": {
        "fontSize": 14,
        "fontWeight": "bold",
        "textAlign": "center",
        "color": "#000000",
        "backgroundColor": "transparent",
        "borderRadius": 0,
        "padding": 4
      }
    },
    {
      "id": "attendee-name",
      "type": "attendee_name",
      "position": {"x": 10, "y": 55},
      "size": {"width": 65, "height": 20},
      "style": {
        "fontSize": 18,
        "fontWeight": "bold",
        "textAlign": "center",
        "color": "#2563eb",
        "backgroundColor": "#f1f5f9",
        "borderRadius": 4,
        "padding": 8
      }
    },
    {
      "id": "ticket-type",
      "type": "ticket_type",
      "position": {"x": 10, "y": 80},
      "size": {"width": 35, "height": 12},
      "style": {
        "fontSize": 12,
        "textAlign": "center",
        "color": "#64748b",
        "backgroundColor": "transparent",
        "borderRadius": 0,
        "padding": 4
      }
    },
    {
      "id": "qr-code",
      "type": "qr_code",
      "position": {"x": 50, "y": 75},
      "size": {"width": 25, "height": 25},
      "style": {
        "backgroundColor": "transparent",
        "borderRadius": 0,
        "padding": 4
      },
      "qrSize": 100,
      "includeTicketCode": true
    },
    {
      "id": "event-date",
      "type": "event_date",
      "position": {"x": 10, "y": 105},
      "size": {"width": 65, "height": 10},
      "style": {
        "fontSize": 10,
        "textAlign": "center",
        "color": "#64748b",
        "backgroundColor": "transparent",
        "borderRadius": 0,
        "padding": 4
      },
      "dateFormat": "MMM dd, yyyy"
    }
  ]',
  true
) ON CONFLICT DO NOTHING;