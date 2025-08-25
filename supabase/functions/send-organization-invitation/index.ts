import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const resend = new Resend(resendApiKey);

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set the auth context for RLS
    const jwt = authHeader.replace('Bearer ', '');
    supabase.auth.session = {
      access_token: jwt,
      refresh_token: '',
      expires_in: 3600,
      token_type: 'bearer',
      user: null
    } as any;

    const { email, role, permissions, organizationId }: InvitationRequest = await req.json();

    console.log('Sending organization invitation:', { email, role, permissions, organizationId });

    // Verify the user owns the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, user_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      throw new Error('Organization not found or access denied');
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        permissions,
        invited_by: organization.user_id,
        invitation_token: invitationToken
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      throw new Error('Failed to create invitation');
    }

    // Create invitation link
    const inviteUrl = `${req.headers.get('origin') || 'https://your-app.com'}/auth?invite=${invitationToken}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: 'TicketFlo <noreply@ticketflo.co>',
      to: [email],
      subject: `Invitation to join ${organization.name} on TicketFlo`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0;">You're invited to join ${organization.name}</h1>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; color: #374151;">
              You've been invited to join <strong>${organization.name}</strong> on TicketFlo as a <strong>${role}</strong>.
            </p>
            
            <p style="margin: 0 0 16px 0; color: #6b7280;">
              Click the button below to accept the invitation and get started.
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${inviteUrl}" 
                 style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Accept Invitation
              </a>
            </div>
          </div>
          
          <div style="background: #fef3f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>Security Notice:</strong> This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #ea580c; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <p style="margin: 16px 0 0 0;">
              Best regards,<br>
              The TicketFlo Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('Invitation email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationId: invitation.id,
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-organization-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);