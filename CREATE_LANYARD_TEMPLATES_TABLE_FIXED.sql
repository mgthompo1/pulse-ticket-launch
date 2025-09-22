-- Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Fixed version that doesn't rely on profiles table

-- Drop existing table if it exists
DROP TABLE IF EXISTS lanyard_templates CASCADE;

-- Create lanyard_templates table
CREATE TABLE lanyard_templates (
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

-- Create indexes
CREATE INDEX idx_lanyard_templates_org ON lanyard_templates(organization_id);
CREATE INDEX idx_lanyard_templates_default ON lanyard_templates(organization_id, is_default);

-- Enable RLS
ALTER TABLE lanyard_templates ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies that allow authenticated users to manage templates
-- (We can make these more restrictive later once we understand your auth structure)

-- Allow authenticated users to read all templates (adjust as needed)
CREATE POLICY "Allow authenticated read"
  ON lanyard_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert templates
CREATE POLICY "Allow authenticated insert"
  ON lanyard_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update templates
CREATE POLICY "Allow authenticated update"
  ON lanyard_templates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete templates
CREATE POLICY "Allow authenticated delete"
  ON lanyard_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_lanyard_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_lanyard_template_timestamp ON lanyard_templates;
CREATE TRIGGER update_lanyard_template_timestamp
  BEFORE UPDATE ON lanyard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lanyard_template_updated_at();

-- Grant permissions
GRANT ALL ON lanyard_templates TO authenticated;
GRANT ALL ON lanyard_templates TO service_role;

-- Success message
SELECT 'Lanyard templates table created successfully!' as status;