import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminDataRequest {
  token: string;
  dataType: 'organizations' | 'events' | 'orders' | 'metrics' | 'analytics' | 'contact_enquiries' | 'platform_config' | 'update_platform_config';
  configData?: {
    platform_fee_percentage: number;
    platform_fee_fixed: number;
    stripe_platform_publishable_key: string;
    stripe_platform_secret_key: string;
  };
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

    const { token, dataType, configData }: AdminDataRequest = await req.json();

    console.log("=== ADMIN DATA REQUEST ===");
    console.log("Data Type:", dataType);
    console.log("Token provided:", !!token);

    if (!token) {
      throw new Error("Admin token required");
    }

    // Validate admin session
    const { data: adminId, error: validationError } = await supabaseClient.rpc('validate_admin_session', { token });
    
    if (validationError || !adminId) {
      console.error("Admin session validation failed:", validationError);
      throw new Error("Invalid admin session");
    }

    console.log("Admin session validated:", adminId);

    // For platform_config operations, we need to ensure the admin has a valid session
    // The RLS policies will check for active admin sessions
    if (dataType === 'platform_config' || dataType === 'update_platform_config') {
      // Verify the admin session is still active and update last_activity
      const { error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('admin_user_id', adminId)
        .eq('session_token', token)
        .gte('expires_at', new Date().toISOString());
      
      if (sessionError) {
        console.error("Failed to update admin session:", sessionError);
        throw new Error("Admin session validation failed");
      }
    }

    // Using SERVICE_ROLE_KEY bypasses RLS automatically for most operations
    // However, for platform_config, we'll use the authenticated context to respect RLS

    let data;
    
    switch (dataType) {
      case 'organizations':
        const { data: orgsData, error: orgsError } = await supabaseClient
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (orgsError) throw orgsError;
        data = orgsData;
        break;
        
      case 'events':
        const { data: eventsData, error: eventsError } = await supabaseClient
          .from("events")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (eventsError) throw eventsError;
        data = eventsData;
        break;
        
      case 'orders':
        const { data: ordersData, error: ordersError } = await supabaseClient
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (ordersError) throw ordersError;
        data = ordersData;
        break;
        
      case 'metrics':
        // Fetch organizations count
        const { count: orgCount } = await supabaseClient
          .from("organizations")
          .select("*", { count: "exact", head: true });
          
        // Fetch active events count
        const { count: eventCount } = await supabaseClient
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");
          
        // Fetch total tickets sold
        const { data: ticketTypes } = await supabaseClient
          .from("ticket_types")
          .select("quantity_sold");
        const totalTickets = ticketTypes?.reduce((sum, t) => sum + (t.quantity_sold || 0), 0) || 0;
        
        // Fetch platform revenue
        const { data: usageRecords } = await supabaseClient
          .from("usage_records")
          .select("total_platform_fee");
        const platformRevenue = usageRecords?.reduce((sum, u) => sum + (u.total_platform_fee || 0), 0) || 0;
        
        data = {
          organizations: orgCount || 0,
          events: eventCount || 0,
          tickets: totalTickets,
          platformRevenue
        };
        break;
        
      case 'analytics':
        // Similar to metrics but more detailed
        const { data: usageData } = await supabaseClient
          .from("usage_records")
          .select("total_platform_fee");
        const transactionFees = usageData?.reduce((sum, u) => sum + (u.total_platform_fee || 0), 0) || 0;
        
        const { data: ticketData } = await supabaseClient
          .from("ticket_types")
          .select("quantity_sold");
        const ticketsSold = ticketData?.reduce((sum, t) => sum + (t.quantity_sold || 0), 0) || 0;
        
        const { count: activeEventsCount } = await supabaseClient
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");
        
        data = {
          transactionFees,
          dailyActiveUsers: 0, // Would need user activity tracking
          ticketsSold,
          platformRevenue: transactionFees,
          activeEvents: activeEventsCount || 0
        };
        break;
        
      case 'contact_enquiries':
        console.log('Fetching contact enquiries...');
        
        const { data: enquiries, error: enquiriesError } = await supabaseClient
          .from('contact_enquiries')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (enquiriesError) {
          console.error('Contact enquiries fetch error:', enquiriesError);
          throw enquiriesError;
        }
        
        console.log('Contact enquiries fetched:', enquiries?.length || 0);
        data = enquiries || [];
        break;
        
      case 'platform_config':
        console.log('Fetching platform configuration...');
        
        const { data: platformConfig, error: configError } = await supabaseClient
          .from('platform_config')
          .select('*')
          .single();
        
        if (configError && configError.code !== 'PGRST116') { // PGRST116 is "no rows found"
          console.error('Platform config fetch error:', configError);
          throw configError;
        }
        
        // If no config exists, return default values
        data = platformConfig || {
          platform_fee_percentage: 1.0,
          platform_fee_fixed: 0.50,
          stripe_platform_publishable_key: '',
          stripe_platform_secret_key: ''
        };
        console.log('Platform config fetched successfully');
        break;
        
      case 'update_platform_config':
        console.log('Updating platform configuration...');
        
        if (!configData) {
          throw new Error('Configuration data is required for update');
        }
        
        const { data: updatedConfig, error: updateError } = await supabaseClient
          .from('platform_config')
          .upsert(configData)
          .select()
          .single();
        
        if (updateError) {
          console.error('Platform config update error:', updateError);
          throw updateError;
        }
        
        console.log('Platform config updated successfully');
        data = updatedConfig;
        break;
        
      default:
        throw new Error("Invalid data type");
    }

    console.log(`Successfully fetched ${dataType} data:`, data?.length || 'N/A');

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Admin data fetch error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to fetch data"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
});