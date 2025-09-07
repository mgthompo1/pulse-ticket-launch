import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Skip auth for debug function
  console.log("=== SSR DEBUG FUNCTION CALLED ===");

  try {
    console.log("=== SSR DEBUG CALLED ===");
    
    const url = new URL(req.url);
    const testUrl = url.searchParams.get("url") || "https://your-domain.com/widget/test";
    
    console.log("Testing URL:", testUrl);
    
    // Fetch the URL and check what we get back
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      }
    });
    
    const html = await response.text();
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("HTML length:", html.length);
    
    // Check for SSR indicators
    const hasSSRContent = html.includes('<!--ssr-outlet-->') || html.includes('data-reactroot');
    const hasMetaTags = html.includes('<meta property="og:title"');
    const hasDynamicContent = html.includes('dynamic-meta-tags') || html.includes('Event');
    
    const analysis = {
      url: testUrl,
      status: response.status,
      htmlLength: html.length,
      hasSSRContent,
      hasMetaTags,
      hasDynamicContent,
      contentPreview: html.substring(0, 500),
      metaTags: extractMetaTags(html)
    };
    
    console.log("Analysis:", analysis);
    
    return new Response(JSON.stringify(analysis, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("SSR Debug error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function extractMetaTags(html: string): any {
  const metaTags: any = {};
  
  // Extract common meta tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) metaTags.title = titleMatch[1];
  
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (descMatch) metaTags.description = descMatch[1];
  
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (ogTitleMatch) metaTags.ogTitle = ogTitleMatch[1];
  
  const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
  if (ogDescMatch) metaTags.ogDescription = ogDescMatch[1];
  
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) metaTags.ogImage = ogImageMatch[1];
  
  return metaTags;
}