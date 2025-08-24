-- Add enabled field and buttonTextColor to widget_customization theme
UPDATE events
SET widget_customization = jsonb_set(
  widget_customization,
  '{theme,enabled}',
  'false'
)
WHERE widget_customization->'theme'->'enabled' IS NULL;

UPDATE events
SET widget_customization = jsonb_set(
  widget_customization,
  '{theme,buttonTextColor}',
  '"#ffffff"'
)
WHERE widget_customization->'theme'->'buttonTextColor' IS NULL;

-- Update existing records to have all required fields with defaults
UPDATE events
SET widget_customization = jsonb_set(
  widget_customization,
  '{theme}',
  COALESCE(
    widget_customization->'theme' || '{"enabled": false, "buttonTextColor": "#ffffff"}'::jsonb,
    '{"enabled": false, "primaryColor": "#000000", "buttonTextColor": "#ffffff", "secondaryColor": "#ffffff", "backgroundColor": "#ffffff", "headerTextColor": "#111827", "bodyTextColor": "#6b7280", "fontFamily": "Manrope"}'::jsonb
  )
)
WHERE widget_customization->'theme' IS NOT NULL;

-- Add headerTextColor and bodyTextColor fields to existing records
UPDATE events
SET widget_customization = jsonb_set(
  widget_customization,
  '{theme,headerTextColor}',
  COALESCE(
    widget_customization->'theme'->'textColor',
    '"#111827"'
  )
)
WHERE widget_customization->'theme'->'headerTextColor' IS NULL;

UPDATE events
SET widget_customization = jsonb_set(
  widget_customization,
  '{theme,bodyTextColor}',
  '"#374151"'
)
WHERE widget_customization->'theme'->'bodyTextColor' IS NULL;

-- Remove old textColor field if it exists
UPDATE events
SET widget_customization = widget_customization - 'theme' || 
  jsonb_build_object(
    'theme', 
    (widget_customization->'theme') - 'textColor'
  )
WHERE widget_customization->'theme'->'textColor' IS NOT NULL;
