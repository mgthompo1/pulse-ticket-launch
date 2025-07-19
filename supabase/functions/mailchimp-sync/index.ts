import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { apiKey, listId, eventId } = await req.json();

    if (!apiKey || !listId || !eventId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Fetch attendees from Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: attendees, error } = await supabase
      .from("attendees")
      .select("email, first_name, last_name")
      .eq("event_id", eventId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Prepare Mailchimp API call
    const datacenter = apiKey.split("-")[1];
    const url = `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`;

    // Add each attendee as a subscriber
    for (const attendee of attendees) {
      const body = {
        email_address: attendee.email,
        status: "subscribed",
        merge_fields: {
          FNAME: attendee.first_name || "",
          LNAME: attendee.last_name || ""
        }
      };
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `apikey ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}); 