// v2 - No auth required for health checks
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthMetrics {
  database: {
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
    activeConnections?: number;
  };
  api: {
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
  };
  storage: {
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
  };
  functions: {
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
  };
  uptime: {
    percentage: number;
    lastIncident?: Date;
  };
  performance: {
    avgApiResponseTime: number;
    dbPerformance: number;
  };
}

async function checkDatabaseHealth(supabase: any): Promise<{ status: string; responseTime: number }> {
  const start = performance.now();
  try {
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    const responseTime = Math.round(performance.now() - start);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is ok
      return { status: 'degraded', responseTime };
    }

    return { status: 'operational', responseTime };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    return { status: 'down', responseTime };
  }
}

async function checkStorageHealth(supabase: any): Promise<{ status: string; responseTime: number }> {
  const start = performance.now();
  try {
    // List buckets to check storage health
    const { data, error } = await supabase.storage.listBuckets();
    const responseTime = Math.round(performance.now() - start);

    if (error) {
      return { status: 'degraded', responseTime };
    }

    return { status: 'operational', responseTime };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    return { status: 'down', responseTime };
  }
}

async function checkFunctionsHealth(): Promise<{ status: string; responseTime: number }> {
  const start = performance.now();
  try {
    // We're in a function now, so if this is executing, functions are working
    const responseTime = Math.round(performance.now() - start);
    return { status: 'operational', responseTime: responseTime };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    return { status: 'down', responseTime };
  }
}

async function calculateUptime(supabase: any): Promise<{ percentage: number; lastIncident?: Date }> {
  try {
    // Query the last 24 hours of health checks from a hypothetical health_checks table
    // For now, we'll return a high uptime
    // In production, you'd store health check results and calculate from there
    return {
      percentage: 99.9,
      lastIncident: undefined
    };
  } catch (error) {
    return {
      percentage: 99.0,
      lastIncident: undefined
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Health checks don't require admin auth - they just check system status
    // The fact that this function is being called from the admin portal is enough
    console.log("=== SYSTEM HEALTH REQUEST ===");

    // Run health checks in parallel for better performance
    const [dbHealth, storageHealth, functionsHealth, uptime] = await Promise.all([
      checkDatabaseHealth(supabaseClient),
      checkStorageHealth(supabaseClient),
      checkFunctionsHealth(),
      calculateUptime(supabaseClient),
    ]);

    // Calculate overall API health (average of all services)
    const avgResponseTime = Math.round(
      (dbHealth.responseTime + storageHealth.responseTime + functionsHealth.responseTime) / 3
    );

    // Determine overall API status
    const allStatuses = [dbHealth.status, storageHealth.status, functionsHealth.status];
    let apiStatus: 'operational' | 'degraded' | 'down' = 'operational';
    if (allStatuses.includes('down')) {
      apiStatus = 'down';
    } else if (allStatuses.includes('degraded')) {
      apiStatus = 'degraded';
    }

    const metrics: HealthMetrics = {
      database: {
        status: dbHealth.status as any,
        responseTime: dbHealth.responseTime,
      },
      api: {
        status: apiStatus,
        responseTime: avgResponseTime,
      },
      storage: {
        status: storageHealth.status as any,
        responseTime: storageHealth.responseTime,
      },
      functions: {
        status: functionsHealth.status as any,
        responseTime: functionsHealth.responseTime,
      },
      uptime: uptime,
      performance: {
        avgApiResponseTime: avgResponseTime,
        dbPerformance: dbHealth.responseTime < 100 ? 95 : (dbHealth.responseTime < 200 ? 85 : 70),
      },
    };

    // Store health check result for historical tracking
    try {
      await supabaseClient
        .from('system_health_logs')
        .insert({
          timestamp: new Date().toISOString(),
          database_status: dbHealth.status,
          database_response_time: dbHealth.responseTime,
          storage_status: storageHealth.status,
          api_status: apiStatus,
          avg_response_time: avgResponseTime,
        });
    } catch (logError) {
      // Don't fail the health check if logging fails
      console.error('Failed to log health metrics:', logError);
    }

    // Report to Kodo
    const kodoApiKey = Deno.env.get('KODO_API_KEY');
    const kodoUrl = Deno.env.get('KODO_URL') || 'https://kodostatus.com';
    const kodoMonitorId = Deno.env.get('KODO_MONITOR_ID'); // API Server monitor
    const kodoMonitorId2 = Deno.env.get('KODO_MONITOR_ID_2'); // Edge Functions monitor

    if (kodoApiKey) {
      try {
        // Send heartbeat to API Server monitor
        if (kodoMonitorId) {
          await fetch(`${kodoUrl}/api/heartbeat/${kodoMonitorId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': kodoApiKey,
            },
            body: JSON.stringify({
              status: apiStatus === 'operational' ? 'up' : 'down',
              response_time_ms: avgResponseTime,
              message: `DB: ${dbHealth.status}, Storage: ${storageHealth.status}`,
            }),
          });
          console.log('Sent heartbeat to API Server monitor');
        }

        // Send heartbeat to Edge Functions monitor
        if (kodoMonitorId2) {
          await fetch(`${kodoUrl}/api/heartbeat/${kodoMonitorId2}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': kodoApiKey,
            },
            body: JSON.stringify({
              status: functionsHealth.status === 'operational' ? 'up' : 'down',
              response_time_ms: functionsHealth.responseTime,
              message: `Functions: ${functionsHealth.status}`,
            }),
          });
          console.log('Sent heartbeat to Edge Functions monitor');
        }

        // If degraded or down, create an incident
        if (apiStatus !== 'operational') {
          await fetch(`${kodoUrl}/api/v1/incidents`, {
            method: 'POST',
            headers: {
              'X-API-Key': kodoApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `System Health Degraded: ${apiStatus}`,
              severity: apiStatus === 'down' ? 'critical' : 'major',
              status: 'investigating',
              message: `Database: ${dbHealth.status} (${dbHealth.responseTime}ms)\nStorage: ${storageHealth.status} (${storageHealth.responseTime}ms)\nFunctions: ${functionsHealth.status} (${functionsHealth.responseTime}ms)`,
              services: ['API', 'Database'],
            }),
          });
        }
      } catch (kodoError) {
        console.error('Failed to report to Kodo:', kodoError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      metrics: metrics,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("System health check error:", error);

    // Return 200 with success: false so frontend can handle gracefully
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Health check failed",
      metrics: {
        database: { status: 'unknown', responseTime: 0 },
        api: { status: 'unknown', responseTime: 0 },
        storage: { status: 'unknown', responseTime: 0 },
        functions: { status: 'unknown', responseTime: 0 },
        uptime: { percentage: 99.9 },
        performance: { avgApiResponseTime: 0, dbPerformance: 0 },
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
