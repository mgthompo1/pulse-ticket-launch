import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CRMEmailRequest {
  contactId: string;
  organizationId: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  orderId?: string;
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contactId,
      organizationId,
      subject,
      bodyHtml,
      bodyText,
      orderId,
      replyTo,
    }: CRMEmailRequest = await req.json();

    // Validate required fields
    if (!contactId || !organizationId || !subject || !bodyHtml) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get auth header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create client with user token to verify permissions
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify user has access to this organization
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_users")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not authorized to send emails for this organization" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("email, first_name, last_name, full_name")
      .eq("id", contactId)
      .eq("organization_id", organizationId)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("name, email, logo_url")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get sender user details
    const { data: senderUser, error: senderError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const senderName = senderUser?.full_name || organization.name;
    const senderEmail = organization.email || "noreply@resend.dev";

    // Create full HTML email with branding
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${organization.logo_url ? `
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${organization.logo_url}" alt="${organization.name}" style="max-height: 60px;">
            </div>
            ` : ''}

            <div style="margin-bottom: 30px;">
              ${bodyHtml}
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">
                Best regards,<br>
                <strong style="color: #1f2937;">${senderName}</strong>
              </p>
              <p style="margin: 10px 0 0 0;">
                ${organization.name}
              </p>
              ${organization.email ? `
              <p style="margin: 5px 0 0 0;">
                <a href="mailto:${organization.email}" style="color: #2563eb; text-decoration: none;">${organization.email}</a>
              </p>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate plain text version if not provided
    const plainText = bodyText || bodyHtml.replace(/<[^>]*>/g, "");

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [contact.email],
      subject: subject,
      html: fullHtml,
      text: plainText,
      ...(replyTo && { reply_to: replyTo }),
    });

    console.log("✅ CRM email sent successfully:", emailResponse);

    // Record email in database
    const { data: emailRecord, error: recordError } = await supabase
      .from("crm_emails")
      .insert({
        organization_id: organizationId,
        contact_id: contactId,
        order_id: orderId || null,
        subject: subject,
        body_html: bodyHtml,
        body_text: plainText,
        sender_email: senderEmail,
        sender_name: senderName,
        sent_by_user_id: user.id,
        recipient_email: contact.email,
        recipient_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        status: "sent",
        resend_email_id: emailResponse.data?.id || null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (recordError) {
      console.error("❌ Error recording email in database:", recordError);
      // Don't fail the request - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailRecord?.id,
        resendId: emailResponse.data?.id,
        message: "Email sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-crm-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
