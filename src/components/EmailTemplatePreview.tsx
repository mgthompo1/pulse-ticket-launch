import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmailTemplate } from '@/types/email-template';

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
    content?: {
      subject: string;
      headerText: string;
      bodyText: string;
      footerText: string;
    };
    branding: {
      showLogo: boolean;
      logoPosition: string;
      logoSize: string;
      logoSource?: string;
      customLogoUrl?: string;
    };
    layout?: {
      headerStyle: string;
      contentLayout: string;
      footerStyle: string;
    };
  };
  // Optional: render from new block-based template
  blocksTemplate?: EmailTemplate;
  eventDetails?: {
    name: string;
    venue?: string;
    event_date: string;
    logo_url?: string;
  };
  attractionDetails?: {
    name: string;
    venue?: string;
    attraction_type: string;
    duration_minutes: number;
    base_price: number;
    logo_url?: string;
  };
  organizationDetails: {
    name: string;
    logo_url?: string;
  };
  isAttractionMode?: boolean;
}

export const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  emailCustomization,
  eventDetails,
  organizationDetails,
  blocksTemplate
}) => {
  const { template, content, branding, layout = { headerStyle: 'standard', contentLayout: 'standard', footerStyle: 'standard' } } = emailCustomization || {};
  
  // Provide default values if content is undefined
  const safeContent = content || {
    subject: 'Email Confirmation',
    headerText: 'Thank you for your booking!',
    bodyText: 'We have received your booking and will send you a confirmation shortly.',
    footerText: 'This email was sent by our automated system. Please do not reply.'
  };

  // Provide default template if undefined
  const safeTemplate = template || {
    backgroundColor: '#ffffff',
    headerColor: '#000000',
    textColor: '#333333',
    buttonColor: '#007bff',
    accentColor: '#f8f9fa',
    borderColor: '#e5e7eb',
    fontFamily: 'Arial, sans-serif',
    theme: 'standard'
  };

  // Provide default event details if undefined
  const safeEventDetails = eventDetails || {
    name: 'Sample Event',
    venue: 'Sample Venue',
    event_date: new Date().toISOString(),
    logo_url: ''
  };
  
  const getLogoUrl = () => {
    if (!branding?.showLogo) return null;
    
    const logoSource = branding?.logoSource || 'event';
    
    switch (logoSource) {
      case 'organization':
        return organizationDetails?.logo_url || null;
      case 'custom':
        return branding?.customLogoUrl || null;
      case 'event':
      default:
        // Fallback from event logo to organization logo if event logo is not available
        return safeEventDetails.logo_url || organizationDetails?.logo_url || null;
    }
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

  // If blocks provided, render simplified preview of blocks
  if (blocksTemplate && Array.isArray(blocksTemplate.blocks)) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
            <div
              data-email-preview-root
              style={{
                fontFamily: blocksTemplate.theme.fontFamily || 'Arial, sans-serif',
                maxWidth: '600px',
                margin: '0 auto',
                backgroundColor: blocksTemplate.theme.backgroundColor,
                border: `1px solid ${blocksTemplate.theme.borderColor || '#e5e7eb'}`,
              }}
            >
              {/* Logo - Header Position */}
              {logoUrl && branding?.showLogo && branding?.logoPosition === 'header' && (
                <div style={{ textAlign: 'center', marginBottom: '15px', padding: '20px 20px 0 20px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{ 
                      maxWidth: branding?.logoSize === 'small' ? '80px' : branding?.logoSize === 'large' ? '150px' : '120px',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                </div>
              )}
              
              {blocksTemplate.blocks.map((b) => {
                if (b.type === 'header') {
                  const title = (b as any).title || 'Header';
                  return (
                    <div key={b.id} style={{ backgroundColor: blocksTemplate.theme.headerColor, color: '#fff', padding: '20px' }}>
                      <h1 style={{ margin: 0, textAlign: 'center' }}>{title}</h1>
                    </div>
                  );
                }
                if (b.type === 'text') {
                  return (
                    <div key={b.id} style={{ padding: '16px 20px', color: blocksTemplate.theme.textColor }}
                      dangerouslySetInnerHTML={{ __html: (b as any).html || '' }} />
                  );
                }
                if (b.type === 'event_details') {
                  return (
                    <div key={b.id} style={{ background: blocksTemplate.theme.accentColor, border: `1px solid ${blocksTemplate.theme.borderColor}`, margin: '16px 20px', padding: '16px', borderRadius: 8 }}>
                      <strong style={{ color: blocksTemplate.theme.textColor }}>{safeEventDetails.name}</strong>
                      <div style={{ color: blocksTemplate.theme.textColor, fontSize: 14, lineHeight: 1.6, marginTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0', padding: '12px', background: blocksTemplate.theme.accentColor, borderRadius: '8px', borderLeft: `3px solid ${blocksTemplate.theme.buttonColor}` }}>
                          <div style={{ background: blocksTemplate.theme.buttonColor, color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                              <line x1="16" x2="16" y1="2" y2="6"/>
                              <line x1="8" x2="8" y1="2" y2="6"/>
                              <line x1="3" x2="21" y1="10" y2="10"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: blocksTemplate.theme.textColor, marginBottom: '2px' }}>{new Date(safeEventDetails.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div style={{ color: blocksTemplate.theme.textColor + 'CC', fontSize: '13px' }}>{new Date(safeEventDetails.event_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0', padding: '12px', background: blocksTemplate.theme.accentColor, borderRadius: '8px', borderLeft: `3px solid ${blocksTemplate.theme.buttonColor}` }}>
                          <div style={{ background: blocksTemplate.theme.buttonColor, color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: blocksTemplate.theme.textColor + '88', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Venue</div>
                            <div style={{ fontWeight: 600, color: blocksTemplate.theme.textColor }}>{safeEventDetails.venue || 'TBA'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (b.type === 'ticket_list') {
                  return (
                    <div key={b.id} style={{ padding: '0 20px', color: blocksTemplate.theme.textColor }}>
                      <h3>Your Tickets</h3>
                      <div style={{ border: `1px solid ${blocksTemplate.theme.borderColor}`, padding: 16, borderRadius: 8, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>General Admission</span>
                          <code style={{ background: blocksTemplate.theme.accentColor, padding: '4px 8px' }}>TCK-XXXXXX</code>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (b.type === 'button') {
                  return (
                    <div key={b.id} style={{ textAlign: (b as any).align || 'center', padding: 20 }}>
                      <a href="#" style={{ background: blocksTemplate.theme.buttonColor, color: '#fff', padding: '10px 16px', borderRadius: 6, textDecoration: 'none' }}>{(b as any).label || 'Button'}</a>
                    </div>
                  );
                }
                if (b.type === 'divider') {
                  return <hr key={b.id} style={{ border: 0, borderTop: `1px solid ${blocksTemplate.theme.borderColor}`, margin: '16px 20px' }} />;
                }
                if (b.type === 'image') {
                  return (
                    <div key={b.id} style={{ textAlign: (b as any).align || 'center', padding: 20 }}>
                      {(b as any).src ? <img src={(b as any).src} alt={(b as any).alt || ''} style={{ maxWidth: '100%' }} /> : <em style={{ color: '#999' }}>No image</em>}
                    </div>
                  );
                }
                if (b.type === 'footer') {
                  return (
                    <div key={b.id} style={{ background: blocksTemplate.theme.accentColor, padding: 16, textAlign: 'center', borderTop: `1px solid ${blocksTemplate.theme.borderColor}` }}>
                      <small style={{ color: '#999' }}>{(b as any).text || ''}</small>
                    </div>
                  );
                }
                return null;
              })}
              
              {/* Logo - Footer Position */}
              {logoUrl && branding?.showLogo && branding?.logoPosition === 'footer' && (
                <div style={{ textAlign: 'center', marginTop: '15px', padding: '0 20px 20px 20px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{ 
                      maxWidth: branding?.logoSize === 'small' ? '80px' : branding?.logoSize === 'large' ? '150px' : '120px',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
          <div 
            data-email-preview-root
            style={{
              fontFamily: safeTemplate.fontFamily || 'Arial, sans-serif',
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: safeTemplate.backgroundColor,
              borderRadius: safeTemplate.theme === 'modern' ? '12px' : safeTemplate.theme === 'elegant' ? '8px' : safeTemplate.theme === 'minimal' ? '4px' : safeTemplate.theme === 'creative' ? '16px' : '0px',
              boxShadow: safeTemplate.theme === 'modern' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
              border: safeTemplate.theme === 'elegant' ? `2px solid ${safeTemplate.borderColor}` : safeTemplate.theme === 'minimal' ? `1px solid ${safeTemplate.borderColor}` : 'none',
              background: safeTemplate.theme === 'creative' ? `linear-gradient(135deg, ${safeTemplate.backgroundColor}, ${safeTemplate.accentColor}15)` : safeTemplate.backgroundColor
            }}
          >
            {/* Header Section - Matches actual email template */}
            <div style={{
              backgroundColor: safeTemplate.headerColor,
              color: '#ffffff',
              padding: layout?.headerStyle === 'compact' ? '15px 20px' : '25px 20px',
              borderRadius: safeTemplate.theme === 'modern' ? '12px 12px 0 0' : safeTemplate.theme === 'elegant' ? '8px 8px 0 0' : safeTemplate.theme === 'minimal' ? '4px 4px 0 0' : safeTemplate.theme === 'creative' ? '16px 16px 0 0' : '0'
            }}>
              {logoUrl && branding?.showLogo && branding?.logoPosition === 'header' && (
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding?.logoSize === 'small' ? '40px' : branding?.logoSize === 'large' ? '80px' : '60px',
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
                {safeContent.headerText}
              </h1>
            </div>
            
            {/* Content Section - Matches actual email template */}
            <div style={{ padding: '30px 20px' }}>

              
              {/* Event Details Card - Matches actual email template */}
              <div style={{
                backgroundColor: safeTemplate.accentColor,
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '25px',
                border: `1px solid ${safeTemplate.borderColor}`
              }}>
                <h2 style={{
                  margin: '0 0 15px 0',
                  color: safeTemplate.textColor,
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  {safeEventDetails.name}
                </h2>
                <div style={{ fontSize: '14px', lineHeight: 1.6, marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0', padding: '12px', background: safeTemplate.accentColor, borderRadius: '8px', borderLeft: `3px solid ${safeTemplate.buttonColor}` }}>
                    <div style={{ background: safeTemplate.buttonColor, color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" x2="16" y1="2" y2="6"/>
                        <line x1="8" x2="8" y1="2" y2="6"/>
                        <line x1="3" x2="21" y1="10" y2="10"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: safeTemplate.textColor, marginBottom: '2px' }}>{formatDate(safeEventDetails.event_date)}</div>
                      <div style={{ color: safeTemplate.textColor + 'CC', fontSize: '13px' }}>Sample Time</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0', padding: '12px', background: safeTemplate.accentColor, borderRadius: '8px', borderLeft: `3px solid ${safeTemplate.buttonColor}` }}>
                    <div style={{ background: safeTemplate.buttonColor, color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: safeTemplate.textColor + '88', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Venue</div>
                      <div style={{ fontWeight: 600, color: safeTemplate.textColor }}>{safeEventDetails.venue || 'TBA'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0', padding: '12px', background: safeTemplate.accentColor, borderRadius: '8px', borderLeft: `3px solid ${safeTemplate.buttonColor}` }}>
                    <div style={{ background: safeTemplate.buttonColor, color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div style={{ flex: '1' }}>
                      <div style={{ color: safeTemplate.textColor + '88', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Attendee</div>
                      <div style={{ fontWeight: 600, color: safeTemplate.textColor }}>Sample Customer</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Text - Matches actual email template */}
              <div style={{
                color: safeTemplate.textColor,
                lineHeight: '1.6',
                marginBottom: '25px',
                fontSize: '16px'
              }}>
                {safeContent.bodyText}
              </div>

              {/* Tickets Section - Matches actual email template structure */}
              <h3 style={{
                color: safeTemplate.textColor,
                marginBottom: '15px',
                fontSize: '18px'
              }}>
                Your Tickets:
              </h3>
              
              {/* Sample ticket - matches actual email template */}
              <div style={{
                border: `1px solid ${safeTemplate.borderColor}`,
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
                      color: safeTemplate.textColor
                    }}>
                      General Admission
                    </strong>
                    <br />
                    <code style={{
                      background: safeTemplate.accentColor,
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
                      color: safeTemplate.textColor
                    }}>
                      $25.00
                    </strong>
                  </div>
                </div>
              </div>

              {/* Important Information - Matches actual email template */}
              <div style={{
                background: safeTemplate.accentColor,
                padding: '20px',
                borderRadius: '8px',
                margin: '25px 0',
                borderLeft: `4px solid ${safeTemplate.buttonColor}`
              }}>
                <h4 style={{
                  margin: '0 0 10px 0',
                  color: safeTemplate.textColor
                }}>
                  Important Information:
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: safeTemplate.textColor
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
                  color: safeTemplate.buttonColor
                }}>
                  organizer@example.com
                </a>
              </p>
            </div>
            
            {/* Footer - Matches actual email template */}
            <div style={{
              backgroundColor: safeTemplate.accentColor,
              padding: '20px',
              textAlign: 'center',
              borderRadius: safeTemplate.theme === 'modern' ? '0 0 12px 12px' : safeTemplate.theme === 'elegant' ? '0 0 8px 8px' : safeTemplate.theme === 'minimal' ? '0 0 4px 4px' : safeTemplate.theme === 'creative' ? '0 0 16px 16px' : '0',
              borderTop: `1px solid ${safeTemplate.borderColor}`
            }}>
              {logoUrl && branding?.showLogo && branding?.logoPosition === 'footer' && (
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{
                      maxHeight: branding?.logoSize === 'small' ? '40px' : branding?.logoSize === 'large' ? '80px' : '60px',
                      maxWidth: '200px',
                      height: 'auto'
                    }}
                  />
                </div>
              )}
              <p style={{
                color: '#999',
                fontSize: '12px',
                margin: 0
              }}>
                {safeContent.footerText}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};