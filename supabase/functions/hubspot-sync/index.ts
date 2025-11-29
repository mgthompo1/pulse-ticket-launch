import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// HubSpot API base URL
const HUBSPOT_API_BASE = "https://api.hubapi.com";

interface RequestBody {
  action: "pushContacts" | "pullContacts" | "pushSingleContact" | "getContactCount";
  organizationId: string;
  contactIds?: string[]; // Optional: specific contacts to sync
  options?: {
    conflictResolution?: "ticketflo_wins" | "hubspot_wins" | "most_recent_wins";
    createMissing?: boolean;
    updateExisting?: boolean;
  };
}

interface HubSpotContact {
  id: string;
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface TicketFloContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  total_spent: number;
  total_orders: number;
  lifetime_value: number;
  tags: string[];
  hubspot_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, organizationId, contactIds, options } = body;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get HubSpot connection and validate
    const { data: connection, error: connError } = await supabaseAdmin
      .from("hubspot_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No HubSpot connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check and refresh token if needed
    const accessToken = await ensureValidToken(supabaseAdmin, connection);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get valid access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get field mappings
    const { data: fieldMappings } = await supabaseAdmin
      .from("hubspot_field_mappings")
      .select("*")
      .eq("hubspot_connection_id", connection.id)
      .eq("is_enabled", true);

    const syncSettings = connection.sync_settings || {};
    const conflictResolution = options?.conflictResolution || syncSettings.conflict_resolution || "ticketflo_wins";

    switch (action) {
      case "getContactCount": {
        // Get count of contacts in both systems
        const { count: tfloCount } = await supabaseAdmin
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

        const hsCountResponse = await fetch(
          `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        let hsCount = 0;
        if (hsCountResponse.ok) {
          const hsData = await hsCountResponse.json();
          hsCount = hsData.total || 0;
        }

        return new Response(
          JSON.stringify({
            ticketfloCount: tfloCount || 0,
            hubspotCount: hsCount,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pushContacts": {
        // Get contacts to push
        let query = supabaseAdmin
          .from("contacts")
          .select("*")
          .eq("organization_id", organizationId);

        if (contactIds && contactIds.length > 0) {
          query = query.in("id", contactIds);
        }

        const { data: contacts, error: contactsError } = await query;

        if (contactsError) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch contacts", details: contactsError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!contacts || contacts.length === 0) {
          return new Response(
            JSON.stringify({ message: "No contacts to push", processed: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create sync log entry
        const { data: syncLog } = await supabaseAdmin
          .from("hubspot_sync_logs")
          .insert({
            hubspot_connection_id: connection.id,
            operation_type: "bulk_push",
            status: "in_progress",
            records_processed: 0,
          })
          .select()
          .single();

        let created = 0;
        let updated = 0;
        let failed = 0;
        const errors: any[] = [];

        // Process contacts in batches of 10
        const batchSize = 10;
        for (let i = 0; i < contacts.length; i += batchSize) {
          const batch = contacts.slice(i, i + batchSize);

          for (const contact of batch) {
            try {
              const result = await pushContactToHubSpot(
                supabaseAdmin,
                accessToken,
                connection.id,
                contact,
                fieldMappings || [],
                conflictResolution
              );

              if (result.created) created++;
              else if (result.updated) updated++;
            } catch (error) {
              failed++;
              errors.push({
                contactId: contact.id,
                email: contact.email,
                error: error.message,
              });
            }
          }
        }

        // Update sync log
        await supabaseAdmin
          .from("hubspot_sync_logs")
          .update({
            status: failed === contacts.length ? "failed" : "success",
            records_processed: contacts.length,
            records_created: created,
            records_updated: updated,
            records_failed: failed,
            error_details: errors.length > 0 ? errors : null,
          })
          .eq("id", syncLog?.id);

        // Update last_sync_at
        await supabaseAdmin
          .from("hubspot_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({
            success: true,
            processed: contacts.length,
            created,
            updated,
            failed,
            errors: errors.length > 0 ? errors : undefined,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pullContacts": {
        // Create sync log entry
        const { data: syncLog } = await supabaseAdmin
          .from("hubspot_sync_logs")
          .insert({
            hubspot_connection_id: connection.id,
            operation_type: "bulk_pull",
            status: "in_progress",
            records_processed: 0,
          })
          .select()
          .single();

        let created = 0;
        let updated = 0;
        let failed = 0;
        let processed = 0;
        const errors: any[] = [];

        // Fetch all HubSpot contacts with pagination
        let after: string | undefined;
        const properties = getHubSpotPropertiesToFetch(fieldMappings || []);

        do {
          const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`);
          url.searchParams.set("limit", "100");
          url.searchParams.set("properties", properties.join(","));
          if (after) url.searchParams.set("after", after);

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HubSpot API error: ${errorText}`);
          }

          const data = await response.json();
          const hubspotContacts: HubSpotContact[] = data.results || [];

          for (const hsContact of hubspotContacts) {
            try {
              const result = await pullContactFromHubSpot(
                supabaseAdmin,
                connection.id,
                organizationId,
                hsContact,
                fieldMappings || [],
                conflictResolution
              );

              processed++;
              if (result.created) created++;
              else if (result.updated) updated++;
            } catch (error) {
              processed++;
              failed++;
              errors.push({
                hubspotContactId: hsContact.id,
                email: hsContact.properties?.email,
                error: error.message,
              });
            }
          }

          after = data.paging?.next?.after;
        } while (after);

        // Update sync log
        await supabaseAdmin
          .from("hubspot_sync_logs")
          .update({
            status: failed === processed ? "failed" : "success",
            records_processed: processed,
            records_created: created,
            records_updated: updated,
            records_failed: failed,
            error_details: errors.length > 0 ? errors : null,
          })
          .eq("id", syncLog?.id);

        // Update last_sync_at
        await supabaseAdmin
          .from("hubspot_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({
            success: true,
            processed,
            created,
            updated,
            failed,
            errors: errors.length > 0 ? errors : undefined,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pushSingleContact": {
        if (!contactIds || contactIds.length !== 1) {
          return new Response(
            JSON.stringify({ error: "Single contact ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: contact, error: contactError } = await supabaseAdmin
          .from("contacts")
          .select("*")
          .eq("id", contactIds[0])
          .eq("organization_id", organizationId)
          .single();

        if (contactError || !contact) {
          return new Response(
            JSON.stringify({ error: "Contact not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        try {
          const result = await pushContactToHubSpot(
            supabaseAdmin,
            accessToken,
            connection.id,
            contact,
            fieldMappings || [],
            conflictResolution
          );

          // Log the operation
          await supabaseAdmin.from("hubspot_sync_logs").insert({
            hubspot_connection_id: connection.id,
            operation_type: "contact_push",
            ticketflo_contact_id: contact.id,
            hubspot_contact_id: result.hubspotContactId,
            status: "success",
            records_processed: 1,
            records_created: result.created ? 1 : 0,
            records_updated: result.updated ? 1 : 0,
          });

          return new Response(
            JSON.stringify({
              success: true,
              created: result.created,
              updated: result.updated,
              hubspotContactId: result.hubspotContactId,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          await supabaseAdmin.from("hubspot_sync_logs").insert({
            hubspot_connection_id: connection.id,
            operation_type: "contact_push",
            ticketflo_contact_id: contact.id,
            status: "failed",
            error_message: error.message,
          });

          return new Response(
            JSON.stringify({ error: "Failed to push contact", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("HubSpot sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Ensure we have a valid access token
async function ensureValidToken(supabase: any, connection: any): Promise<string | null> {
  const tokenExpiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMinutes = 5;

  if (tokenExpiresAt.getTime() - now.getTime() > bufferMinutes * 60 * 1000) {
    return connection.access_token;
  }

  // Token needs refresh
  const HUBSPOT_CLIENT_ID = Deno.env.get("HUBSPOT_CLIENT_ID");
  const HUBSPOT_CLIENT_SECRET = Deno.env.get("HUBSPOT_CLIENT_SECRET");

  const refreshResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: HUBSPOT_CLIENT_ID!,
      client_secret: HUBSPOT_CLIENT_SECRET!,
      refresh_token: connection.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    console.error("Token refresh failed");
    await supabase
      .from("hubspot_connections")
      .update({ connection_status: "token_expired", last_error: "Token refresh failed" })
      .eq("id", connection.id);
    return null;
  }

  const newTokens = await refreshResponse.json();

  await supabase
    .from("hubspot_connections")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      connection_status: "connected",
    })
    .eq("id", connection.id);

  return newTokens.access_token;
}

// Helper: Get HubSpot properties to fetch based on field mappings
function getHubSpotPropertiesToFetch(mappings: any[]): string[] {
  const defaultProperties = ["email", "firstname", "lastname", "phone", "city", "country", "createdate", "lastmodifieddate"];
  const mappedProperties = mappings
    .filter((m) => m.sync_direction === "pull" || m.sync_direction === "both")
    .map((m) => m.hubspot_property);

  return [...new Set([...defaultProperties, ...mappedProperties])];
}

// Helper: Map TicketFlo contact to HubSpot properties
function mapToHubSpotProperties(contact: TicketFloContact, mappings: any[]): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const mapping of mappings) {
    if (mapping.sync_direction !== "push" && mapping.sync_direction !== "both") continue;

    const value = getContactFieldValue(contact, mapping.ticketflo_field, mapping.transform_type);
    if (value !== null && value !== undefined && value !== "") {
      properties[mapping.hubspot_property] = String(value);
    }
  }

  return properties;
}

// Helper: Get contact field value with optional transformation
function getContactFieldValue(contact: TicketFloContact, field: string, transform?: string): any {
  const value = (contact as any)[field];

  if (value === null || value === undefined) return null;

  switch (transform) {
    case "currency":
      return typeof value === "number" ? value.toFixed(2) : value;
    case "date":
      return value instanceof Date ? value.toISOString().split("T")[0] : value;
    case "array_to_string":
      return Array.isArray(value) ? value.join("; ") : value;
    default:
      return value;
  }
}

// Helper: Map HubSpot properties to TicketFlo contact fields
function mapFromHubSpotProperties(hsContact: HubSpotContact, mappings: any[]): Partial<TicketFloContact> {
  const contactData: Partial<TicketFloContact> = {};

  for (const mapping of mappings) {
    if (mapping.sync_direction !== "pull" && mapping.sync_direction !== "both") continue;

    const value = hsContact.properties[mapping.hubspot_property];
    if (value !== null && value !== undefined && value !== "") {
      setContactFieldValue(contactData, mapping.ticketflo_field, value, mapping.transform_type);
    }
  }

  return contactData;
}

// Helper: Set contact field value with optional transformation
function setContactFieldValue(contact: Partial<TicketFloContact>, field: string, value: string, transform?: string) {
  switch (transform) {
    case "currency":
      (contact as any)[field] = parseFloat(value) || 0;
      break;
    case "string_to_array":
      (contact as any)[field] = value.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
      break;
    default:
      (contact as any)[field] = value;
  }
}

// Push a single contact to HubSpot
async function pushContactToHubSpot(
  supabase: any,
  accessToken: string,
  connectionId: string,
  contact: TicketFloContact,
  mappings: any[],
  conflictResolution: string
): Promise<{ created: boolean; updated: boolean; hubspotContactId: string }> {
  const properties = mapToHubSpotProperties(contact, mappings);

  // Check if contact already exists in HubSpot (by email)
  const searchResponse = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: contact.email,
            },
          ],
        },
      ],
    }),
  });

  const searchData = await searchResponse.json();
  const existingContact = searchData.results?.[0];

  if (existingContact) {
    // Contact exists, check conflict resolution
    if (conflictResolution === "hubspot_wins") {
      // Don't update HubSpot, just record the mapping
      await updateContactMapping(supabase, connectionId, contact.id, existingContact.id, "push");
      return { created: false, updated: false, hubspotContactId: existingContact.id };
    }

    if (conflictResolution === "most_recent_wins") {
      const hsUpdatedAt = new Date(existingContact.updatedAt);
      const tfloUpdatedAt = new Date(contact.updated_at);
      if (hsUpdatedAt > tfloUpdatedAt) {
        // HubSpot is more recent, don't update
        await updateContactMapping(supabase, connectionId, contact.id, existingContact.id, "push");
        return { created: false, updated: false, hubspotContactId: existingContact.id };
      }
    }

    // Update existing contact
    const updateResponse = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingContact.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update HubSpot contact: ${errorText}`);
    }

    // Update mapping
    await updateContactMapping(supabase, connectionId, contact.id, existingContact.id, "push");

    // Update hubspot_contact_id on the contact
    await supabase
      .from("contacts")
      .update({ hubspot_contact_id: existingContact.id })
      .eq("id", contact.id);

    return { created: false, updated: true, hubspotContactId: existingContact.id };
  } else {
    // Create new contact
    const createResponse = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create HubSpot contact: ${errorText}`);
    }

    const newContact = await createResponse.json();

    // Create mapping
    await updateContactMapping(supabase, connectionId, contact.id, newContact.id, "push");

    // Update hubspot_contact_id on the contact
    await supabase
      .from("contacts")
      .update({ hubspot_contact_id: newContact.id })
      .eq("id", contact.id);

    return { created: true, updated: false, hubspotContactId: newContact.id };
  }
}

// Pull a single contact from HubSpot
async function pullContactFromHubSpot(
  supabase: any,
  connectionId: string,
  organizationId: string,
  hsContact: HubSpotContact,
  mappings: any[],
  conflictResolution: string
): Promise<{ created: boolean; updated: boolean }> {
  const email = hsContact.properties.email;
  if (!email) {
    throw new Error("HubSpot contact has no email");
  }

  const contactData = mapFromHubSpotProperties(hsContact, mappings);

  // Check if contact already exists in TicketFlo (by email)
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("email", email.toLowerCase())
    .single();

  if (existingContact) {
    // Contact exists, check conflict resolution
    if (conflictResolution === "ticketflo_wins") {
      // Don't update TicketFlo, just record the mapping
      await updateContactMapping(supabase, connectionId, existingContact.id, hsContact.id, "pull");
      return { created: false, updated: false };
    }

    if (conflictResolution === "most_recent_wins") {
      const hsUpdatedAt = new Date(hsContact.updatedAt);
      const tfloUpdatedAt = new Date(existingContact.updated_at);
      if (tfloUpdatedAt > hsUpdatedAt) {
        // TicketFlo is more recent, don't update
        await updateContactMapping(supabase, connectionId, existingContact.id, hsContact.id, "pull");
        return { created: false, updated: false };
      }
    }

    // Update existing contact
    await supabase
      .from("contacts")
      .update({
        ...contactData,
        hubspot_contact_id: hsContact.id,
      })
      .eq("id", existingContact.id);

    await updateContactMapping(supabase, connectionId, existingContact.id, hsContact.id, "pull");

    return { created: false, updated: true };
  } else {
    // Create new contact
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        first_name: contactData.first_name || hsContact.properties.firstname || null,
        last_name: contactData.last_name || hsContact.properties.lastname || null,
        phone: contactData.phone || hsContact.properties.phone || null,
        city: contactData.city || hsContact.properties.city || null,
        country: contactData.country || hsContact.properties.country || null,
        hubspot_contact_id: hsContact.id,
        total_spent: 0,
        total_orders: 0,
        lifetime_value: 0,
        tags: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }

    await updateContactMapping(supabase, connectionId, newContact.id, hsContact.id, "pull");

    return { created: true, updated: false };
  }
}

// Helper: Update or create contact mapping
async function updateContactMapping(
  supabase: any,
  connectionId: string,
  ticketfloContactId: string,
  hubspotContactId: string,
  direction: "push" | "pull"
) {
  const updateData: any = {
    hubspot_connection_id: connectionId,
    ticketflo_contact_id: ticketfloContactId,
    hubspot_contact_id: hubspotContactId,
  };

  if (direction === "push") {
    updateData.last_pushed_at = new Date().toISOString();
  } else {
    updateData.last_pulled_at = new Date().toISOString();
  }

  await supabase.from("hubspot_contact_mappings").upsert(updateData, {
    onConflict: "hubspot_connection_id,ticketflo_contact_id",
  });
}
