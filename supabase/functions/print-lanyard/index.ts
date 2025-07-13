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
    const { ticketId, guestInfo } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate lanyard data (this would typically integrate with a printer API)
    const lanyardData = {
      guestName: guestInfo.customer_name,
      eventName: guestInfo.event_name,
      ticketType: guestInfo.ticket_type,
      ticketCode: guestInfo.ticket_code,
      checkInTime: new Date().toISOString(),
      qrCode: `https://your-app.com/verify/${guestInfo.ticket_code}`, // For verification
    };

    // Mark lanyard as printed in check-ins
    const { error: updateError } = await supabase
      .from("check_ins")
      .update({ lanyard_printed: true })
      .eq("ticket_id", ticketId);

    if (updateError) throw updateError;

    // In a real implementation, you would send this data to a thermal printer
    // For now, we return the print data that could be used by the frontend
    const printHTML = `
      <div style="width: 300px; padding: 20px; border: 2px solid #000; font-family: Arial;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">${lanyardData.eventName}</h2>
        </div>
        <div style="text-align: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 20px;">${lanyardData.guestName}</h3>
        </div>
        <div style="text-align: center; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 16px;">${lanyardData.ticketType}</p>
        </div>
        <div style="text-align: center; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 12px;">Ticket: ${lanyardData.ticketCode}</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 100px; height: 100px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            QR CODE
          </div>
        </div>
      </div>
    `;

    return new Response(
      JSON.stringify({ 
        success: true,
        lanyardData,
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