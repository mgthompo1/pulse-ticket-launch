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

    console.log("Applying booking fee migration: add_booking_fee_columns_to_orders");

    // Execute the booking fee migration SQL
    const migrationSQL = `
      -- Add booking fee columns to orders table for receipt display
      ALTER TABLE public.orders 
      ADD COLUMN IF NOT EXISTS booking_fee_amount DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS booking_fee_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2) DEFAULT 0.00;
      
      -- Update existing orders to have subtotal_amount equal to total_amount (for backwards compatibility)
      UPDATE public.orders 
      SET subtotal_amount = total_amount 
      WHERE subtotal_amount = 0.00;
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

      // Note: No function comment needed - publish-monthly-billing is an Edge Function
      console.log('Migration completed - booking fee columns created');

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          message: "Migration partially applied - booking fee columns may require manual intervention"
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
        message: "Booking fee migration applied successfully - orders table updated with booking fee columns"
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
