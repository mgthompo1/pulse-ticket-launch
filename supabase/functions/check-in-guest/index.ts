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
    const { ticketCode, notes, staffId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the ticket by code
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("ticket_code", ticketCode)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already checked in (check both the flag and check_ins table)
    if (ticket.checked_in === true) {
      return new Response(
        JSON.stringify({
          error: "Guest already checked in",
          checkedInAt: ticket.used_at
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check check_ins table for consistency
    const { data: existingCheckin } = await supabase
      .from("check_ins")
      .select("*")
      .eq("ticket_id", ticket.id)
      .single();

    if (existingCheckin) {
      return new Response(
        JSON.stringify({
          error: "Guest already checked in",
          checkedInAt: existingCheckin.checked_in_at
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check ticket status - must be valid (not cancelled, refunded, etc.)
    if (ticket.status !== "valid" && ticket.status !== "used") {
      return new Response(
        JSON.stringify({ error: `Ticket status is '${ticket.status}' - cannot check in` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create check-in record
    const { data: checkin, error: checkinError } = await supabase
      .from("check_ins")
      .insert({
        ticket_id: ticket.id,
        checked_in_by: staffId,
        notes: notes || null,
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    // Update ticket status to used AND checked_in flag
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: 'used',
        checked_in: true,
        used_at: new Date().toISOString()
      })
      .eq("id", ticket.id);

    if (updateError) throw updateError;

    // Try to get guest details (optional - don't fail if view doesn't exist)
    const { data: guestInfo } = await supabase
      .from("guest_status_view")
      .select("*")
      .eq("ticket_id", ticket.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        checkin,
        guest: guestInfo || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Check-in Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});