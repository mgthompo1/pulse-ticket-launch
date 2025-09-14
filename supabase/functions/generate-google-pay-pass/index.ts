import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Pay Event Ticket Class structure
interface GooglePayEventTicketClass {
  id: string;
  classTemplateInfo: {
    cardTemplateOverride: {
      cardRowTemplateInfos: Array<{
        twoItems: {
          startItem: {
            firstValue: {
              fields: Array<{
                fieldPath: string;
              }>;
            };
          };
          endItem: {
            firstValue: {
              fields: Array<{
                fieldPath: string;
              }>;
            };
          };
        };
      }>;
    };
  };
  eventName: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  venue: {
    name: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
    address: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
  };
  dateTime: {
    start: string;
  };
  finePrint: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  issuerName: string;
  reviewStatus: string;
  hexBackgroundColor?: string;
  logo?: {
    sourceUri: {
      uri: string;
    };
    contentDescription: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
  };
}

// Google Pay Event Ticket Object structure
interface GooglePayEventTicketObject {
  id: string;
  classId: string;
  state: string;
  barcode: {
    type: string;
    value: string;
    alternateText: string;
  };
  ticketHolderName: string;
  ticketNumber: string;
  ticketType: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  seatInfo?: {
    seat: {
      seatNumber: string;
    };
    row: {
      rowLabel: string;
    };
    section: {
      sectionLabel: string;
    };
  };
  reservationInfo?: {
    confirmationCode: string;
  };
}

// JWT payload for Google Pay
interface GooglePayJWT {
  iss: string;
  aud: string;
  typ: string;
  iat: number;
  exp: number;
  payload: {
    eventTicketClasses?: GooglePayEventTicketClass[];
    eventTicketObjects: GooglePayEventTicketObject[];
  };
}

// Helper function to format date for Google Pay
function formatGooglePayDate(dateString: string): string {
  return new Date(dateString).toISOString();
}

// Generate a unique class ID based on event details
function generateClassId(eventId: string, organizationId: string): string {
  const baseId = `${organizationId || 'ticketflo'}.${eventId}`;
  return baseId.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
}

// Generate a unique object ID
function generateObjectId(ticketId: string, customerEmail: string): string {
  const baseId = `${ticketId}.${customerEmail}`;
  return baseId.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get('ticketCode');
    const createClass = url.searchParams.get('createClass') === 'true';

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: 'Ticket code is required' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        status,
        created_at,
        order_items (
          ticket_types (name, price, description),
          orders (
            id,
            customer_name,
            customer_email,
            created_at,
            events (
              id,
              name,
              event_date,
              venue,
              description,
              organization_id,
              logo_url,
              organizations (name, logo_url)
            )
          )
        )
      `)
      .eq('ticket_code', ticketCode)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket lookup error:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    const order = Array.isArray(ticket.order_items?.orders) ? ticket.order_items.orders[0] : ticket.order_items?.orders;
    const event = Array.isArray(order?.events) ? order.events[0] : order?.events;
    const ticketType = Array.isArray(ticket.order_items?.ticket_types) ? ticket.order_items.ticket_types[0] : ticket.order_items?.ticket_types;
    const organization = Array.isArray(event?.organizations) ? event.organizations[0] : event?.organizations;

    if (!event || !order) {
      return new Response(
        JSON.stringify({ error: 'Event or order data not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    // Generate IDs
    const classId = generateClassId(event.id, event.organization_id);
    const objectId = generateObjectId(ticket.id, order.customer_email);

    // Create the event ticket class (this would typically be created once per event)
    const eventTicketClass: GooglePayEventTicketClass = {
      id: classId,
      classTemplateInfo: {
        cardTemplateOverride: {
          cardRowTemplateInfos: [
            {
              twoItems: {
                startItem: {
                  firstValue: {
                    fields: [{
                      fieldPath: "object.ticketHolderName"
                    }]
                  }
                },
                endItem: {
                  firstValue: {
                    fields: [{
                      fieldPath: "object.ticketNumber"
                    }]
                  }
                }
              }
            }
          ]
        }
      },
      eventName: {
        defaultValue: {
          language: "en-US",
          value: event.name
        }
      },
      venue: {
        name: {
          defaultValue: {
            language: "en-US",
            value: event.venue || "Venue TBA"
          }
        },
        address: {
          defaultValue: {
            language: "en-US",
            value: event.venue || "Address TBA"
          }
        }
      },
      dateTime: {
        start: event.event_date ? formatGooglePayDate(event.event_date) : new Date().toISOString()
      },
      finePrint: {
        defaultValue: {
          language: "en-US",
          value: "Terms: This ticket is non-transferable and non-refundable. Valid for single entry only."
        }
      },
      issuerName: organization?.name || "TicketFlo",
      reviewStatus: "UNDER_REVIEW", // In production, this would be "APPROVED"
      hexBackgroundColor: "#1F2937" // Dark blue-gray background
    };

    // Add logo if available
    if (organization?.logo_url || event.logo_url) {
      eventTicketClass.logo = {
        sourceUri: {
          uri: organization?.logo_url || event.logo_url || ""
        },
        contentDescription: {
          defaultValue: {
            language: "en-US",
            value: `${organization?.name || event.name} logo`
          }
        }
      };
    }

    // Create the event ticket object
    const eventTicketObject: GooglePayEventTicketObject = {
      id: objectId,
      classId: classId,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: ticket.ticket_code,
        alternateText: ticket.ticket_code
      },
      ticketHolderName: order.customer_name || "Guest",
      ticketNumber: ticket.ticket_code,
      ticketType: {
        defaultValue: {
          language: "en-US",
          value: ticketType?.name || "General Admission"
        }
      },
      reservationInfo: {
        confirmationCode: order.id
      }
    };

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload: GooglePayJWT = {
      iss: Deno.env.get("GOOGLE_PAY_SERVICE_ACCOUNT_EMAIL") || "your-service-account@your-project.iam.gserviceaccount.com",
      aud: "google",
      typ: "savetowallet",
      iat: now,
      exp: now + 3600, // Expires in 1 hour
      payload: {
        eventTicketObjects: [eventTicketObject]
      }
    };

    // Include class if requested (for first-time setup)
    if (createClass) {
      payload.payload.eventTicketClasses = [eventTicketClass];
    }

    // In production, you would sign this JWT with your Google Service Account private key
    const jwtToken = "UNSIGNED_JWT_TOKEN"; // Placeholder

    // Create the Google Pay save URL
    const saveUrl = `https://pay.google.com/gp/v/save/${btoa(JSON.stringify(payload))}`;

    return new Response(JSON.stringify({
      success: true,
      type: 'google-pay',
      ticketId: ticket.id,
      classId: classId,
      objectId: objectId,
      eventTicketClass: eventTicketClass,
      eventTicketObject: eventTicketObject,
      jwtPayload: payload,
      jwtToken: jwtToken,
      saveToGooglePayUrl: saveUrl,
      instructions: [
        "This is a preview of your Google Pay pass data.",
        "In production, you would need to:",
        "1. Set up a Google Pay API console project",
        "2. Create a service account and get credentials",
        "3. Sign the JWT with your private key",
        "4. Submit your event ticket class for approval",
        "5. Use the approved class ID in production"
      ],
      setupInstructions: [
        "To complete Google Pay integration:",
        "1. Go to Google Pay & Wallet Console",
        "2. Create an Event Ticket Class with the provided structure",
        "3. Submit for review and approval",
        "4. Use approved class ID in production",
        "5. Set up proper JWT signing with service account credentials"
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("generate-google-pay-pass error:", error);
    return new Response(JSON.stringify({
      error: error.message || String(error),
      message: 'Google Pay pass generation failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});