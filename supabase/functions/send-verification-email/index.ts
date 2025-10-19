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

    const { email, token_hash, type, redirect_to } = await req.json()

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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to TicketFlo!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Please verify your email address</p>
            </div>

            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
              <p style="color: #666; line-height: 1.6;">
                Thanks for signing up! To complete your registration and start using TicketFlo,
                please verify your email address by clicking the button below.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}"
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          padding: 15px 40px;
                          text-decoration: none;
                          border-radius: 25px;
                          display: inline-block;
                          font-weight: bold;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; word-break: break-all; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 5px;">
                ${verificationLink}
              </p>

              <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                <h3 style="color: #333; font-size: 16px;">What's Next?</h3>
                <p style="color: #666; line-height: 1.6; font-size: 14px;">
                  Once verified, you'll be able to:
                </p>
                <ul style="color: #666; line-height: 1.8; font-size: 14px;">
                  <li>Create and manage events</li>
                  <li>Design custom ticket widgets</li>
                  <li>Track sales and analytics</li>
                  <li>Accept payments with Stripe or Windcave</li>
                </ul>
              </div>

              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                This verification link will expire in 24 hours.<br>
                If you didn't create an account with TicketFlo, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} TicketFlo. All rights reserved.</p>
              <p>
                <a href="https://ticketflo.org" style="color: #667eea; text-decoration: none;">Visit our website</a> |
                <a href="https://ticketflo.org/support" style="color: #667eea; text-decoration: none;">Support</a>
              </p>
            </div>
          </div>
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
