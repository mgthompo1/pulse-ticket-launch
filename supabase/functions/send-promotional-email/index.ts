import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailBlock {
  id: string;
  type: string;
  content?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  alignment?: string;
  size?: string;
}

interface EmailTemplate {
  blocks?: EmailBlock[];
  theme?: {
    headerColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    accentColor?: string;
    borderColor?: string;
    fontFamily?: string;
  };
}

interface PromotionalEmailRequest {
  to: string;
  recipientName?: string;
  subject: string;
  template: EmailTemplate;
  eventDetails: {
    name: string;
    venue?: string;
    event_date: string;
  };
  organizationDetails: {
    name: string;
    email?: string;
    logo_url?: string;
  };
}

// Render email template blocks to HTML
function renderBlocksToHtml(
  blocks: EmailBlock[],
  theme: EmailTemplate["theme"],
  eventDetails: PromotionalEmailRequest["eventDetails"],
  recipientName?: string
): string {
  const fontFamily = theme?.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const textColor = theme?.textColor || "#374151";
  const buttonColor = theme?.buttonColor || "#1f2937";

  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{Event Name\}/g, eventDetails.name)
      .replace(/\{Date\}/g, new Date(eventDetails.event_date).toLocaleDateString())
      .replace(/\{Venue\}/g, eventDetails.venue || "")
      .replace(/\{Name\}/g, recipientName || "there");
  };

  return blocks.map((block) => {
    switch (block.type) {
      case "heading":
        return `<h1 style="font-family: ${fontFamily}; font-size: 24px; font-weight: bold; color: ${textColor}; margin: 0 0 16px 0; text-align: ${block.alignment || 'left'};">${replaceVariables(block.content || "")}</h1>`;

      case "text":
        return `<p style="font-family: ${fontFamily}; font-size: 16px; line-height: 1.6; color: ${textColor}; margin: 0 0 16px 0; text-align: ${block.alignment || 'left'};">${replaceVariables(block.content || "")}</p>`;

      case "button":
        const buttonUrl = replaceVariables(block.buttonUrl || "#");
        return `<div style="text-align: ${block.alignment || 'center'}; margin: 24px 0;">
          <a href="${buttonUrl}" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff; font-family: ${fontFamily}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">${replaceVariables(block.buttonText || "Click Here")}</a>
        </div>`;

      case "image":
        if (!block.imageUrl) return "";
        const imgSize = block.size === "small" ? "200px" : block.size === "large" ? "100%" : "400px";
        return `<div style="text-align: ${block.alignment || 'center'}; margin: 16px 0;">
          <img src="${block.imageUrl}" alt="" style="max-width: ${imgSize}; height: auto; border-radius: 8px;" />
        </div>`;

      case "divider":
        return `<hr style="border: none; border-top: 1px solid ${theme?.borderColor || '#e5e7eb'}; margin: 24px 0;" />`;

      case "spacer":
        return `<div style="height: 24px;"></div>`;

      default:
        return "";
    }
  }).join("");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      recipientName,
      subject,
      template,
      eventDetails,
      organizationDetails,
    }: PromotionalEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !eventDetails || !organizationDetails) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get theme settings
    const theme = template?.theme || {};
    const backgroundColor = theme.backgroundColor || "#ffffff";
    const headerColor = theme.headerColor || "#1f2937";
    const fontFamily = theme.fontFamily || "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

    // Render blocks to HTML
    const blocksHtml = template?.blocks?.length
      ? renderBlocksToHtml(template.blocks, theme, eventDetails, recipientName)
      : `<p style="font-family: ${fontFamily}; color: #374151;">You're receiving this email from ${organizationDetails.name}.</p>`;

    // Build full HTML email
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: ${fontFamily}; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${backgroundColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${organizationDetails.logo_url ? `
              <div style="background: ${headerColor}; padding: 24px; text-align: center;">
                <img src="${organizationDetails.logo_url}" alt="${organizationDetails.name}" style="max-height: 60px; max-width: 200px;" />
              </div>
              ` : `
              <div style="background: ${headerColor}; padding: 24px; text-align: center;">
                <h2 style="margin: 0; color: #ffffff; font-family: ${fontFamily}; font-size: 20px;">${organizationDetails.name}</h2>
              </div>
              `}

              <div style="padding: 32px;">
                ${blocksHtml}
              </div>

              <div style="padding: 24px; border-top: 1px solid #e5e7eb; text-align: center; background-color: #f9fafb;">
                <p style="margin: 0 0 8px 0; font-family: ${fontFamily}; font-size: 14px; color: #6b7280;">
                  ${organizationDetails.name}
                </p>
                <p style="margin: 0; font-family: ${fontFamily}; font-size: 12px; color: #9ca3af;">
                  You're receiving this email because you're a customer of ${organizationDetails.name}.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate plain text version
    const plainText = template?.blocks
      ?.filter((b) => b.type === "text" || b.type === "heading")
      .map((b) => b.content || "")
      .join("\n\n") || `Email from ${organizationDetails.name}`;

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);

    // Always use ticketflo.org domain for FROM address (verified with Resend)
    const fromEmail = "noreply@ticketflo.org";
    const replyTo = organizationDetails.email || undefined;

    console.log(`Sending promotional email to ${to} from ${fromEmail}`);

    const emailResponse = await resend.emails.send({
      from: `${organizationDetails.name} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: fullHtml,
      text: plainText,
      reply_to: replyTo,
    });

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: emailResponse.error,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Promotional email sent successfully:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        resendId: emailResponse.data?.id,
        message: "Email sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    console.error("Error in send-promotional-email function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
