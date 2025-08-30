import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import QRCode from "npm:qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickets, orderId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let ticketList: Array<{ id: string; code: string }>= tickets || [];

    if ((!ticketList || ticketList.length === 0) && orderId) {
      // fetch tickets for order
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_code, order_item_id")
        .in("order_item_id", (
          await supabase.from("order_items").select("id").eq("order_id", orderId)
        ).data?.map((r:any)=>r.id) || []);
      if (error) throw error;
      ticketList = (data || []).map((t:any)=>({ id: t.id, code: t.ticket_code }));
    }

    if (!ticketList || ticketList.length === 0) {
      return new Response(JSON.stringify({ urls: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Ensure bucket exists (ignore error if already exists)
    try {
      // @ts-ignore - admin only endpoint
      await supabase.storage.createBucket("ticket-qrs", { public: false });
    } catch (_e) { /* ignore */ }

    const urls: Record<string, string> = {};

    for (const t of ticketList) {
      // Data payload can be a short code; keep it simple and revocable via server
      const payload = t.code;
      const dataUrl = await QRCode.toDataURL(payload, { width: 140, margin: 1 });
      const base64 = dataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path = `${t.id}.png`;

      // Upload (overwrite allowed)
      await supabase.storage.from("ticket-qrs").upload(path, bytes, {
        contentType: "image/png",
        upsert: true,
      });

      // Create signed URL for 14 days
      const { data: signed } = await supabase.storage.from("ticket-qrs").createSignedUrl(path, 60 * 60 * 24 * 14);
      urls[t.id] = signed?.signedUrl || "";
    }

    return new Response(JSON.stringify({ urls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("generate-ticket-qr error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


