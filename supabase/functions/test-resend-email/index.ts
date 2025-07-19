import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log("Resend API Key available:", !!resendApiKey);

if (!resendApiKey) {
  console.error("RESEND_API_KEY environment variable is not set");
  console.error("Please set the RESEND_API_KEY environment variable in your Supabase project");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  subject?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== RESEND API TEST STARTED ===");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured. Please set it in your Supabase project environment variables.");
    }
    
    const { to, subject = "Resend API Test Email" }: TestEmailRequest = await req.json();
    
    console.log("Test email request:", { to, subject });

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Invalid email address format");
    }

    // Test email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resend API Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">✅ Resend API Test</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Email delivery verification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h2 style="color: #28a745; margin-top: 0;">✨ Success!</h2>
            <p>If you're reading this email, your Resend API integration is working perfectly.</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Test Details:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>Recipient:</strong> ${to}</li>
                <li><strong>API Status:</strong> ✅ Active</li>
                <li><strong>Delivery:</strong> ✅ Successful</li>
              </ul>
            </div>
            
            <p style="margin-bottom: 0;"><strong>Next steps:</strong> Your email system is ready for production use!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 8px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated test email from your Ticket2 platform.<br>
              Powered by Resend API
            </p>
          </div>
        </body>
      </html>
    `;

    console.log("Attempting to send test email...");

    // Try different sender options
    const senderOptions = [
      "Ticket2 Platform <onboarding@resend.dev>",
      "noreply@ticket2.com",
      "support@ticket2.com"
    ];

    let emailResponse;
    let lastError;

    for (const sender of senderOptions) {
      try {
        console.log(`Trying sender: ${sender}`);
        
        emailResponse = await resend.emails.send({
          from: sender,
          to: [to],
          subject: subject,
          html: htmlContent,
          text: `Resend API Test - Success!

If you're reading this email, your Resend API integration is working perfectly.

Test Details:
- Timestamp: ${new Date().toISOString()}
- Recipient: ${to}
- API Status: Active
- Delivery: Successful

Next steps: Your email system is ready for production use!

This is an automated test email from your Ticket2 platform.
Powered by Resend API`,
        });

        console.log("Email sent successfully with sender:", sender);
        break; // Success, exit the loop
        
      } catch (error) {
        console.error(`Failed with sender ${sender}:`, error);
        lastError = error;
        continue; // Try next sender
      }
    }

    if (!emailResponse || emailResponse.error) {
      throw new Error(`All sender options failed. Last error: ${lastError?.message || emailResponse?.error?.message}`);
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Test email sent successfully!",
      emailId: emailResponse.data?.id,
      recipient: to,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Test email failed:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      details: "Check the Supabase function logs for more details"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});