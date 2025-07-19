import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { invoiceData, organizationData, paymentUrl }: { 
      invoiceData: InvoiceData; 
      organizationData: OrganizationData;
      paymentUrl?: string;
    } = await req.json();

    console.log("Sending invoice email for:", invoiceData.invoiceNumber);

    // Generate PDF attachment from the detailed invoice HTML
    console.log("Generating PDF attachment...");
    const invoiceHtmlContent = generateInvoiceHTML(invoiceData, organizationData, paymentUrl);
    const pdfBuffer = await generatePDFFromHTML(invoiceHtmlContent);
    
    // Generate email-friendly HTML content with payment link
    const emailHtmlContent = generateEmailHTML(invoiceData, organizationData, paymentUrl);
    
    console.log("Sending email with PDF attachment...");
    const emailResponse = await resend.emails.send({
      from: `${organizationData.name} <invoices@resend.dev>`,
      to: [invoiceData.clientEmail],
      subject: `Invoice ${invoiceData.invoiceNumber} from ${organizationData.name}`,
      html: emailHtmlContent,
      text: `
Invoice ${invoiceData.invoiceNumber}

From: ${invoiceData.companyName}
To: ${invoiceData.clientName}
Date: ${invoiceData.invoiceDate}
Due Date: ${invoiceData.dueDate}

${invoiceData.eventName ? `Event: ${invoiceData.eventName}` : ''}

Total Amount Due: $${invoiceData.total.toFixed(2)}

${paymentUrl ? `

Pay online: ${paymentUrl}` : ''}

Please find the detailed invoice attached as a PDF.

Please contact us at ${invoiceData.companyEmail} if you have any questions.

Thank you for your business!
      `,
      attachments: [
        {
          filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
          content: Array.from(pdfBuffer),
          content_type: 'application/pdf',
        },
      ],
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
})