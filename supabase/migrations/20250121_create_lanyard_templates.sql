-- Create lanyard_templates table
CREATE TABLE IF NOT EXISTS lanyard_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimensions JSONB NOT NULL DEFAULT '{"width": 85, "height": 120, "unit": "mm"}',
  background JSONB NOT NULL DEFAULT '{"color": "#ffffff", "pattern": "none"}',
  blocks JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lanyard_templates_org ON lanyard_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_lanyard_templates_default ON lanyard_templates(organization_id, is_default);

-- Enable RLS
ALTER TABLE lanyard_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for lanyard_templates
-- Allow organizations to read their own templates
CREATE POLICY "Organizations can read own templates"
  ON lanyard_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid()
    )
  );

-- Allow organizations to insert their own templates
CREATE POLICY "Organizations can insert own templates"
  ON lanyard_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid()
    )
  );

-- Allow organizations to update their own templates
CREATE POLICY "Organizations can update own templates"
  ON lanyard_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid()
    )
  );

-- Allow organizations to delete their own templates
CREATE POLICY "Organizations can delete own templates"
  ON lanyard_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lanyard_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_lanyard_template_timestamp
  BEFORE UPDATE ON lanyard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lanyard_template_updated_at();

-- Grant necessary permissions
GRANT ALL ON lanyard_templates TO authenticated;
GRANT ALL ON lanyard_templates TO service_role;