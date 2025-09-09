import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to create function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const sql = `
      CREATE OR REPLACE FUNCTION public.webauthn_delete_credential(p_credential_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER
      AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        -- Delete the credential (RLS policy ensures user can only delete their own)
        DELETE FROM webauthn.user_credentials 
        WHERE id = p_credential_id 
        AND user_id = auth.uid();
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Return true if a row was deleted, false otherwise
        RETURN deleted_count > 0;
      END;
      $$;
    `;

    const { error } = await supabaseClient.rpc('query', { query: sql });

    if (error) {
      console.error('Error creating function:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "webauthn_delete_credential function created" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Function creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});