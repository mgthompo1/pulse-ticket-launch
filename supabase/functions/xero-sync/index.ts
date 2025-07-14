import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { action, organizationId, orderId } = await req.json();

    // Get Xero connection for this organization
    const { data: connection, error: connectionError } = await supabaseClient
      .from("xero_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("connection_status", "connected")
      .single();

    if (connectionError || !connection) {
      throw new Error("No active Xero connection found");
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    
    let accessToken = connection.access_token;
    
    if (now >= expiresAt) {
      // Refresh token
      const clientId = Deno.env.get("XERO_CLIENT_ID");
      const clientSecret = Deno.env.get("XERO_CLIENT_SECRET");

      const refreshResponse = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token
        })
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Xero token");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Update stored tokens
      await supabaseClient
        .from("xero_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
        })
        .eq("id", connection.id);
    }

    if (action === "createInvoice") {
      // Get order details
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select(`
          *,
          events(name, event_date),
          order_items(
            *,
            ticket_types(name, price),
            merchandise(name, price)
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      // Create contact in Xero if not exists
      const contactData = {
        Name: order.customer_name,
        EmailAddress: order.customer_email,
        ContactPersons: [{
          FirstName: order.customer_name.split(' ')[0],
          LastName: order.customer_name.split(' ').slice(1).join(' ') || "",
          EmailAddress: order.customer_email
        }]
      };

      const contactResponse = await fetch(`https://api.xero.com/api.xro/2.0/Contacts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Xero-tenant-id": connection.tenant_id,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ Contacts: [contactData] })
      });

      let contactId;
      if (contactResponse.ok) {
        const contactResult = await contactResponse.json();
        contactId = contactResult.Contacts[0].ContactID;
      } else {
        // Try to find existing contact
        const searchResponse = await fetch(
          `https://api.xero.com/api.xro/2.0/Contacts?where=EmailAddress="${order.customer_email}"`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Xero-tenant-id": connection.tenant_id
            }
          }
        );

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.Contacts && searchResult.Contacts.length > 0) {
            contactId = searchResult.Contacts[0].ContactID;
          }
        }
      }

      // Create line items
      const lineItems = order.order_items.map((item: any) => {
        const itemName = item.ticket_types?.name || item.merchandise?.name || "Unknown Item";
        const unitAmount = parseFloat(item.unit_price);
        
        return {
          Description: `${order.events.name} - ${itemName}`,
          Quantity: item.quantity,
          UnitAmount: unitAmount,
          AccountCode: "200" // Sales account - this should be configurable
        };
      });

      // Create invoice
      const invoiceData = {
        Type: "ACCREC",
        Contact: { ContactID: contactId },
        Date: new Date().toISOString().split('T')[0],
        DueDate: new Date().toISOString().split('T')[0],
        Reference: `Order-${order.id}`,
        Status: "AUTHORISED",
        LineItems: lineItems
      };

      const invoiceResponse = await fetch(`https://api.xero.com/api.xro/2.0/Invoices`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Xero-tenant-id": connection.tenant_id,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ Invoices: [invoiceData] })
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        throw new Error(`Failed to create Xero invoice: ${errorText}`);
      }

      const invoiceResult = await invoiceResponse.json();
      const invoice = invoiceResult.Invoices[0];

      // Log sync operation
      await supabaseClient
        .from("xero_sync_logs")
        .insert({
          xero_connection_id: connection.id,
          operation_type: "invoice_create",
          entity_type: "order",
          entity_id: order.id,
          xero_entity_id: invoice.InvoiceID,
          status: "success",
          sync_data: {
            invoice_number: invoice.InvoiceNumber,
            total: invoice.Total
          }
        });

      return new Response(JSON.stringify({ 
        success: true,
        invoiceId: invoice.InvoiceID,
        invoiceNumber: invoice.InvoiceNumber,
        total: invoice.Total
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "testConnection") {
      // Test connection by fetching organisation info
      const orgResponse = await fetch(`https://api.xero.com/api.xro/2.0/Organisation`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Xero-tenant-id": connection.tenant_id
        }
      });

      if (!orgResponse.ok) {
        throw new Error("Failed to connect to Xero");
      }

      const orgData = await orgResponse.json();

      // Update last sync time
      await supabaseClient
        .from("xero_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);

      return new Response(JSON.stringify({ 
        success: true,
        organisation: orgData.Organisations[0]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Xero sync error:", error);
    
    // Log failed operation if we have the necessary info
    if (error.message.includes("organizationId")) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { organizationId, orderId, action } = await req.json();
      
      try {
        const { data: connection } = await supabaseClient
          .from("xero_connections")
          .select("id")
          .eq("organization_id", organizationId)
          .single();

        if (connection) {
          await supabaseClient
            .from("xero_sync_logs")
            .insert({
              xero_connection_id: connection.id,
              operation_type: action || "unknown",
              entity_type: "order",
              entity_id: orderId || "unknown",
              status: "failed",
              error_message: error.message
            });
        }
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});