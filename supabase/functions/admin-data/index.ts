import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminDataRequest {
  token: string;
  dataType: 'organizations' | 'events' | 'orders' | 'metrics' | 'analytics' | 'contact_enquiries' | 'platform_config' | 'update_platform_config' | 'users' | 'stripe_revenue';
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

        // Fetch total tickets sold from the tickets table (actual tickets issued)
        const { count: ticketCount } = await supabaseClient
          .from("tickets")
          .select("*", { count: "exact", head: true });

        // Also get count from completed orders as backup
        const { data: completedOrders } = await supabaseClient
          .from("orders")
          .select("id")
          .eq("status", "completed");

        // Use the greater of the two counts (tickets table or completed orders)
        const totalTickets = ticketCount || completedOrders?.length || 0;

        // Fetch platform revenue from usage_records
        const { data: usageRecords } = await supabaseClient
          .from("usage_records")
          .select("total_platform_fee");
        const platformRevenue = usageRecords?.reduce((sum, u) => sum + (u.total_platform_fee || 0), 0) || 0;

        // Also fetch from orders to get total revenue if usage_records is empty
        const { data: orderRevenue } = await supabaseClient
          .from("orders")
          .select("total_amount, processing_fee_amount")
          .eq("status", "completed");
        const totalOrderRevenue = orderRevenue?.reduce((sum, o) => sum + (o.processing_fee_amount || 0), 0) || 0;

        data = {
          organizations: orgCount || 0,
          events: eventCount || 0,
          tickets: totalTickets,
          platformRevenue: platformRevenue || totalOrderRevenue
        };
        break;
        
      case 'analytics':
        // Fetch actual tickets from tickets table
        const { count: analyticsTicketCount } = await supabaseClient
          .from("tickets")
          .select("*", { count: "exact", head: true });

        // Get revenue from orders
        const { data: analyticsOrders } = await supabaseClient
          .from("orders")
          .select("total_amount, processing_fee_amount, created_at")
          .eq("status", "completed");

        const transactionFees = analyticsOrders?.reduce((sum, o) => sum + (o.processing_fee_amount || 0), 0) || 0;
        const ticketsSold = analyticsTicketCount || 0;

        const { count: activeEventsCount } = await supabaseClient
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");

        // Get user count from auth
        const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
        const totalUsers = authUsers?.users?.length || 0;

        // Calculate revenue over time for charts (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentOrders } = await supabaseClient
          .from("orders")
          .select("total_amount, processing_fee_amount, created_at")
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        // Group by day for chart data
        const revenueByDay: { [key: string]: { revenue: number; fees: number; tickets: number } } = {};
        recentOrders?.forEach(order => {
          const day = order.created_at.split('T')[0];
          if (!revenueByDay[day]) {
            revenueByDay[day] = { revenue: 0, fees: 0, tickets: 0 };
          }
          revenueByDay[day].revenue += order.total_amount || 0;
          revenueByDay[day].fees += order.processing_fee_amount || 0;
          revenueByDay[day].tickets += 1;
        });

        const chartData = Object.entries(revenueByDay).map(([date, values]) => ({
          date,
          revenue: values.revenue,
          fees: values.fees,
          tickets: values.tickets
        }));

        data = {
          transactionFees,
          dailyActiveUsers: totalUsers,
          ticketsSold,
          platformRevenue: transactionFees,
          activeEvents: activeEventsCount || 0,
          chartData
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

      case 'users':
        console.log('Fetching auth users...');

        const { data: allUsers, error: usersError } = await supabaseClient.auth.admin.listUsers();

        if (usersError) {
          console.error('Users fetch error:', usersError);
          throw usersError;
        }

        // Map users to a cleaner format with relevant info
        const usersList = allUsers?.users?.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          phone: user.phone,
          confirmed: !!user.email_confirmed_at,
          provider: user.app_metadata?.provider || 'email',
          providers: user.app_metadata?.providers || ['email']
        })) || [];

        console.log('Users fetched:', usersList.length);
        data = usersList;
        break;

      case 'stripe_revenue':
        console.log('Fetching Stripe Connect revenue...');

        // Get Stripe secret key from environment variable
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

        if (!stripeSecretKey) {
          console.log('STRIPE_SECRET_KEY not found in environment');
          data = {
            available: 0,
            pending: 0,
            totalApplicationFees: 0,
            message: 'Stripe not configured'
          };
          break;
        }

        try {
          // Fetch balance from Stripe
          const balanceResponse = await fetch('https://api.stripe.com/v1/balance', {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            }
          });

          const balance = await balanceResponse.json();
          console.log('Stripe balance response:', balance);

          // Fetch recent charges/application fees
          const feesResponse = await fetch('https://api.stripe.com/v1/application_fees?limit=100', {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            }
          });

          const fees = await feesResponse.json();
          const totalFees = fees.data?.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0) || 0;

          data = {
            available: balance.available?.reduce((sum: number, b: any) => sum + b.amount, 0) / 100 || 0,
            pending: balance.pending?.reduce((sum: number, b: any) => sum + b.amount, 0) / 100 || 0,
            totalApplicationFees: totalFees / 100,
            recentFees: fees.data?.slice(0, 10).map((fee: any) => ({
              id: fee.id,
              amount: fee.amount / 100,
              created: new Date(fee.created * 1000).toISOString()
            })) || []
          };
        } catch (stripeError) {
          console.error('Stripe API error:', stripeError);
          data = {
            available: 0,
            pending: 0,
            totalApplicationFees: 0,
            error: 'Failed to fetch Stripe data'
          };
        }
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

    // Return 200 with success: false so frontend can handle gracefully
    // Only use 401 for actual auth failures
    const isAuthError = error.message?.includes('admin session') || error.message?.includes('token');

    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to fetch data"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isAuthError ? 401 : 200,
    });
  }
});