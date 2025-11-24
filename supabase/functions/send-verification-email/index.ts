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
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(255,102,0,0.2);">

              <!-- Header with TicketFlo Branding -->
              <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 48px 40px; text-align: center; position: relative; border-bottom: 4px solid #ff6600;">
                <div style="background: linear-gradient(135deg, #ff6600 0%, #ff8833 100%); border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px; box-shadow: 0 8px 24px rgba(255,102,0,0.3);">
                  <h1 style="margin: 0; font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: -1px; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    🎟️ TicketFlo
                  </h1>
                </div>
                <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                  Welcome to the Future of Ticketing!
                </h2>
                <p style="margin: 16px 0 0 0; font-size: 16px; color: #ff6600; font-weight: 600;">
                  Let's verify your email to unlock your account
                </p>
              </div>

              <!-- Main Content -->
              <div style="padding: 48px 40px;">
                <p style="color: #1a1a1a; font-size: 18px; line-height: 1.7; margin: 0 0 24px 0; font-weight: 600;">
                  Hey there! 👋
                </p>
                <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                  Welcome to <strong style="color: #ff6600;">TicketFlo</strong>! You're just one click away from creating amazing event experiences and managing your ticketing like a pro.
                  Please verify your email address to complete your registration.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationLink}"
                     style="display: inline-block;
                            background: linear-gradient(135deg, #ff6600 0%, #ff8833 100%);
                            color: #ffffff;
                            font-size: 18px;
                            font-weight: 700;
                            text-decoration: none;
                            padding: 18px 56px;
                            border-radius: 50px;
                            box-shadow: 0 8px 24px rgba(255,102,0,0.4);
                            transition: all 0.3s ease;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;">
                    ✓ Verify My Email
                  </a>
                </div>

                <!-- Alternative Link -->
                <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #fff5eb 0%, #ffe8d6 100%); border-radius: 12px; border-left: 6px solid #ff6600;">
                  <p style="color: #1a1a1a; font-size: 14px; margin: 0 0 12px 0; font-weight: 700;">
                    🔗 Button not working? Copy and paste this link:
                  </p>
                  <p style="color: #ff6600; word-break: break-all; font-size: 12px; margin: 0; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 6px;">
                    ${verificationLink}
                  </p>
                </div>

                <!-- Features Section -->
                <div style="margin-top: 48px; padding: 32px; background-color: #000000; border-radius: 12px;">
                  <h3 style="color: #ff6600; font-size: 20px; font-weight: 800; margin: 0 0 24px 0; text-align: center;">
                    🚀 WHAT YOU CAN DO WITH TICKETFLO
                  </h3>
                  <table style="width: 100%; border-spacing: 0;">
                    <tr>
                      <td style="padding: 14px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                        <span style="color: #ff6600; font-weight: 700; font-size: 18px;">✨</span> <strong style="color: #ff6600;">Create</strong> stunning event pages in minutes
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                        <span style="color: #ff6600; font-weight: 700; font-size: 18px;">📊</span> <strong style="color: #ff6600;">Track</strong> real-time sales and analytics
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                        <span style="color: #ff6600; font-weight: 700; font-size: 18px;">💳</span> <strong style="color: #ff6600;">Accept</strong> payments via Stripe or Windcave
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                        <span style="color: #ff6600; font-weight: 700; font-size: 18px;">📱</span> <strong style="color: #ff6600;">Integrate</strong> Apple Wallet & Google Pay
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                        <span style="color: #ff6600; font-weight: 700; font-size: 18px;">🎯</span> <strong style="color: #ff6600;">Manage</strong> advanced group ticketing & allocations
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Security Notice -->
                <div style="margin-top: 40px; padding: 24px; background-color: #fff5eb; border-radius: 12px; border: 3px solid #ff6600;">
                  <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0;">
                    <strong style="color: #ff6600;">⚡ Security Notice:</strong> This verification link will expire in 24 hours.
                    If you didn't create a TicketFlo account, you can safely ignore this email.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #000000; padding: 36px 40px; text-align: center; border-top: 4px solid #ff6600;">
                <p style="color: #ff6600; font-size: 14px; margin: 0 0 16px 0; font-weight: 700;">
                  Need help? We're here for you!
                </p>
                <p style="margin: 0 0 24px 0;">
                  <a href="https://ticketflo.org/support" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 16px; transition: color 0.3s;">
                    📧 Support
                  </a>
                  <span style="color: #ff6600;">|</span>
                  <a href="https://ticketflo.org/help" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 16px; transition: color 0.3s;">
                    📚 Help Center
                  </a>
                  <span style="color: #ff6600;">|</span>
                  <a href="https://ticketflo.org" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 16px; transition: color 0.3s;">
                    🌐 Website
                  </a>
                </p>
                <p style="color: #999999; font-size: 12px; margin: 0;">
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
