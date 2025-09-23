import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, guestInfo, template, eventData, organizationData } = await req.json();

    console.log("🖨️ Print function received template:", template?.name);
    console.log("📋 Template blocks count:", template?.blocks?.length);
    console.log("👤 Guest info:", guestInfo?.customer_name);
    console.log("🎨 Template background:", template?.background?.color);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate lanyard preview data
    const previewData = {
      attendeeName: guestInfo.customer_name || "Attendee Name",
      eventTitle: eventData?.name || "Event Title",
      eventDate: eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : "Event Date",
      eventTime: eventData?.event_time || "Event Time",
      ticketType: guestInfo.ticket_type || "Ticket Type",
      ticketCode: guestInfo.ticket_code || "TICKET-001",
      organizationLogo: organizationData?.logo_url,
      eventLogo: eventData?.logo_url,
      specialAccess: ""
    };

    // Mark lanyard as printed in check-ins
    const { error: updateError } = await supabase
      .from("check_ins")
      .update({ lanyard_printed: true })
      .eq("ticket_id", ticketId);

    if (updateError) throw updateError;

    // Generate HTML that matches the preview exactly
    const generateBlockHTML = (block: any) => {
      const blockStyle = `
        position: absolute;
        left: ${block.position.x}%;
        top: ${block.position.y}%;
        width: ${block.size.width}%;
        height: ${block.size.height}%;
        font-size: ${(block.style.fontSize || 12)}px;
        font-weight: ${block.style.fontWeight || 'normal'};
        color: ${block.style.color || '#000000'};
        text-align: ${block.style.textAlign || 'center'};
        background-color: ${block.style.backgroundColor === 'transparent' ? 'transparent' : (block.style.backgroundColor || 'transparent')};
        border-radius: ${(block.style.borderRadius || 0)}px;
        padding: ${(block.style.padding || 4)}px;
        display: flex;
        align-items: center;
        justify-content: ${block.style.textAlign === 'left' ? 'flex-start' : block.style.textAlign === 'right' ? 'flex-end' : 'center'};
        overflow: visible;
        box-sizing: border-box;
        font-family: 'Inter', 'Manrope', sans-serif;
        line-height: 1.2;
        word-break: break-word;
      `;

      const getBlockContent = () => {
        switch (block.type) {
          case 'attendee_name':
            return previewData.attendeeName;
          case 'event_title':
            return block.customText || previewData.eventTitle;
          case 'event_date':
            return previewData.eventDate;
          case 'event_time':
            return previewData.eventTime;
          case 'ticket_type':
            const prefix = block.customPrefix || '';
            return `${prefix}${previewData.ticketType}`.trim();
          case 'organization_logo':
            if (previewData.organizationLogo) {
              return `<img src="${previewData.organizationLogo}" alt="Organization Logo" style="width: 100%; height: 100%; object-fit: contain;" />`;
            }
            return block.fallbackText || 'ORG LOGO';
          case 'event_logo':
            if (previewData.eventLogo) {
              return `<img src="${previewData.eventLogo}" alt="Event Logo" style="width: 100%; height: 100%; object-fit: contain;" />`;
            }
            return block.fallbackText || 'EVENT LOGO';
          case 'special_access':
            if (block.showOnlyForVIP && !previewData.ticketType.toLowerCase().includes('vip')) {
              return '';
            }
            return block.accessText || previewData.specialAccess || 'SPECIAL ACCESS';
          case 'custom_text':
            return block.text || '';
          case 'qr_code':
            const qrData = block.includeTicketCode ?
              `${previewData.ticketCode}|${previewData.attendeeName}|${previewData.eventTitle}` :
              previewData.ticketCode;
            // Generate QR code using QR Server API (reliable external service)
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&format=png&ecc=M&margin=10&qzone=0`;
            return `<img src="${qrApiUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />`;
          default:
            return 'Block';
        }
      };

      // Handle divider line
      if (block.type === 'divider_line') {
        return `<div style="
          position: absolute;
          left: ${block.position.x}%;
          top: ${block.position.y}%;
          width: ${block.size.width}%;
          height: ${(block.lineThickness || 1)}px;
          background-color: ${block.lineColor || '#e2e8f0'};
          border-radius: ${(block.style.borderRadius || 0)}px;
        "></div>`;
      }

      const content = getBlockContent();
      // Always render custom_text blocks even when empty (for background styling)
      if (!content && block.type !== 'custom_text') return '';

      return `<div style="${blockStyle}">
        ${typeof content === 'string' && !content.includes('<img') && !content.includes('<div')
          ? `<span style="font-size: inherit; font-weight: inherit; text-align: inherit; width: 100%;">${content}</span>`
          : content
        }
      </div>`;
    };

    // Generate the complete lanyard HTML - matching preview scaling
    const baseScale = 3;
    const width = (template?.dimensions?.width || 85) * baseScale;
    const height = (template?.dimensions?.height || 120) * baseScale;

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lanyard - ${previewData.attendeeName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
          body { margin: 0; padding: 20px; font-family: 'Inter', 'Manrope', sans-serif; }
          .lanyard-container { margin: 0 auto; position: relative; }
          @media print {
            body { padding: 0; }
            .lanyard-container { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="lanyard-container" style="
          position: relative;
          width: ${width}px;
          height: ${height}px;
          background-color: ${template?.background?.color || '#ffffff'};
          background-image: ${template?.background?.imageUrl ? `url(${template.background.imageUrl})` : 'none'};
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: visible;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          font-family: 'Inter', 'Manrope', sans-serif;
        ">
          <!-- Template blocks -->
          ${template?.blocks?.map(generateBlockHTML).join('') || ''}
        </div>
      </body>
      </html>
    `;

    console.log("📄 Generated HTML length:", printHTML.length);
    console.log("🔍 First 500 chars of HTML:", printHTML.substring(0, 500));

    return new Response(
      JSON.stringify({
        success: true,
        printHTML,
        message: "Lanyard ready for printing"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Print Lanyard Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});