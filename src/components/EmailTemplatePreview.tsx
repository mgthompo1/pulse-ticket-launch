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
            style={{
              fontFamily: template.fontFamily || 'Arial, sans-serif',
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: template.backgroundColor,
              borderRadius: template.theme === 'modern' ? '12px' : template.theme === 'elegant' ? '8px' : template.theme === 'minimal' ? '4px' : template.theme === 'creative' ? '16px' : '0px',
              boxShadow: template.theme === 'modern' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
              border: template.theme === 'elegant' ? `2px solid ${template.borderColor}` : template.theme === 'minimal' ? `1px solid ${template.borderColor}` : 'none',
              background: template.theme === 'creative' ? `linear-gradient(135deg, ${template.backgroundColor}, ${template.accentColor}15)` : template.backgroundColor
            }}
          >
            {/* Header Section - Matches actual email template */}
            <div style={{
              backgroundColor: template.headerColor,
              color: '#ffffff',
              padding: layout?.headerStyle === 'compact' ? '15px 20px' : '25px 20px',
              borderRadius: template.theme === 'modern' ? '12px 12px 0 0' : template.theme === 'elegant' ? '8px 8px 0 0' : template.theme === 'minimal' ? '4px 4px 0 0' : template.theme === 'creative' ? '16px 16px 0 0' : '0'
            }}>
              {logoUrl && branding.showLogo && branding.logoPosition === 'header' && (
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding.logoSize === 'small' ? '40px' : branding.logoSize === 'large' ? '80px' : '60px',
                      maxWidth: '200px',
                      height: 'auto'
                    }}
                  />
                </div>
              )}
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: layout?.headerStyle === 'center' ? 'center' : 'left',
                color: '#ffffff'
              }}>
                {content.headerText}
              </h1>
            </div>
            
            {/* Content Section - Matches actual email template */}
            <div style={{ padding: '30px 20px' }}>
              {logoUrl && branding.showLogo && branding.logoPosition === 'content' && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding.logoSize === 'small' ? '40px' : branding.logoSize === 'large' ? '80px' : '60px',
                      maxWidth: '200px',
                      height: 'auto'
                    }}
                  />
                </div>
              )}
              
              {/* Event Details Card - Matches actual email template */}
              <div style={{
                backgroundColor: template.accentColor,
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '25px',
                border: `1px solid ${template.borderColor}`
              }}>
                <h2 style={{
                  margin: '0 0 15px 0',
                  color: template.textColor,
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  {eventDetails.name}
                </h2>
                <p style={{ margin: '5px 0', fontSize: '14px', color: template.textColor }}>
                  📅 {formatDate(eventDetails.event_date)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: template.textColor }}>
                  📍 {eventDetails.venue || 'TBA'}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: template.textColor }}>
                  👤 Sample Customer
                </p>
              </div>

              {/* Body Text - Matches actual email template */}
              <div style={{
                color: template.textColor,
                lineHeight: '1.6',
                marginBottom: '25px',
                fontSize: '16px'
              }}>
                {content.bodyText}
              </div>

              {/* Tickets Section - Matches actual email template structure */}
              <h3 style={{
                color: template.textColor,
                marginBottom: '15px',
                fontSize: '18px'
              }}>
                Your Tickets:
              </h3>
              
              {/* Sample ticket - matches actual email template */}
              <div style={{
                border: `1px solid ${template.borderColor}`,
                padding: '20px',
                margin: '15px 0',
                borderRadius: '8px',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <strong style={{
                      fontSize: '16px',
                      color: template.textColor
                    }}>
                      General Admission
                    </strong>
                    <br />
                    <code style={{
                      background: template.accentColor,
                      padding: '8px 12px',
                      fontSize: '14px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      margin: '8px 0',
                      fontFamily: "'Courier New', monospace"
                    }}>
                      TCK-SAMPLE123
                    </code>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{
                      fontSize: '16px',
                      color: template.textColor
                    }}>
                      $25.00
                    </strong>
                  </div>
                </div>
              </div>

              {/* Important Information - Matches actual email template */}
              <div style={{
                background: template.accentColor,
                padding: '20px',
                borderRadius: '8px',
                margin: '25px 0',
                borderLeft: `4px solid ${template.buttonColor}`
              }}>
                <h4 style={{
                  margin: '0 0 10px 0',
                  color: template.textColor
                }}>
                  Important Information:
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: template.textColor
                }}>
                  <li>Present your ticket codes at the event entrance</li>
                  <li>Screenshots or printed versions are accepted</li>
                  <li>Each ticket is valid for one person only</li>
                  <li>Arrive early to avoid queues</li>
                </ul>
              </div>

              {/* Contact Information - Matches actual email template */}
              <p style={{
                color: '#666',
                fontSize: '14px',
                margin: '20px 0'
              }}>
                Questions? Contact the event organizer: <a href="#" style={{
                  color: template.buttonColor
                }}>
                  organizer@example.com
                </a>
              </p>
            </div>
            
            {/* Footer - Matches actual email template */}
            <div style={{
              backgroundColor: template.accentColor,
              padding: '20px',
              textAlign: 'center',
              borderRadius: template.theme === 'modern' ? '0 0 12px 12px' : template.theme === 'elegant' ? '0 0 8px 8px' : template.theme === 'minimal' ? '0 0 4px 4px' : template.theme === 'creative' ? '0 0 16px 16px' : '0',
              borderTop: `1px solid ${template.borderColor}`
            }}>
              <p style={{
                color: '#999',
                fontSize: '12px',
                margin: 0
              }}>
                {content.footerText}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};