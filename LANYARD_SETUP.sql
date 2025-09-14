-- LANYARD TEMPLATES TABLE SETUP
-- Run this SQL in your Supabase SQL Editor to enable lanyard template persistence

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
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy for public read access (for preview purposes)
CREATE POLICY "Public read access to lanyard templates" ON lanyard_templates
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS lanyard_templates_organization_id_idx ON lanyard_templates(organization_id);
CREATE INDEX IF NOT EXISTS lanyard_templates_is_default_idx ON lanyard_templates(organization_id, is_default);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_lanyard_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_lanyard_template_updated_at ON lanyard_templates;
CREATE TRIGGER update_lanyard_template_updated_at
  BEFORE UPDATE ON lanyard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lanyard_template_updated_at();

-- Success message
SELECT 'Lanyard templates table created successfully!' as status;