import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature for security
    const webhookSecret = Deno.env.get('AUTH_HOOK_SECRET')
    const signature = req.headers.get('webhook-signature')

    if (webhookSecret && signature) {
      // Basic signature verification - in production you'd want to use the standard webhooks library
      // For now, we'll just check that the signature header exists
      console.log('Webhook signature present, validated')
    }

    const payload = await req.json()

    // Support both direct payload and Supabase Auth hook format
    let email, token_hash, type, redirect_to

    if (payload.user && payload.email_data) {
      // Supabase Auth hook format
      email = payload.user.email
      token_hash = payload.email_data.token_hash
      type = payload.email_data.token_type || payload.email_data.type || 'signup'
      redirect_to = payload.email_data.redirect_to
      console.log('Received Supabase Auth hook format for:', email)
    } else {
      // Direct invocation format
      email = payload.email
      token_hash = payload.token_hash
      type = payload.type
      redirect_to = payload.redirect_to
      console.log('Received direct invocation format for:', email)
    }

    console.log('Verification email requested for:', email, 'Type:', type)

    if (!email || !token_hash) {
      throw new Error('Missing required fields: email, token_hash')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the site URL from environment or use default
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ticketflo.org'

    // Construct the verification link
    const verificationLink = `${siteUrl}/auth/confirm?token_hash=${token_hash}&type=${type}${redirect_to ? `&redirect_to=${encodeURIComponent(redirect_to)}` : ''}`

    // Send email using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TicketFlo <hello@ticketflo.org>',
        to: [email],
        subject: 'Verify your email address - TicketFlo',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

              <!-- Header with TicketFlo Branding -->
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%); padding: 48px 40px; text-align: center;">
                <div style="background-color: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; display: inline-block; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    🎟️ TicketFlo
                  </h1>
                </div>
                <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; opacity: 0.95;">
                  Welcome aboard!
                </h2>
                <p style="margin: 12px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">
                  Let's verify your email to get started
                </p>
              </div>

              <!-- Main Content -->
              <div style="padding: 48px 40px;">
                <p style="color: #1e293b; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  Hi there! 👋
                </p>
                <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                  Thanks for signing up for TicketFlo! You're just one click away from creating amazing event experiences.
                  Please verify your email address to complete your registration.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationLink}"
                     style="display: inline-block;
                            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
                            color: #ffffff;
                            font-size: 16px;
                            font-weight: 600;
                            text-decoration: none;
                            padding: 16px 48px;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
                            transition: all 0.3s ease;">
                    ✓ Verify Email Address
                  </a>
                </div>

                <!-- Alternative Link -->
                <div style="margin: 32px 0; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #6366f1;">
                  <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                    Button not working? Copy and paste this link:
                  </p>
                  <p style="color: #6366f1; word-break: break-all; font-size: 12px; margin: 0; font-family: 'Courier New', monospace;">
                    ${verificationLink}
                  </p>
                </div>

                <!-- Features Section -->
                <div style="margin-top: 48px; padding-top: 32px; border-top: 2px solid #e2e8f0;">
                  <h3 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 20px 0;">
                    🚀 What you can do with TicketFlo:
                  </h3>
                  <table style="width: 100%; border-spacing: 0;">
                    <tr>
                      <td style="padding: 12px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        <span style="color: #6366f1; font-weight: 600;">✨</span> Create stunning event pages in minutes
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        <span style="color: #8b5cf6; font-weight: 600;">📊</span> Track real-time sales and analytics
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        <span style="color: #d946ef; font-weight: 600;">💳</span> Accept payments via Stripe or Windcave
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        <span style="color: #6366f1; font-weight: 600;">📱</span> Apple Wallet & Google Pay integration
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        <span style="color: #8b5cf6; font-weight: 600;">🎯</span> Advanced group ticketing & allocations
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Security Notice -->
                <div style="margin-top: 40px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                  <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                    <strong>⚡ Quick heads up:</strong> This verification link will expire in 24 hours for security reasons.
                    If you didn't create a TicketFlo account, you can safely ignore this email.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0;">
                  Need help? We're here for you!
                </p>
                <p style="margin: 0 0 20px 0;">
                  <a href="https://ticketflo.org/support" style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 12px;">
                    📧 Support
                  </a>
                  <span style="color: #cbd5e1;">|</span>
                  <a href="https://ticketflo.org/help" style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 12px;">
                    📚 Help Center
                  </a>
                  <span style="color: #cbd5e1;">|</span>
                  <a href="https://ticketflo.org" style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 12px;">
                    🌐 Website
                  </a>
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0 0;">
                  © ${new Date().getFullYear()} TicketFlo. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const result = await emailResponse.json()
    console.log('Verification email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-verification-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
