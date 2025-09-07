import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetaTagsResponse {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  keywords: string;
  structuredData?: object;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('dynamic-meta-tags invoked');
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const eventId = url.searchParams.get("eventId");
    const organizationId = url.searchParams.get("organizationId");
    console.log('params', { path, eventId, organizationId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let metaTags: MetaTagsResponse;

    // Route-specific meta tag generation
    if (path.startsWith("/events/") && eventId) {
      metaTags = await generateEventMetaTags(supabaseClient, eventId);
    } else if (path.startsWith("/org/") && organizationId) {
      metaTags = await generateOrganizationMetaTags(supabaseClient, organizationId);
    } else if (path.startsWith("/widget/") || path.startsWith("/ticket-widget")) {
      // Extract eventId from URL if not provided in params
      const urlEventId = eventId || path.split('/').pop();
      metaTags = await generateTicketWidgetMetaTags(supabaseClient, urlEventId);
    } else if (path.startsWith("/attraction/")) {
      // Extract attractionId from URL for attraction widgets
      const attractionId = path.split('/').pop();
      metaTags = await generateAttractionWidgetMetaTags(supabaseClient, attractionId);
    } else {
      // Default landing page meta tags
      metaTags = getDefaultMetaTags();
    }

    return new Response(JSON.stringify(metaTags), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Meta tags generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generateEventMetaTags(supabaseClient: any, eventId: string): Promise<MetaTagsResponse> {
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
    return getDefaultMetaTags();
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

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "description": event.description || `Join us for ${event.name}`,
    "startDate": event.event_date,
    "location": {
      "@type": "Place",
      "name": event.venue || "TBD"
    },
    "organizer": {
      "@type": "Organization",
      "name": event.organizations?.name || "Event Organizer"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://www.ticketflo.org/events/${eventId}`,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  return {
    title,
    description,
    ogTitle: event.name,
    ogDescription: description,
    ogImage: event.featured_image_url || event.organizations?.logo_url || "https://www.ticketflo.org/og-image.jpg",
    canonical: `https://www.ticketflo.org/events/${eventId}`,
    keywords: `${event.name}, event tickets, ${event.venue}, ${event.organizations?.name}, ticketflo`,
    structuredData
  };
}

async function generateOrganizationMetaTags(supabaseClient: any, organizationId: string): Promise<MetaTagsResponse> {
  const { data: org, error } = await supabaseClient
    .from("organizations")
    .select("id, name, email, website, logo_url")
    .eq("id", organizationId)
    .single();

  if (error || !org) {
    return getDefaultMetaTags();
  }

  const title = `${org.name} - Event Organizer | TicketFlo`;
  const description = `Discover and book tickets for events by ${org.name}. Professional event management and ticketing powered by TicketFlo.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": org.name,
    "email": org.email,
    "url": org.website || `https://www.ticketflo.org/org/${organizationId}`,
    "logo": org.logo_url
  };

  return {
    title,
    description,
    ogTitle: org.name,
    ogDescription: description,
    ogImage: org.logo_url || "https://www.ticketflo.org/og-image.jpg",
    canonical: `https://www.ticketflo.org/org/${organizationId}`,
    keywords: `${org.name}, event organizer, events, tickets, ticketflo`,
    structuredData
  };
}

async function generateTicketWidgetMetaTags(supabaseClient: any, eventId?: string): Promise<MetaTagsResponse> {
  if (!eventId) {
    return {
      title: "Event Tickets - TicketFlo Widget",
      description: "Purchase tickets for this event through our secure ticketing platform.",
      ogTitle: "Event Tickets",
      ogDescription: "Purchase tickets for this event through our secure ticketing platform.",
      ogImage: "https://www.ticketflo.org/og-image.jpg",
      canonical: "https://www.ticketflo.org/ticket-widget",
      keywords: "event tickets, secure ticketing, online tickets"
    };
  }

  // Reuse event meta tags for ticket widget but with widget-specific canonical URL
  const eventMetaTags = await generateEventMetaTags(supabaseClient, eventId);
  return {
    ...eventMetaTags,
    canonical: `https://www.ticketflo.org/widget/${eventId}`,
    title: `${eventMetaTags.ogTitle} - Get Tickets | TicketFlo`,
    description: `${eventMetaTags.description} Purchase tickets now through our secure platform.`
  };
}

async function generateAttractionWidgetMetaTags(supabaseClient: any, attractionId?: string): Promise<MetaTagsResponse> {
  if (!attractionId) {
    return {
      title: "Attraction Booking - TicketFlo Widget",
      description: "Book your attraction experience through our secure booking platform.",
      ogTitle: "Attraction Booking",
      ogDescription: "Book your attraction experience through our secure booking platform.",
      ogImage: "https://www.ticketflo.org/og-image.jpg",
      canonical: "https://www.ticketflo.org/attraction-widget",
      keywords: "attraction booking, secure booking, online booking"
    };
  }

  // Get attraction details
  const { data: attraction, error } = await supabaseClient
    .from("attractions")
    .select(`
      id,
      name,
      description,
      location,
      logo_url,
      organizations (
        name,
        logo_url
      )
    `)
    .eq("id", attractionId)
    .single();

  if (error || !attraction) {
    return getDefaultMetaTags();
  }

  const title = `${attraction.name} - Book Now | TicketFlo`;
  const description = attraction.description 
    ? `${attraction.description.substring(0, 150)}... Book your experience at ${attraction.location || 'this amazing attraction'}!`
    : `Book your experience at ${attraction.name} located at ${attraction.location || 'this amazing location'}. Secure booking through TicketFlo!`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": attraction.name,
    "description": attraction.description || `Experience ${attraction.name}`,
    "location": {
      "@type": "Place",
      "name": attraction.location || "TBD"
    },
    "provider": {
      "@type": "Organization",
      "name": attraction.organizations?.name || "Attraction Provider"
    }
  };

  return {
    title,
    description,
    ogTitle: attraction.name,
    ogDescription: description,
    ogImage: attraction.logo_url || attraction.organizations?.logo_url || "https://www.ticketflo.org/og-image.jpg",
    canonical: `https://www.ticketflo.org/attraction/${attractionId}`,
    keywords: `${attraction.name}, attraction booking, ${attraction.location}, ${attraction.organizations?.name}, ticketflo`,
    structuredData
  };
}

function getDefaultMetaTags(): MetaTagsResponse {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TicketFlo",
    "applicationCategory": "BusinessApplication",
    "description": "Professional event ticketing platform with seat selection, payment processing, and real-time analytics",
    "url": "https://www.ticketflo.org",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "operatingSystem": "Web Browser"
  };

  return {
    title: "TicketFlo - Professional Event Ticketing Platform",
    description: "Create, manage, and sell tickets for your events with TicketFlo. Features include seat selection, payment processing, real-time analytics, and more.",
    ogTitle: "TicketFlo - Professional Event Ticketing Platform",
    ogDescription: "Create stunning ticketing experiences, manage events effortlessly, and grow your audience with our all-in-one platform.",
    ogImage: "https://www.ticketflo.org/og-image.jpg",
    canonical: "https://www.ticketflo.org/",
    keywords: "TicketFlo, event ticketing, online ticketing platform, event management software, ticket sales, seat selection, event booking, professional ticketing",
    structuredData
  };
}
