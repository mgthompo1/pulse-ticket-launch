import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailTemplatePreviewProps {
  emailCustomization: {
    template: {
      theme: string;
      headerColor: string;
      backgroundColor: string;
      textColor: string;
      buttonColor: string;
      accentColor: string;
      borderColor: string;
      fontFamily: string;
    };
    content: {
      subject: string;
      headerText: string;
      bodyText: string;
      footerText: string;
    };
    branding: {
      showLogo: boolean;
      logoPosition: string;
      logoSize: string;
    };
    layout?: {
      headerStyle: string;
      contentLayout: string;
      footerStyle: string;
    };
  };
  eventDetails: {
    name: string;
    venue?: string;
    event_date: string;
    logo_url?: string;
  };
  organizationDetails: {
    name: string;
    logo_url?: string;
  };
}

export const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  emailCustomization,
  eventDetails,
  organizationDetails
}) => {
  const { template, content, branding, layout = { headerStyle: 'standard', contentLayout: 'standard', footerStyle: 'standard' } } = emailCustomization;
  
  const getLogoUrl = () => {
    if (!branding.showLogo) return null;
    return eventDetails.logo_url || organizationDetails.logo_url;
  };

  const logoUrl = getLogoUrl();

  const getThemeStyles = () => {
    const baseStyles = {
      fontFamily: template.fontFamily || 'Arial, sans-serif',
      backgroundColor: template.backgroundColor,
      color: template.textColor,
    };

    switch (template.theme) {
      case 'modern':
        return {
          ...baseStyles,
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };
      case 'elegant':
        return {
          ...baseStyles,
          borderRadius: '8px',
          border: `2px solid ${template.borderColor}`,
        };
      case 'minimal':
        return {
          ...baseStyles,
          borderRadius: '4px',
          border: `1px solid ${template.borderColor}`,
        };
      case 'creative':
        return {
          ...baseStyles,
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${template.backgroundColor}, ${template.accentColor}15)`,
        };
      default:
        return baseStyles;
    }
  };

  const getHeaderStyle = () => {
    const headerStyle = layout?.headerStyle || 'standard';
    const baseStyle = {
      backgroundColor: template.headerColor,
      color: template.textColor,
      padding: headerStyle === 'compact' ? '15px 20px' : '25px 20px',
    };

    if (headerStyle === 'gradient') {
      return {
        ...baseStyle,
        background: `linear-gradient(135deg, ${template.headerColor}, ${template.accentColor})`,
        color: '#ffffff',
      };
    }

    return baseStyle;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
          <div 
            style={getThemeStyles()}
            className="max-w-md mx-auto bg-white"
          >
            {/* Header */}
            <div style={getHeaderStyle()}>
              {logoUrl && branding.logoPosition === 'header' && (
                <div className="text-center mb-3">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding.logoSize === 'small' ? '40px' : 
                                branding.logoSize === 'large' ? '80px' : '60px',
                      maxWidth: '200px',
                      height: 'auto'
                    }}
                    className="mx-auto"
                  />
                </div>
              )}
              <h1 
                style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: 0,
                  textAlign: 'center'
                }}
              >
                {content.headerText}
              </h1>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              {logoUrl && branding.logoPosition === 'content' && (
                <div className="text-center mb-4">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding.logoSize === 'small' ? '40px' : 
                                branding.logoSize === 'large' ? '80px' : '60px',
                      maxWidth: '200px',
                      height: 'auto'
                    }}
                    className="mx-auto"
                  />
                </div>
              )}

              {/* Event Details */}
              <div 
                style={{ 
                  backgroundColor: `${template.accentColor}15`,
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: `1px solid ${template.borderColor}`,
                  textAlign: 'center'
                }}
              >
                <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>
                  {eventDetails.name}
                </h2>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  📅 {formatDate(eventDetails.event_date)}
                </p>
                {eventDetails.venue && (
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    📍 {eventDetails.venue}
                  </p>
                )}
              </div>

              {/* Body Text */}
              <div 
                style={{ 
                  color: template.textColor,
                  lineHeight: '1.6',
                  marginBottom: '20px'
                }}
              >
                {content.bodyText}
              </div>

              {/* Mock Ticket Section */}
              <div 
                style={{ 
                  border: `1px solid ${template.borderColor}`,
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}
              >
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Your Tickets:</h3>
                <div style={{ 
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong>General Admission</strong><br />
                  <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                    TCK-SAMPLE123
                  </code>
                </div>
              </div>

              {/* CTA Button */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  style={{
                    backgroundColor: template.buttonColor,
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  View Tickets
                </button>
              </div>
            </div>

            {/* Footer */}
            <div 
              style={{ 
                backgroundColor: '#f8f9fa',
                padding: '15px 20px',
                borderTop: `1px solid ${template.borderColor}`,
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center' as const
              }}
            >
              {content.footerText}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};