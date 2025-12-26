import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailData {
  bookingId: string
  customerEmail: string
  customerName: string
  attractionName: string
  startTime: string
  endTime: string
  venue: string
  resourceName?: string
  partySize: number
  totalAmount: number
  bookingReference: string
  organizationName: string
  logoUrl?: string
  currency?: string
}

interface EmailBlock {
  type: 'header' | 'text' | 'event_details' | 'footer' | 'button' | 'image'
  title?: string
  text?: string
  html?: string
  showDate?: boolean
  showTime?: boolean
  showVenue?: boolean
  showResource?: boolean
  showPartySize?: boolean
  showTotal?: boolean
  showReference?: boolean
  buttonText?: string
  buttonUrl?: string
  imageUrl?: string
}

interface EmailTheme {
  primaryColor?: string
  headerBgColor?: string
  footerBgColor?: string
  textColor?: string
  backgroundColor?: string
  fontFamily?: string
}

interface EmailCustomization {
  template?: {
    subject?: string
    blocks?: EmailBlock[]
    theme?: EmailTheme
  }
  branding?: {
    showLogo?: boolean
  }
}

// Default theme values
const defaultTheme: EmailTheme = {
  primaryColor: '#3b82f6',
  headerBgColor: '#1f2937',
  footerBgColor: '#f3f4f6',
  textColor: '#374151',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
}

// Default blocks if none configured
const defaultBlocks: EmailBlock[] = [
  { type: 'header', title: 'Booking Confirmed!' },
  { type: 'text', html: 'Your booking has been confirmed. We look forward to welcoming you!' },
  { type: 'event_details', showDate: true, showTime: true, showVenue: true, showResource: true, showPartySize: true, showTotal: true, showReference: true },
  { type: 'footer', text: 'Questions? Contact us anytime.' }
]

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Generate ICS calendar file content
function generateICSContent(data: EmailData): string {
  const startDate = new Date(data.startTime);
  const endDate = new Date(data.endTime);

  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const uid = `${data.bookingId}@ticketflo.org`;
  const dtstamp = formatICSDate(new Date());
  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);

  // Escape special characters for ICS
  const escapeICS = (str: string) => {
    return str.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  const description = escapeICS(
    `Booking Reference: ${data.bookingReference}\\n` +
    `Party Size: ${data.partySize} ${data.partySize === 1 ? 'person' : 'people'}\\n` +
    `Total: ${formatCurrency(data.totalAmount, data.currency)}\\n\\n` +
    `Booked through ${data.organizationName}`
  );

  const location = escapeICS(data.venue || '');
  const summary = escapeICS(`${data.attractionName} - ${data.bookingReference}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TicketFlo//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    `ORGANIZER;CN=${escapeICS(data.organizationName)}:mailto:noreply@ticketflo.org`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Your booking is in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

const formatDateTime = (dateTimeStr: string) => {
  const date = new Date(dateTimeStr)
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
}

function renderBlock(block: EmailBlock, data: EmailData, theme: EmailTheme): string {
  const startDateTime = formatDateTime(data.startTime)
  const endDateTime = formatDateTime(data.endTime)

  switch (block.type) {
    case 'header':
      return `
        <div style="background-color: ${theme.headerBgColor}; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">${block.title || 'Booking Confirmed!'}</h1>
        </div>
      `

    case 'text':
      const textContent = block.html || block.text || ''
      // Replace placeholders
      const processedText = textContent
        .replace(/\{\{customer_name\}\}/g, data.customerName)
        .replace(/\{\{attraction_name\}\}/g, data.attractionName)
        .replace(/\{\{booking_reference\}\}/g, data.bookingReference)
        .replace(/\{\{organization_name\}\}/g, data.organizationName)

      return `
        <div style="padding: 20px;">
          <p style="color: ${theme.textColor}; font-size: 16px; line-height: 1.6; margin: 0;">
            ${processedText}
          </p>
        </div>
      `

    case 'event_details':
      let detailsHtml = `
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px;">
          <h3 style="margin: 0 0 15px 0; color: ${theme.headerBgColor}; font-size: 18px;">Booking Details</h3>
      `

      if (block.showDate !== false) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>📅 Date</strong></span>
            <span style="color: ${theme.textColor};">${startDateTime.date}</span>
          </div>
        `
      }

      if (block.showTime !== false) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>🕐 Time</strong></span>
            <span style="color: ${theme.textColor};">${startDateTime.time} - ${endDateTime.time}</span>
          </div>
        `
      }

      if (block.showVenue !== false && data.venue) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>📍 Location</strong></span>
            <span style="color: ${theme.textColor};">${data.venue}</span>
          </div>
        `
      }

      if (block.showResource !== false && data.resourceName) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>🎯 Resource</strong></span>
            <span style="color: ${theme.textColor};">${data.resourceName}</span>
          </div>
        `
      }

      if (block.showPartySize !== false) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>👥 Party Size</strong></span>
            <span style="color: ${theme.textColor};">${data.partySize} ${data.partySize === 1 ? 'person' : 'people'}</span>
          </div>
        `
      }

      if (block.showReference !== false) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${theme.textColor};"><strong>🎫 Reference</strong></span>
            <span style="color: ${theme.textColor}; font-weight: 600;">${data.bookingReference}</span>
          </div>
        `
      }

      if (block.showTotal !== false) {
        detailsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 12px 0;">
            <span style="color: ${theme.textColor};"><strong>💰 Total</strong></span>
            <span style="color: ${theme.primaryColor}; font-weight: 600; font-size: 18px;">${formatCurrency(data.totalAmount, data.currency)}</span>
          </div>
        `
      }

      detailsHtml += '</div>'
      return detailsHtml

    case 'button':
      const buttonUrl = (block.buttonUrl || '/booking/' + data.bookingId)
        .replace(/\{\{booking_id\}\}/g, data.bookingId)

      return `
        <div style="text-align: center; padding: 20px;">
          <a href="${buttonUrl}" style="background-color: ${theme.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            ${block.buttonText || 'View Booking Details'}
          </a>
        </div>
      `

    case 'image':
      if (!block.imageUrl) return ''
      return `
        <div style="text-align: center; padding: 20px;">
          <img src="${block.imageUrl}" alt="" style="max-width: 100%; height: auto; border-radius: 8px;" />
        </div>
      `

    case 'footer':
      // Generate Google Calendar URL
      const gcalStart = new Date(data.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const gcalEnd = new Date(data.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.attractionName)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(`Booking Reference: ${data.bookingReference}\nParty Size: ${data.partySize}`)}&location=${encodeURIComponent(data.venue || '')}`;

      return `
        <div style="text-align: center; padding: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 14px; color: ${theme.textColor};">Add this booking to your calendar:</p>
          <a href="${gcalUrl}" target="_blank" style="display: inline-block; background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; margin-right: 10px;">
            📅 Google Calendar
          </a>
          <span style="display: inline-block; background-color: #f0f0f0; color: ${theme.textColor}; padding: 10px 20px; border-radius: 6px; font-size: 14px;">
            📎 .ics file attached
          </span>
        </div>
        <div style="background-color: ${theme.footerBgColor}; padding: 20px; text-align: center; color: ${theme.textColor}; font-size: 14px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">${block.text || 'Questions? Contact us anytime.'}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
            This booking was made through ${data.organizationName}
          </p>
        </div>
      `

    default:
      return ''
  }
}

function generateBookingEmail(data: EmailData, customization: EmailCustomization = {}) {
  // Merge theme with defaults
  const theme: EmailTheme = {
    ...defaultTheme,
    ...customization?.template?.theme
  }

  // Use custom blocks or defaults
  const blocks = customization?.template?.blocks?.length
    ? customization.template.blocks
    : defaultBlocks

  // Determine subject
  const subject = customization?.template?.subject || `Booking Confirmation - ${data.attractionName}`

  // Logo HTML
  const showLogo = customization?.branding?.showLogo !== false
  const logoHtml = showLogo && data.logoUrl ? `
    <div style="text-align: center; padding: 20px; background-color: ${theme.headerBgColor};">
      <img src="${data.logoUrl}" alt="${data.organizationName}" style="max-width: 150px; height: auto;" />
    </div>
  ` : ''

  // Greeting (always include)
  const greetingHtml = `
    <div style="padding: 20px 20px 0 20px;">
      <p style="color: ${theme.textColor}; font-size: 16px; line-height: 1.6; margin: 0;">
        Hi ${data.customerName},
      </p>
    </div>
  `

  // Render all blocks
  const blocksHtml = blocks.map(block => renderBlock(block, data, theme)).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body, table, td, div, p, a {
          font-family: ${theme.fontFamily};
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table { border-collapse: collapse !important; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${theme.backgroundColor};">
        ${logoHtml}
        ${greetingHtml}
        ${blocksHtml}
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

serve(async (req) => {
  console.log("=== SEND BOOKING EMAIL FUNCTION STARTED ===")

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { bookingId } = await req.json()

    if (!bookingId) {
      throw new Error('Booking ID is required')
    }

    console.log("Processing booking email for:", bookingId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('attraction_bookings')
      .select(`
        id,
        customer_email,
        customer_name,
        party_size,
        total_amount,
        booking_reference,
        attraction_id,
        booking_slot_id
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      throw new Error(`Failed to fetch booking: ${bookingError.message}`)
    }

    // Get attraction details
    const { data: attraction, error: attractionError } = await supabase
      .from('attractions')
      .select(`
        name,
        venue,
        logo_url,
        email_customization,
        organization_id
      `)
      .eq('id', booking.attraction_id)
      .single()

    if (attractionError) {
      throw new Error(`Failed to fetch attraction: ${attractionError.message}`)
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, logo_url, currency')
      .eq('id', attraction.organization_id)
      .single()

    if (orgError) {
      throw new Error(`Failed to fetch organization: ${orgError.message}`)
    }

    // Get booking slot details with resource
    const { data: slot, error: slotError } = await supabase
      .from('booking_slots')
      .select(`
        start_time,
        end_time,
        resource_id,
        attraction_resources (
          name
        )
      `)
      .eq('id', booking.booking_slot_id)
      .single()

    if (slotError) {
      throw new Error(`Failed to fetch booking slot: ${slotError.message}`)
    }

    // Prepare email data
    const emailData: EmailData = {
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      attractionName: attraction.name,
      startTime: slot.start_time,
      endTime: slot.end_time,
      venue: attraction.venue || 'TBD',
      resourceName: (slot as any).attraction_resources?.name,
      partySize: booking.party_size,
      totalAmount: booking.total_amount,
      bookingReference: booking.booking_reference,
      organizationName: organization.name,
      logoUrl: attraction.logo_url || organization.logo_url,
      currency: organization.currency || 'USD'
    }

    // Generate email with customization
    const emailCustomization = attraction.email_customization as EmailCustomization || {}
    const { subject, html } = generateBookingEmail(emailData, emailCustomization)

    console.log("Email generated with subject:", subject)

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured")
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email would be sent (RESEND_API_KEY not configured)',
          emailData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Generate calendar invite
    const icsContent = generateICSContent(emailData);
    const icsBase64 = btoa(icsContent);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TicketFlo <noreply@ticketflo.org>',
        to: [emailData.customerEmail],
        subject: subject,
        html: html,
        attachments: [
          {
            filename: `booking-${emailData.bookingReference}.ics`,
            content: icsBase64,
            content_type: 'text/calendar; method=PUBLISH'
          }
        ]
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log("Email sent successfully:", emailResult.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking confirmation email sent successfully',
        emailId: emailResult.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error sending booking email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
