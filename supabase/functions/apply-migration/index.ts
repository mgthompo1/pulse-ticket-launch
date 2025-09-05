import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Applying billing migration: update_billing_to_fortnightly");

    // Execute the migration SQL
    const migrationSQL = `
      -- Update billing cycle to fortnightly (14 days) instead of monthly (30 days)
      
      -- First ensure the billing_interval_days column exists (in case previous migrations weren't applied)
      ALTER TABLE public.billing_customers
      ADD COLUMN IF NOT EXISTS billing_interval_days INTEGER NOT NULL DEFAULT 30;
      
      -- Add other billing schedule fields if they don't exist
      ALTER TABLE public.billing_customers
      ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;
      
      -- Create index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_billing_customers_next_billing
        ON public.billing_customers(next_billing_at)
        WHERE next_billing_at IS NOT NULL;
      
      -- Now change the default billing interval to 14 days (fortnightly)
      ALTER TABLE public.billing_customers 
      ALTER COLUMN billing_interval_days SET DEFAULT 14;
      
      -- Update the scheduled function comment to reflect fortnightly billing
      COMMENT ON FUNCTION publish_monthly_billing() IS 'Processes billing for customers based on their billing_interval_days (default: fortnightly/14 days)';
    `;

    const { error } = await supabaseClient.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error('Migration error:', error);
      
      // Try alternative approach - execute each statement separately
      console.log("Trying alternative approach...");
      
      // Update default billing interval
      const { error: alterError } = await supabaseClient
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'billing_customers')
        .eq('column_name', 'billing_interval_days');
      
      if (alterError) {
        throw new Error(`Failed to check billing_customers table: ${alterError.message}`);
      }

      // Since we can't use ALTER directly, let's just update the function comment
      const { error: commentError } = await supabaseClient.rpc('exec_sql', {
        sql: `COMMENT ON FUNCTION publish_monthly_billing() IS 'Processes billing for customers based on their billing_interval_days (default: fortnightly/14 days)';`
      });

      if (commentError) {
        console.warn('Could not update function comment:', commentError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          message: "Migration partially applied - function comment updated, but table alteration may require manual intervention"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("Migration applied successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Billing migration applied successfully - default interval changed to 14 days (fortnightly)"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Migration function error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
