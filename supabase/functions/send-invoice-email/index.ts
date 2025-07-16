import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  companyPhone: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  notes: string;
}

interface OrganizationData {
  name: string;
  email: string;
  logo_url?: string;
}

const generateInvoiceHTML = (invoiceData: InvoiceData, organizationData: OrganizationData): string => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceData.invoiceNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        .company-info h1 {
          margin: 0;
          color: #1f2937;
          font-size: 28px;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details h2 {
          margin: 0;
          color: #6b7280;
          font-size: 24px;
        }
        .billing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .billing-info h3 {
          color: #1f2937;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .event-info {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .event-info h3 {
          color: #1f2937;
          margin-top: 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .items-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .items-table .amount {
          text-align: right;
        }
        .totals {
          margin-left: auto;
          width: 300px;
        }
        .totals table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals td {
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals .total-row {
          font-weight: bold;
          font-size: 18px;
          background: #f9fafb;
        }
        .payment-terms {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 30px 0;
        }
        .notes {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 40px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${invoiceData.companyName}</h1>
          <p>
            ${invoiceData.companyAddress}<br>
            ${invoiceData.companyCity}, ${invoiceData.companyPostalCode}<br>
            ${invoiceData.companyPhone}<br>
            ${invoiceData.companyEmail}
          </p>
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
          <p><strong>Date:</strong> ${formatDate(invoiceData.invoiceDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoiceData.dueDate)}</p>
        </div>
      </div>

      <div class="billing-section">
        <div class="billing-info">
          <h3>Bill To:</h3>
          <p>
            ${invoiceData.clientName}<br>
            ${invoiceData.clientAddress}<br>
            ${invoiceData.clientCity}, ${invoiceData.clientPostalCode}<br>
            ${invoiceData.clientPhone}<br>
            ${invoiceData.clientEmail}
          </p>
        </div>
        <div class="billing-info">
          <h3>Payment Status:</h3>
          <p><strong>Amount Due:</strong> ${formatCurrency(invoiceData.total)}</p>
          <p><strong>Terms:</strong> 30 Days</p>
        </div>
      </div>

      ${invoiceData.eventName ? `
      <div class="event-info">
        <h3>Event Information</h3>
        <p><strong>Event:</strong> ${invoiceData.eventName}</p>
        ${invoiceData.eventDate ? `<p><strong>Date:</strong> ${formatDate(invoiceData.eventDate)}</p>` : ''}
        ${invoiceData.eventVenue ? `<p><strong>Venue:</strong> ${invoiceData.eventVenue}</p>` : ''}
      </div>
      ` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td class="amount">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="amount">${formatCurrency(invoiceData.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax (${invoiceData.taxRate}%):</td>
            <td class="amount">${formatCurrency(invoiceData.taxAmount)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td class="amount">${formatCurrency(invoiceData.total)}</td>
          </tr>
        </table>
      </div>

      ${invoiceData.paymentTerms ? `
      <div class="payment-terms">
        <h4>Payment Terms</h4>
        <p>${invoiceData.paymentTerms}</p>
      </div>
      ` : ''}

      ${invoiceData.notes ? `
      <div class="notes">
        <h4>Notes</h4>
        <p>${invoiceData.notes}</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Questions about this invoice? Contact us at ${invoiceData.companyEmail}</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceData, organizationData }: { 
      invoiceData: InvoiceData; 
      organizationData: OrganizationData; 
    } = await req.json();

    console.log("Sending invoice email for:", invoiceData.invoiceNumber);

    const htmlContent = generateInvoiceHTML(invoiceData, organizationData);

    const emailResponse = await resend.emails.send({
      from: `${organizationData.name} <invoices@resend.dev>`,
      to: [invoiceData.clientEmail],
      subject: `Invoice ${invoiceData.invoiceNumber} from ${organizationData.name}`,
      html: htmlContent,
      text: `
Invoice ${invoiceData.invoiceNumber}

From: ${invoiceData.companyName}
To: ${invoiceData.clientName}
Date: ${invoiceData.invoiceDate}
Due Date: ${invoiceData.dueDate}

${invoiceData.eventName ? `Event: ${invoiceData.eventName}` : ''}

Total Amount Due: $${invoiceData.total.toFixed(2)}

Please contact us at ${invoiceData.companyEmail} if you have any questions.

Thank you for your business!
      `,
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
};

serve(handler);