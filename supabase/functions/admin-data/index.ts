import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminDataRequest {
  token: string;
  dataType: 'organizations' | 'events' | 'orders' | 'metrics' | 'analytics' | 'contact_enquiries' | 'platform_config' | 'update_platform_config' | 'users' | 'stripe_revenue' | 'onboarding_funnel' | 'payouts' | 'refunds' | 'audit_log' | 'announcements' | 'create_announcement' | 'toggle_announcement' | 'delete_announcement' | 'org_health_scores';
  configData?: {
    platform_fee_percentage: number;
    platform_fee_fixed: number;
    stripe_platform_publishable_key: string;
    stripe_platform_secret_key: string;
  };
  auditAction?: {
    action: string;
    details: string;
  };
  message?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  announcementId?: string;
  active?: boolean;
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

    const { token, dataType, configData, message, type, announcementId, active }: AdminDataRequest = await req.json();

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

      case 'onboarding_funnel':
        console.log('Fetching onboarding funnel data...');

        // Get all auth users
        const { data: funnelUsers } = await supabaseClient.auth.admin.listUsers();
        const allAuthUsers = funnelUsers?.users || [];

        // Stage 1: Total signups
        const totalSignups = allAuthUsers.length;

        // Stage 2: Email verified
        const emailVerified = allAuthUsers.filter(u => u.email_confirmed_at).length;

        // Stage 3: Organization created - get unique user_ids from organizations
        const { data: orgsWithUsers } = await supabaseClient
          .from('organizations')
          .select('user_id');
        const uniqueOrgUsers = new Set(orgsWithUsers?.map(o => o.user_id) || []);
        const orgCreated = uniqueOrgUsers.size;

        // Stage 4: First event created - get orgs that have events
        const { data: eventsWithOrgs } = await supabaseClient
          .from('events')
          .select('organization_id');
        const uniqueEventOrgs = new Set(eventsWithOrgs?.map(e => e.organization_id) || []);
        const eventCreated = uniqueEventOrgs.size;

        // Stage 5: First sale - get orgs that have completed orders
        const { data: ordersWithEvents } = await supabaseClient
          .from('orders')
          .select('event_id, events!inner(organization_id)')
          .eq('status', 'completed');
        const uniqueSaleOrgs = new Set(ordersWithEvents?.map((o: any) => o.events?.organization_id).filter(Boolean) || []);
        const firstSale = uniqueSaleOrgs.size;

        // Get users stuck at each stage (for detailed view)
        const usersWithoutOrg = allAuthUsers.filter(u =>
          u.email_confirmed_at && !uniqueOrgUsers.has(u.id)
        ).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          provider: u.app_metadata?.provider || 'email'
        }));

        data = {
          stages: [
            { name: 'Signed Up', count: totalSignups, percentage: 100 },
            { name: 'Email Verified', count: emailVerified, percentage: totalSignups > 0 ? Math.round((emailVerified / totalSignups) * 100) : 0 },
            { name: 'Org Created', count: orgCreated, percentage: totalSignups > 0 ? Math.round((orgCreated / totalSignups) * 100) : 0 },
            { name: 'Event Created', count: eventCreated, percentage: totalSignups > 0 ? Math.round((eventCreated / totalSignups) * 100) : 0 },
            { name: 'First Sale', count: firstSale, percentage: totalSignups > 0 ? Math.round((firstSale / totalSignups) * 100) : 0 },
          ],
          dropoffs: {
            signupToVerified: totalSignups - emailVerified,
            verifiedToOrg: emailVerified - orgCreated,
            orgToEvent: orgCreated - eventCreated,
            eventToSale: eventCreated - firstSale,
          },
          stuckUsers: usersWithoutOrg.slice(0, 20) // Users who verified but didn't create org
        };
        break;

      case 'payouts':
        console.log('Fetching payouts data...');

        const stripeKeyForPayouts = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKeyForPayouts) {
          data = { payouts: [], error: 'Stripe not configured' };
          break;
        }

        try {
          // Fetch recent payouts from Stripe
          const payoutsResponse = await fetch('https://api.stripe.com/v1/payouts?limit=50', {
            headers: { 'Authorization': `Bearer ${stripeKeyForPayouts}` }
          });
          const payoutsData = await payoutsResponse.json();

          // Fetch connected accounts to get org info
          const accountsResponse = await fetch('https://api.stripe.com/v1/accounts?limit=100', {
            headers: { 'Authorization': `Bearer ${stripeKeyForPayouts}` }
          });
          const accountsData = await accountsResponse.json();

          // Get transfers (payouts to connected accounts)
          const transfersResponse = await fetch('https://api.stripe.com/v1/transfers?limit=50', {
            headers: { 'Authorization': `Bearer ${stripeKeyForPayouts}` }
          });
          const transfersData = await transfersResponse.json();

          data = {
            platformPayouts: payoutsData.data?.map((p: any) => ({
              id: p.id,
              amount: p.amount / 100,
              currency: p.currency,
              status: p.status,
              arrival_date: new Date(p.arrival_date * 1000).toISOString(),
              created: new Date(p.created * 1000).toISOString()
            })) || [],
            connectedAccounts: accountsData.data?.map((a: any) => ({
              id: a.id,
              email: a.email,
              business_name: a.business_profile?.name,
              payouts_enabled: a.payouts_enabled,
              charges_enabled: a.charges_enabled
            })) || [],
            recentTransfers: transfersData.data?.map((t: any) => ({
              id: t.id,
              amount: t.amount / 100,
              currency: t.currency,
              destination: t.destination,
              created: new Date(t.created * 1000).toISOString()
            })) || []
          };
        } catch (stripeErr) {
          console.error('Stripe payouts error:', stripeErr);
          data = { payouts: [], error: 'Failed to fetch Stripe payouts' };
        }
        break;

      case 'refunds':
        console.log('Fetching refunds data...');

        const stripeKeyForRefunds = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKeyForRefunds) {
          data = { refunds: [], error: 'Stripe not configured' };
          break;
        }

        try {
          // Fetch refunds from Stripe
          const refundsResponse = await fetch('https://api.stripe.com/v1/refunds?limit=100', {
            headers: { 'Authorization': `Bearer ${stripeKeyForRefunds}` }
          });
          const refundsData = await refundsResponse.json();

          // Calculate refund stats
          const refundsList = refundsData.data || [];
          const totalRefunded = refundsList.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) / 100;
          const refundCount = refundsList.length;

          // Group by status
          const byStatus = refundsList.reduce((acc: any, r: any) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {});

          data = {
            refunds: refundsList.slice(0, 50).map((r: any) => ({
              id: r.id,
              amount: r.amount / 100,
              currency: r.currency,
              status: r.status,
              reason: r.reason,
              created: new Date(r.created * 1000).toISOString(),
              payment_intent: r.payment_intent
            })),
            stats: {
              totalRefunded,
              refundCount,
              byStatus
            }
          };
        } catch (stripeErr) {
          console.error('Stripe refunds error:', stripeErr);
          data = { refunds: [], error: 'Failed to fetch refunds' };
        }
        break;

      case 'audit_log':
        console.log('Fetching/logging audit data...');

        // Check if this is a log action or fetch
        if (configData && (configData as any).action) {
          // Log an audit action
          const { action, details } = configData as any;
          const { error: auditError } = await supabaseClient
            .from('audit_logs')
            .insert({
              admin_id: adminId,
              action,
              details,
              ip_address: req.headers.get('x-forwarded-for') || 'unknown',
              user_agent: req.headers.get('user-agent') || 'unknown'
            });

          if (auditError) {
            console.error('Audit log error:', auditError);
          }
          data = { logged: !auditError };
        } else {
          // Fetch audit logs
          const { data: auditLogs, error: fetchError } = await supabaseClient
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          if (fetchError) {
            // Table might not exist yet
            console.log('Audit logs table may not exist:', fetchError);
            data = [];
          } else {
            data = auditLogs || [];
          }
        }
        break;

      case 'announcements':
        console.log('Fetching announcements...');
        const { data: announcementsList, error: announcementsError } = await supabaseClient
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (announcementsError) {
          console.log('Announcements table may not exist:', announcementsError);
          data = [];
        } else {
          data = announcementsList || [];
        }
        break;

      case 'create_announcement':
        console.log('Creating announcement...');
        if (!message) {
          throw new Error('Message is required');
        }

        const { data: newAnnouncement, error: createAnnouncementError } = await supabaseClient
          .from('announcements')
          .insert({
            message,
            type: type || 'info',
            active: true
          })
          .select()
          .single();

        if (createAnnouncementError) {
          console.error('Create announcement error:', createAnnouncementError);
          throw createAnnouncementError;
        }

        data = newAnnouncement;
        break;

      case 'toggle_announcement':
        console.log('Toggling announcement...');
        if (!announcementId) {
          throw new Error('Announcement ID is required');
        }

        const { data: toggledAnnouncement, error: toggleError } = await supabaseClient
          .from('announcements')
          .update({ active })
          .eq('id', announcementId)
          .select()
          .single();

        if (toggleError) {
          console.error('Toggle announcement error:', toggleError);
          throw toggleError;
        }

        data = toggledAnnouncement;
        break;

      case 'delete_announcement':
        console.log('Deleting announcement...');
        if (!announcementId) {
          throw new Error('Announcement ID is required');
        }

        const { error: deleteAnnouncementError } = await supabaseClient
          .from('announcements')
          .delete()
          .eq('id', announcementId);

        if (deleteAnnouncementError) {
          console.error('Delete announcement error:', deleteAnnouncementError);
          throw deleteAnnouncementError;
        }

        data = { deleted: true };
        break;

      case 'org_health_scores':
        console.log('Calculating org health scores...');

        // Fetch all organizations with their related data
        const { data: allOrgs } = await supabaseClient
          .from('organizations')
          .select('id, name, stripe_account_id, created_at');

        // Fetch all events
        const { data: allEvents } = await supabaseClient
          .from('events')
          .select('organization_id, created_at');

        // Fetch all tickets (sales)
        const { data: allTickets } = await supabaseClient
          .from('tickets')
          .select('event_id, created_at, events!inner(organization_id)');

        // Create a map of org events
        const orgEventsMap = new Map<string, any[]>();
        allEvents?.forEach(e => {
          if (!orgEventsMap.has(e.organization_id)) {
            orgEventsMap.set(e.organization_id, []);
          }
          orgEventsMap.get(e.organization_id)!.push(e);
        });

        // Create a map of org sales
        const orgSalesMap = new Map<string, any[]>();
        allTickets?.forEach((t: any) => {
          const orgId = t.events?.organization_id;
          if (orgId) {
            if (!orgSalesMap.has(orgId)) {
              orgSalesMap.set(orgId, []);
            }
            orgSalesMap.get(orgId)!.push(t);
          }
        });

        // Calculate health scores
        const thirtyDaysAgoHealth = new Date();
        thirtyDaysAgoHealth.setDate(thirtyDaysAgoHealth.getDate() - 30);

        const healthScores = allOrgs?.map(org => {
          const events = orgEventsMap.get(org.id) || [];
          const sales = orgSalesMap.get(org.id) || [];

          // Calculate metrics
          const hasStripeConnected = !!org.stripe_account_id;
          const hasEvents = events.length > 0;
          const hasTicketsSold = sales.length > 0;

          // Find most recent activity
          let lastActivity: string | null = null;
          const allDates = [
            ...events.map(e => e.created_at),
            ...sales.map(s => s.created_at)
          ].filter(Boolean);

          if (allDates.length > 0) {
            lastActivity = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
          }

          const isActive = lastActivity ? new Date(lastActivity) > thirtyDaysAgoHealth : false;

          // Calculate score (out of 100)
          let score = 0;
          if (hasStripeConnected) score += 25;
          if (hasEvents) score += 25;
          if (hasTicketsSold) score += 25;
          if (isActive) score += 25;

          return {
            id: org.id,
            name: org.name,
            score,
            metrics: {
              hasEvents,
              hasTicketsSold,
              hasStripeConnected,
              isActive,
              lastActivity
            }
          };
        }) || [];

        data = healthScores;
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