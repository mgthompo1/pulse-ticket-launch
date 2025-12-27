import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KODO_URL = "https://kodostatus.com";
const KODO_API_KEY = Deno.env.get("KODO_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!KODO_API_KEY) {
      throw new Error("KODO_API_KEY not configured");
    }

    let endpoint = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "fetchServices":
        endpoint = "/api/v1/services";
        break;

      case "fetchIncidents":
        endpoint = params.activeOnly
          ? "/api/v1/incidents?active=true"
          : "/api/v1/incidents";
        break;

      case "createIncident":
        endpoint = "/api/v1/incidents";
        method = "POST";
        body = JSON.stringify({
          title: params.title,
          severity: params.severity,
          status: params.status,
          message: params.message,
          services: params.services,
        });
        break;

      case "updateIncident":
        endpoint = `/api/v1/incidents/${params.id}`;
        method = "PATCH";
        body = JSON.stringify({
          status: params.status,
          message: params.message,
        });
        break;

      case "updateServiceStatus":
        endpoint = `/api/v1/services/${params.serviceId}`;
        method = "PATCH";
        body = JSON.stringify({ status: params.status });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(`${KODO_URL}${endpoint}`, {
      method,
      headers: {
        "X-API-Key": KODO_API_KEY,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kodo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Kodo proxy error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
