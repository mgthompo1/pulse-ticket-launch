-- Add event customization fields
ALTER TABLE events ADD COLUMN widget_customization JSONB DEFAULT '{
  "theme": {
    "primaryColor": "#000000",
    "secondaryColor": "#ffffff", 
    "backgroundColor": "#ffffff",
    "textColor": "#000000",
    "fontFamily": "Inter"
  },
  "layout": {
    "showEventImage": true,
    "showDescription": true,
    "showVenue": true,
    "showCapacity": true,
    "ticketLayout": "list"
  },
  "branding": {
    "showOrgLogo": true,
    "customCss": "",
    "customHeaderText": "",
    "customFooterText": ""
  }
}'::jsonb;

-- Add ticket customization fields  
ALTER TABLE events ADD COLUMN ticket_customization JSONB DEFAULT '{
  "design": {
    "template": "modern",
    "backgroundColor": "#ffffff",
    "textColor": "#000000",
    "borderColor": "#e5e7eb",
    "qrCodePosition": "bottom-right"
  },
  "content": {
    "showLogo": true,
    "showQrCode": true,
    "showEventDetails": true,
    "showVenueInfo": true,
    "customFields": []
  }
}'::jsonb;

-- Add email customization fields
ALTER TABLE events ADD COLUMN email_customization JSONB DEFAULT '{
  "template": {
    "headerColor": "#000000",
    "backgroundColor": "#ffffff", 
    "textColor": "#000000",
    "buttonColor": "#000000"
  },
  "content": {
    "subject": "Your ticket confirmation",
    "headerText": "Thank you for your purchase!",
    "bodyText": "We are excited to see you at the event.",
    "footerText": "Questions? Contact us anytime."
  },
  "branding": {
    "showLogo": true,
    "logoPosition": "header"
  }
}'::jsonb;