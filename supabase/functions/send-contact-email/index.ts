import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  enquiry_type: 'general' | 'support';
  organization_id?: string;
  organization_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Contact email function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const payload: ContactEmailRequest = await req.json();
    console.log('Received payload:', payload);

    const { name, email, phone, message, enquiry_type, organization_id, organization_name } = payload;

    // Store the enquiry in the database
    const { data: enquiry, error: dbError } = await supabase
      .from('contact_enquiries')
      .insert({
        name,
        email,
        phone,
        message,
        enquiry_type,
        organization_id: organization_id || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store enquiry: ${dbError.message}`);
    }

    console.log('Enquiry stored:', enquiry);

    // Determine email subject and content based on enquiry type
    const isSupport = enquiry_type === 'support';
    const subject = isSupport 
      ? `Support Ticket - ${organization_name || 'Organization'}` 
      : 'New Contact Enquiry - TicketFlo';

    const emailContent = `
      <h2>${isSupport ? 'New Support Ticket' : 'New Contact Enquiry'}</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      ${isSupport && organization_name ? `<p><strong>Organization:</strong> ${organization_name}</p>` : ''}
      <p><strong>Enquiry Type:</strong> ${isSupport ? 'Support Ticket' : 'General Enquiry'}</p>
      <p><strong>Message:</strong></p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p><small>Enquiry ID: ${enquiry.id}</small></p>
      <p><small>Submitted: ${new Date(enquiry.created_at).toLocaleString()}</small></p>
    `;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "TicketFlo Contact <onboarding@resend.dev>",
      to: ["mgthompo@gmail.com"],
      subject: subject,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send confirmation email to the user
    const confirmationResponse = await resend.emails.send({
      from: "TicketFlo <onboarding@resend.dev>",
      to: [email],
      subject: `Thank you for contacting TicketFlo - ${isSupport ? 'Support Ticket' : 'Enquiry'} Received`,
      html: `
        <h2>Thank you for contacting us, ${name}!</h2>
        <p>We have received your ${isSupport ? 'support ticket' : 'enquiry'} and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        ${isSupport ? '<p>Our support team will review your ticket and respond within 24 hours during business days.</p>' : '<p>We typically respond to general enquiries within 2-3 business days.</p>'}
        <p>Best regards,<br>The TicketFlo Team</p>
        <hr>
        <p><small>Reference: ${enquiry.id}</small></p>
      `,
    });

    console.log("Confirmation email sent:", confirmationResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      enquiry_id: enquiry.id,
      message: "Enquiry submitted successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to process enquiry",
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);