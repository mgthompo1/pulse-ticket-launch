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
  partySize: number
  totalAmount: number
  bookingReference: string
  organizationName: string
  logoUrl?: string
}

const themePresets = {
  minimal: {
    backgroundColor: '#ffffff',
    headerColor: '#1f2937',
    textColor: '#374151',
    buttonColor: '#3b82f6',
    accentColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  professional: {
    backgroundColor: '#ffffff',
    headerColor: '#1e293b',
    textColor: '#475569',
    buttonColor: '#0f172a',
    accentColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  elegant: {
    backgroundColor: '#fefefe',
    headerColor: '#581c87',
    textColor: '#4c1d95',
    buttonColor: '#7c3aed',
    accentColor: '#f3e8ff',
    borderColor: '#c4b5fd',
    fontFamily: 'Georgia, "Times New Roman", serif'
  },
  corporate: {
    backgroundColor: '#ffffff',
    headerColor: '#1e40af',
    textColor: '#1e3a8a',
    buttonColor: '#2563eb',
    accentColor: '#eff6ff',
    borderColor: '#93c5fd',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
}

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
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

function generateBookingEmail(data: EmailData, customization: any = {}) {
  const theme = (themePresets as any)[customization?.template?.theme || 'minimal'] || themePresets.minimal
  const startDateTime = formatDateTime(data.startTime)
  const endDateTime = formatDateTime(data.endTime)
  
  const baseStyles = `
    body, table, td, div, p, a { 
      font-family: ${theme.fontFamily}; 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    table { border-collapse: collapse !important; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${theme.backgroundColor}; }
    .header { background-color: ${theme.headerColor}; color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .booking-details { background-color: ${theme.accentColor}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${theme.borderColor}; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid ${theme.borderColor}; }
    .detail-row:last-child { border-bottom: none; }
    .detail-icon { width: 20px; height: 20px; background-color: ${theme.buttonColor}; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px; }
    .button { background-color: ${theme.buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 20px 0; }
    .footer { background-color: ${theme.accentColor}; padding: 20px; text-align: center; color: ${theme.textColor}; font-size: 14px; border-top: 1px solid ${theme.borderColor}; }
  `

  // Logo rendering
  const logoHtml = (customization?.branding as any)?.showLogo && data.logoUrl ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.logoUrl}" alt="${data.organizationName}" style="max-width: 150px; height: auto;" />
    </div>
  ` : ''

  const subject = customization?.template?.subject || `Booking Confirmation - ${data.attractionName}`
  const headerText = customization?.template?.header_text || 'Booking Confirmed!'
  const bodyText = customization?.template?.body_text || 'Your booking has been confirmed. We look forward to welcoming you!'
  const footerText = customization?.template?.footer_text || 'Questions? Contact us anytime.'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>${baseStyles}</style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">${headerText}</h1>
        </div>
        
        <div class="content">
          <p style="color: ${theme.textColor}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="color: ${theme.textColor}; font-size: 16px; line-height: 1.6;">
            ${bodyText}
          </p>
          
          <div class="booking-details">
            <h3 style="margin: 0 0 15px 0; color: ${theme.headerColor}; font-size: 18px;">Booking Details</h3>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">🗓</span>
                <strong>Date & Time</strong>
              </span>
              <span style="color: ${theme.textColor};">${startDateTime.date}</span>
            </div>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">🕐</span>
                <strong>Time</strong>
              </span>
              <span style="color: ${theme.textColor};">${startDateTime.time} - ${endDateTime.time}</span>
            </div>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">📍</span>
                <strong>Location</strong>
              </span>
              <span style="color: ${theme.textColor};">${data.venue || 'TBD'}</span>
            </div>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">👥</span>
                <strong>Party Size</strong>
              </span>
              <span style="color: ${theme.textColor};">${data.partySize} ${data.partySize === 1 ? 'person' : 'people'}</span>
            </div>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">🎫</span>
                <strong>Booking Reference</strong>
              </span>
              <span style="color: ${theme.textColor}; font-weight: 600;">${data.bookingReference}</span>
            </div>
            
            <div class="detail-row">
              <span style="display: flex; align-items: center; color: ${theme.textColor};">
                <span class="detail-icon">💰</span>
                <strong>Total Amount</strong>
              </span>
              <span style="color: ${theme.textColor}; font-weight: 600; font-size: 18px;">${formatCurrency(data.totalAmount)}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="/booking/${data.bookingId}" class="button" style="color: white;">
              View Booking Details
            </a>
          </div>
          
          <p style="color: ${theme.textColor}; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            <strong>What to expect:</strong><br>
            Please arrive 10 minutes before your scheduled time. If you need to make any changes to your booking, please contact us as soon as possible.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">${footerText}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
            This booking was made through ${data.organizationName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

serve(async (req) => {
  console.log("=== SEND BOOKING EMAIL FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log("=== HANDLING OPTIONS REQUEST ===");
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("=== PROCESSING EMAIL REQUEST ===");
    const { bookingId } = await req.json()
    
    if (!bookingId) {
      throw new Error('Booking ID is required')
    }

    console.log("=== BOOKING ID RECEIVED ===", bookingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log("=== FETCHING BOOKING DETAILS ===");

    // Get booking details with simplified query
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
      console.error("=== BOOKING FETCH ERROR ===", bookingError);
      throw new Error(`Failed to fetch booking: ${bookingError.message}`)
    }

    console.log("=== BOOKING FETCHED ===", booking);

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
      console.error("=== ATTRACTION FETCH ERROR ===", attractionError);
      throw new Error(`Failed to fetch attraction: ${attractionError.message}`)
    }

    console.log("=== ATTRACTION FETCHED ===", attraction);

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', attraction.organization_id)
      .single()

    if (orgError) {
      console.error("=== ORGANIZATION FETCH ERROR ===", orgError);
      throw new Error(`Failed to fetch organization: ${orgError.message}`)
    }

    console.log("=== ORGANIZATION FETCHED ===", organization);

    // Get booking slot details
    const { data: slot, error: slotError } = await supabase
      .from('booking_slots')
      .select('start_time, end_time')
      .eq('id', booking.booking_slot_id)
      .single()

    if (slotError) {
      console.error("=== SLOT FETCH ERROR ===", slotError);
      throw new Error(`Failed to fetch booking slot: ${slotError.message}`)
    }

    console.log("=== SLOT FETCHED ===", slot);

    // Prepare email data
    const emailData: EmailData = {
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      attractionName: attraction.name,
      startTime: slot.start_time,
      endTime: slot.end_time,
      venue: attraction.venue || 'TBD',
      partySize: booking.party_size,
      totalAmount: booking.total_amount,
      bookingReference: booking.booking_reference,
      organizationName: organization.name,
      logoUrl: attraction.logo_url || organization.logo_url
    }

    console.log("=== EMAIL DATA PREPARED ===", emailData);

    // Generate email
    const emailCustomization = attraction.email_customization || {}
    const { subject, html } = generateBookingEmail(emailData, emailCustomization)

    console.log("=== EMAIL GENERATED ===", { subject });

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn("=== RESEND_API_KEY NOT CONFIGURED ===");
      // Return success without actually sending email for now
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Booking confirmation email would be sent (RESEND_API_KEY not configured)',
          emailData: emailData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log("=== SENDING EMAIL VIA RESEND ===");

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
        html: html
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error("=== RESEND API ERROR ===", errorText);
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log("=== EMAIL SENT SUCCESSFULLY ===", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Booking confirmation email sent successfully',
        emailId: emailResult.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== ERROR SENDING BOOKING EMAIL ===', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
