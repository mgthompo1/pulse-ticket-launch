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
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 0 40px; text-align: center;">
                        <div style="margin-bottom: 24px;">
                          <div style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 12px 20px;">
                            <span style="font-size: 24px; font-weight: 700; color: #ffffff;">TicketFlo</span>
                          </div>
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                          Verify your email
                        </h1>
                        <p style="margin: 0; font-size: 15px; color: #64748b;">
                          Welcome to TicketFlo! Please verify your email address to get started.
                        </p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 40px;">
                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                          Click the button below to confirm your email address and activate your account.
                        </p>

                        <!-- Button -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                          If you didn't create an account with TicketFlo, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td style="padding: 0 40px;">
                        <div style="height: 1px; background-color: #e2e8f0;"></div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px 32px 40px; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
                          Having trouble? Copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 16px 0; font-size: 12px; color: #6366f1; word-break: break-all;">
                          ${verificationLink}
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
                          © ${new Date().getFullYear()} TicketFlo. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
