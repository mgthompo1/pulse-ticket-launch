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

    console.log("Applying Stripe Connect migration: add_stripe_connect_fields");

    // Execute the Stripe Connect migration SQL
    const migrationSQL = `
      -- Add Stripe Connect fields to organizations table
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_access_token TEXT,
      ADD COLUMN IF NOT EXISTS stripe_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS stripe_scope TEXT;

      -- Add index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account_id ON organizations(stripe_account_id);

      -- Update the get_public_payment_config function to include Connect account info
      CREATE OR REPLACE FUNCTION get_public_payment_config(p_event_id UUID)
      RETURNS TABLE (
          stripe_publishable_key TEXT,
          payment_provider TEXT,
          currency TEXT,
          credit_card_processing_fee_percentage NUMERIC,
          apple_pay_merchant_id TEXT,
          windcave_enabled BOOLEAN,
          stripe_account_id TEXT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              o.stripe_publishable_key,
              o.payment_provider,
              o.currency,
              o.credit_card_processing_fee_percentage,
              o.apple_pay_merchant_id,
              o.windcave_enabled,
              o.stripe_account_id
          FROM events e
          JOIN organizations o ON e.organization_id = o.id
          WHERE e.id = p_event_id;
      END;
      $$;
    `;

    // Try to execute the migration
    const { error } = await supabaseClient.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error('Migration error:', error);
      
      // Try alternative approach - execute statements individually
      console.log("Trying to add columns individually...");
      
      try {
        // Add columns one by one
        const statements = [
          "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;",
          "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_access_token TEXT;", 
          "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_refresh_token TEXT;",
          "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_scope TEXT;",
          "CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account_id ON organizations(stripe_account_id);"
        ];
        
        for (const statement of statements) {
          const { error: stmtError } = await supabaseClient.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.error(`Error executing: ${statement}`, stmtError);
          } else {
            console.log(`Success: ${statement}`);
          }
        }
        
        // Update the function
        const functionSQL = `
          CREATE OR REPLACE FUNCTION get_public_payment_config(p_event_id UUID)
          RETURNS TABLE (
              stripe_publishable_key TEXT,
              payment_provider TEXT,
              currency TEXT,
              credit_card_processing_fee_percentage NUMERIC,
              apple_pay_merchant_id TEXT,
              windcave_enabled BOOLEAN,
              stripe_account_id TEXT
          )
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
              RETURN QUERY
              SELECT 
                  o.stripe_publishable_key,
                  o.payment_provider,
                  o.currency,
                  o.credit_card_processing_fee_percentage,
                  o.apple_pay_merchant_id,
                  o.windcave_enabled,
                  o.stripe_account_id
              FROM events e
              JOIN organizations o ON e.organization_id = o.id
              WHERE e.id = p_event_id;
          END;
          $$;
        `;
        
        const { error: funcError } = await supabaseClient.rpc('exec_sql', { sql: functionSQL });
        if (funcError) {
          console.error('Function update error:', funcError);
        } else {
          console.log('Function updated successfully');
        }
        
        console.log('Migration completed with individual statements');
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Stripe Connect fields and function updated successfully"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
        
      } catch (individualError) {
        throw new Error(`Migration failed: ${error.message}. Individual attempt also failed: ${individualError.message}`);
      }
    }

    console.log("Migration applied successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Stripe Connect fields and get_public_payment_config function updated successfully"
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