// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmailTemplate } from '@/types/email-template';
import { emailRenderer } from '@/lib/emailRenderer';

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
  ticketDeliveryMethod?: string;
}

export const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  emailCustomization,
  eventDetails,
  organizationDetails,
  blocksTemplate,
  ticketDeliveryMethod = 'qr_ticket',
  isAttractionMode
}) => {
  // Create mock order data for preview
  const mockOrderData = {
    events: {
      name: eventDetails?.name || 'Sample Event',
      venue: eventDetails?.venue || 'Sample Venue',
      event_date: eventDetails?.event_date || new Date().toISOString(),
      ...(eventDetails?.logo_url && { logo_url: eventDetails.logo_url }),
      organizations: {
        name: organizationDetails?.name || 'Sample Organization',
        ...(organizationDetails?.logo_url && { logo_url: organizationDetails.logo_url })
      }
    },
    customer_email: 'customer@example.com',
    customer_name: 'Sample Customer',
    total_amount: 75.50,
    order_items: [
      {
        item_type: 'ticket',
        quantity: 2,
        unit_price: 25.00,
        ticket_types: { name: 'General Admission' }
      },
      {
        item_type: 'ticket',
        quantity: 1,
        unit_price: 25.50,
        ticket_types: { name: 'VIP Access' }
      }
    ]
  };

  // Create mock tickets
  const mockTickets = [
    { code: 'TCK-SAMPLE-001', type: 'General Admission' },
    { code: 'TCK-SAMPLE-002', type: 'General Admission' },
    { code: 'TCK-SAMPLE-003', type: 'VIP Access' }
  ];

  // Create mock payment data
  const mockPaymentData = {
    brand: 'Visa',
    last4: '4242',
    type: 'card'
  };

  // Determine template to use
  let templateToUse: EmailTemplate;
  
  // Check if we should show "View Tickets" button based on delivery method
  const shouldShowViewTicketsButton = ticketDeliveryMethod !== 'email_confirmation_only' && ticketDeliveryMethod !== 'email_confirmation';
  
  if (blocksTemplate && Array.isArray(blocksTemplate.blocks)) {
    templateToUse = blocksTemplate;
  } else if (emailCustomization?.template) {
    // Convert old template format to new blocks format
    const blocks = [
      { id: '1', type: 'header', title: emailCustomization.content?.headerText || 'Thank you for your purchase!', align: 'center' },
      { id: '2', type: 'event_details', showDate: true, showTime: true, showVenue: true, showCustomer: true },
      { id: '3', type: 'text', html: emailCustomization.content?.bodyText || 'We look forward to seeing you at the event.' },
      { id: '4', type: 'ticket_list', showCode: true, showPrice: true }
    ];
    
    // Only add View Tickets button for delivery methods that have actual ticket files
    if (shouldShowViewTicketsButton) {
      blocks.push({ id: '5', type: 'button', label: 'View Tickets', url: '#', align: 'center' });
    }
    
    templateToUse = {
      version: 1,
      subject: 'Your ticket confirmation',
      theme: {
        headerColor: emailCustomization.template.headerColor || '#0f172a',
        backgroundColor: emailCustomization.template.backgroundColor || '#ffffff',
        textColor: emailCustomization.template.textColor || '#334155',
        buttonColor: emailCustomization.template.buttonColor || '#0f172a',
        accentColor: emailCustomization.template.accentColor || '#f8fafc',
        borderColor: emailCustomization.template.borderColor || '#e2e8f0',
        fontFamily: emailCustomization.template.fontFamily || "'Inter', sans-serif"
      },
      blocks
    };
  } else {
    // Default template
    const blocks = [
      { id: '1', type: 'header', title: 'Thank you for your purchase!', align: 'center' },
      { id: '2', type: 'event_details', showDate: true, showTime: true, showVenue: true, showCustomer: true },
      { id: '3', type: 'ticket_list', showCode: true, showPrice: true }
    ];
    
    // Only add View Tickets button for delivery methods that have actual ticket files
    if (shouldShowViewTicketsButton) {
      blocks.push({ id: '4', type: 'button', label: 'View Tickets', url: '#', align: 'center' });
    }
    
    templateToUse = {
      version: 1,
      subject: 'Your ticket confirmation',
      theme: {
        headerColor: '#0f172a',
        backgroundColor: '#ffffff',
        textColor: '#334155',
        buttonColor: '#0f172a',
        accentColor: '#f8fafc',
        borderColor: '#e2e8f0',
        fontFamily: "'Inter', sans-serif"
      },
      blocks
    };
  }

  // Get branding configuration with proper defaults
  const branding = {
    showLogo: true,
    logoPosition: 'header',
    logoSize: 'medium',
    logoSource: 'event', // Always default to event logo first
    ...emailCustomization?.branding
  };

  // Generate the email HTML using unified renderer
  const emailHtml = emailRenderer.renderEmailHtml(
    templateToUse,
    mockOrderData,
    mockTickets,
    ticketDeliveryMethod,
    branding,
    mockPaymentData
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
        <p className="text-sm text-muted-foreground">
          This preview shows exactly how your email will appear to customers
        </p>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
          {/* Render the unified HTML - this is EXACTLY what customers will see */}
          <div 
            dangerouslySetInnerHTML={{ __html: emailHtml }}
            style={{ 
              maxWidth: '600px', 
              margin: '0 auto',
              // Add some basic sanitization styles
              lineHeight: '1.6'
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};