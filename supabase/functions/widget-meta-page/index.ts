import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  // Allow public access for meta page generation
  console.log('=== WIDGET META PAGE FUNCTION CALLED ===');

  try {
    const url = new URL(req.url);
    const eventId = url.pathname.split('/').pop();
    
    console.log('Event ID:', eventId);
    
    if (!eventId) {
      return new Response('Event ID required', { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get event details
    const { data: event, error } = await supabaseClient
      .from("events")
      .select(`
        id,
        name,
        description,
        venue,
        event_date,
        featured_image_url,
        organizations (
          name,
          logo_url
        )
      `)
      .eq("id", eventId)
      .single();

    if (error || !event) {
      console.error('Event not found:', eventId, error);
      return new Response('Event not found', { status: 404 });
    }

    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const title = `${event.name} - Get Tickets | TicketFlo`;
    const description = event.description 
      ? `${event.description.substring(0, 150)}... Join us ${eventDate} at ${event.venue || 'TBD'}. Get your tickets now!`
      : `Join us for ${event.name} on ${eventDate} at ${event.venue || 'TBD'}. Get your tickets now on TicketFlo!`;

    const ogImage = event.featured_image_url || event.organizations?.logo_url || "https://www.ticketflo.org/og-image.jpg";
    const canonical = `https://www.ticketflo.org/widget/${eventId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta property="og:title" content="${escapeAttr(event.name)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:image" content="${escapeAttr(ogImage)}" />
    <meta property="og:site_name" content="TicketFlo" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(event.name)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${escapeAttr(ogImage)}" />
    
    <!-- Auto redirect for human users -->
    <script>
      // Only redirect if this is a real user (not a crawler)
      if (typeof window !== 'undefined' && !navigator.userAgent.includes('bot') && !navigator.userAgent.includes('crawler')) {
        window.location.href = '${canonical}';
      }
    </script>
    
    <!-- Fallback redirect for users with JS disabled -->
    <noscript>
        <meta http-equiv="refresh" content="0; url=${canonical}">
    </noscript>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <h1>${escapeHtml(event.name)}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="${escapeAttr(canonical)}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Tickets Now</a></p>
        <p><small>If you're not redirected automatically, <a href="${escapeAttr(canonical)}">click here</a>.</small></p>
    </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300"
      },
      status: 200,
    });

  } catch (error) {
    console.error("Widget meta page error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}