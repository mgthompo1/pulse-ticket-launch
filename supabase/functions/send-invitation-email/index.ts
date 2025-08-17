import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, signUpLink, invitedBy } = await req.json()

    if (!email || !signUpLink || !invitedBy) {
      throw new Error('Missing required fields: email, signUpLink, invitedBy')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const emailResponse = await resend.emails.send({
      from: 'Ticket2 <onboarding@resend.dev>',
      to: [email],
      subject: 'You\'ve been invited to join Ticket2',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Ticket2!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join our platform</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
            <p style="color: #666; line-height: 1.6;">
              Hello! You've been invited by <strong>${invitedBy}</strong> to join Ticket2, 
              our comprehensive event ticketing platform.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Ticket2 helps organizations create, manage, and sell tickets for events with 
              powerful features like custom branding, analytics, and seamless payment processing.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signUpLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Accept Invitation & Sign Up
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              This invitation link will expire in 7 days.<br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 Ticket2. All rights reserved.</p>
          </div>
        </div>
      `
    });

    if (emailResponse.error) {
      throw new Error(`Email failed: ${emailResponse.error.message}`);
    }

    console.log("Invitation email sent successfully:", emailResponse);

    // Update invitation status to sent
    const { error: updateError } = await supabaseClient
      .from('admin_invitations')
      .update({ status: 'sent' })
      .eq('email', email)
      .eq('token', signUpLink.split('invite=')[1].split('&')[0])

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending invitation email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 