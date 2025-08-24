-- Add buttonTextColor field to widget_customization theme
UPDATE events 
SET widget_customization = jsonb_set(
  widget_customization, 
  '{theme,buttonTextColor}', 
  '"#ffffff"'
)
WHERE widget_customization->'theme'->'buttonTextColor' IS NULL;

-- Update existing records to have buttonTextColor
UPDATE events 
SET widget_customization = jsonb_set(
  widget_customization, 
  '{theme}', 
  COALESCE(
    widget_customization->'theme' || '{"buttonTextColor": "#ffffff"}'::jsonb,
    '{"primaryColor": "#f97316", "buttonTextColor": "#ffffff", "secondaryColor": "#ffffff", "backgroundColor": "#ffffff", "textColor": "#111827", "fontFamily": "Inter"}'::jsonb
  )
)
WHERE widget_customization->'theme' IS NOT NULL;
