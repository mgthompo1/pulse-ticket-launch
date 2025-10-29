import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    // Get the webhook secret from environment
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    let event: Stripe.Event;

    try {
      event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook event received:", event.type, "ID:", event.id);

    // Check if this webhook event has already been processed (idempotency)
    const { data: existingEvent, error: idempotencyError } = await supabaseClient
      .from('webhook_events_log')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent && !idempotencyError) {
      console.log("✅ Webhook already processed:", event.id);
      return new Response(JSON.stringify({ received: true, cached: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark event as being processed BEFORE actually processing it
    const { error: logError } = await supabaseClient
      .from('webhook_events_log')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processing_status: 'processed'
      });

    if (logError) {
      console.error("Error logging webhook event:", logError);
      // Continue processing even if logging fails
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabaseClient);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabaseClient);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabaseClient);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as any, supabaseClient);
        break;

      case "payout.created":
      case "payout.updated":
      case "payout.paid":
      case "payout.failed":
        await handlePayoutEvent(event.data.object as Stripe.Payout, event.account, supabaseClient);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabaseClient: any) {
  console.log("Processing checkout.session.completed:", session.id);
  
  try {
    // Check if this is an invoice payment
    if (session.metadata?.invoice_id) {
      const invoiceId = session.metadata.invoice_id;
      
      // Update invoice status
      const { error: invoiceError } = await supabaseClient
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id
        })
        .eq("id", invoiceId);

      if (invoiceError) {
        console.error("Error updating invoice:", invoiceError);
      } else {
        console.log("Invoice marked as paid:", invoiceId);
      }
    }
    
    // Check if this is an order payment (widget)
    if (session.metadata?.order_id) {
      const orderId = session.metadata.order_id;
      
      // Update order status
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update({
          status: "paid",
          stripe_session_id: session.id
        })
        .eq("id", orderId);

      if (orderError) {
        console.error("Error updating order:", orderError);
      } else {
        console.log("Order marked as paid:", orderId);
        
        // Generate tickets for the completed order first
        try {
          const { data: orderItems } = await supabaseClient
            .from("order_items")
            .select("*")
            .eq("order_id", orderId);

          if (Array.isArray(orderItems) && orderItems.length > 0) {
            const tickets = [];
            // Only generate tickets for ticket items, not merchandise
            const ticketItems = orderItems.filter(item => item.item_type === 'ticket');
            for (const item of ticketItems) {
              for (let i = 0; i < item.quantity; i++) {
                tickets.push({
                  order_item_id: item.id,
                  ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  status: 'valid'
                });
              }
            }
            
            if (tickets.length > 0) {
              const { error: ticketsError } = await supabaseClient
                .from("tickets")
                .insert(tickets);
                
              if (ticketsError) {
                console.error("Error creating tickets:", ticketsError);
              } else {
                console.log("Tickets created successfully:", tickets.length);
              }
            }
          }
        } catch (ticketError) {
          console.error("Error in ticket generation:", ticketError);
        }
        
        // Send ticket confirmation email
        try {
          console.log("Triggering ticket email for order:", orderId);

          const emailResponse = await supabaseClient.functions.invoke('send-ticket-email-v2', {
            body: { orderId: orderId }
          });

          if (emailResponse.error) {
            console.error("Error sending ticket email:", emailResponse.error);
          } else {
            console.log("Ticket email sent successfully for order:", orderId);
          }
        } catch (emailError) {
          console.error("Failed to send ticket email:", emailError);
        }

        // Send promo code notification email if a promo code was used
        try {
          // Check if order has a promo code
          const { data: order } = await supabaseClient
            .from("orders")
            .select("promo_code_id")
            .eq("id", orderId)
            .single();

          if (order?.promo_code_id) {
            console.log("Sending promo code notification for order:", orderId);

            const promoNotificationResponse = await supabaseClient.functions.invoke('send-promo-code-notification', {
              body: {
                promoCodeId: order.promo_code_id,
                orderId: orderId
              }
            });

            if (promoNotificationResponse.error) {
              console.error("Error sending promo code notification:", promoNotificationResponse.error);
            } else {
              console.log("Promo code notification sent successfully");
            }
          }
        } catch (promoError) {
          console.error("Failed to send promo code notification:", promoError);
        }
      }
    }

  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabaseClient: any) {
  console.log("Processing payment_intent.succeeded:", paymentIntent.id);

  try {
    // Update payment_intents_log with succeeded status
    const { error: logUpdateError } = await supabaseClient
      .from("payment_intents_log")
      .update({
        status: paymentIntent.status,
        processed_at: new Date().toISOString()
      })
      .eq("payment_intent_id", paymentIntent.id);

    if (logUpdateError) {
      console.error("Error updating payment_intents_log:", logUpdateError);
    } else {
      console.log("Payment intent log updated to succeeded:", paymentIntent.id);
    }

    // Find order by payment intent ID
    const { data: orders, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("stripe_session_id", paymentIntent.id)
      .limit(1);

    if (orderError) {
      console.error("Error finding order:", orderError);
      return;
    }

    if (Array.isArray(orders) && orders.length > 0) {
      const order = orders[0];

      // Update order status
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({
          status: "paid"
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Error updating order:", updateError);
      } else {
        console.log("Order marked as paid:", order.id);
        
        // Send ticket confirmation email
        try {
          console.log("Triggering ticket email for order:", order.id);
          
          const emailResponse = await supabaseClient.functions.invoke('send-ticket-email-v2', {
            body: { orderId: order.id }
          });
          
          if (emailResponse.error) {
            console.error("Error sending ticket email:", emailResponse.error);
          } else {
            console.log("Ticket email sent successfully for order:", order.id);
          }
        } catch (emailError) {
          console.error("Failed to send ticket email:", emailError);
        }
      }
    }

  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabaseClient: any) {
  console.log("Processing invoice.payment_succeeded:", invoice.id);
  
  try {
    // Find invoice by Stripe invoice ID
    const { data: invoices, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("stripe_session_id", invoice.id)
      .limit(1);

    if (invoiceError) {
      console.error("Error finding invoice:", invoiceError);
      return;
    }

    if (Array.isArray(invoices) && invoices.length > 0) {
      const dbInvoice = invoices[0];
      
      // Update invoice status
      const { error: updateError } = await supabaseClient
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", dbInvoice.id);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
      } else {
        console.log("Invoice marked as paid:", dbInvoice.id);
      }
    }

  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

async function handleAccountUpdated(account: any, supabaseClient: any) {
  console.log("Processing account.updated:", account.id);

  try {
    const organizationId = account.metadata?.organization_id;

    console.log("Account updated webhook:", {
      accountId: account.id,
      organizationId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      metadata: account.metadata
    });

    if (organizationId) {
      const isOnboarded = account.charges_enabled && account.payouts_enabled;

      const { error } = await supabaseClient
        .from("organizations")
        .update({
          stripe_onboarding_complete: isOnboarded,
          stripe_account_id: account.id
        })
        .eq("id", organizationId);

      if (error) {
        console.error("Failed to update organization:", error);
      } else {
        console.log(`✅ Updated organization ${organizationId} - onboarded: ${isOnboarded}`);
      }
    } else {
      console.log("⚠️  No organization_id in account metadata, trying to find by stripe_account_id");

      // Try to find organization by stripe_account_id
      const { data: org, error: findError } = await supabaseClient
        .from("organizations")
        .select("id")
        .eq("stripe_account_id", account.id)
        .single();

      if (findError || !org) {
        console.error("Could not find organization for account:", account.id);
      } else {
        const isOnboarded = account.charges_enabled && account.payouts_enabled;

        const { error: updateError } = await supabaseClient
          .from("organizations")
          .update({ stripe_onboarding_complete: isOnboarded })
          .eq("id", org.id);

        if (updateError) {
          console.error("Failed to update organization:", updateError);
        } else {
          console.log(`✅ Updated organization ${org.id} - onboarded: ${isOnboarded}`);
        }
      }
    }
  } catch (error) {
    console.error("Error handling account updated:", error);
  }
}

async function handlePayoutEvent(payout: Stripe.Payout, stripeAccountId: string | null, supabaseClient: any) {
  console.log("Processing payout event:", payout.id, "Status:", payout.status);

  try {
    if (!stripeAccountId) {
      console.error("No Stripe account ID provided for payout event");
      return;
    }

    // Find organization by Stripe account ID
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, currency")
      .eq("stripe_account_id", stripeAccountId)
      .single();

    if (orgError || !org) {
      console.error("Could not find organization for Stripe account:", stripeAccountId);
      return;
    }

    console.log("Found organization:", org.id);

    // Check if payout already exists
    const { data: existingPayout, error: findError } = await supabaseClient
      .from("payouts")
      .select("id")
      .eq("processor_payout_id", payout.id)
      .single();

    const payoutData = {
      organization_id: org.id,
      payment_processor: "stripe",
      processor_payout_id: payout.id,
      processor_account_id: stripeAccountId,
      payout_date: new Date(payout.created * 1000).toISOString(),
      arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
      payout_status: mapPayoutStatus(payout.status),
      gross_amount: payout.amount / 100,
      processor_fees: 0, // Will be updated when balance transactions are synced
      platform_fees: 0,
      refunds_amount: 0,
      adjustments_amount: 0,
      net_amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      bank_account_last4: payout.destination ? String(payout.destination).slice(-4) : null,
      bank_name: null,
      description: payout.description || null,
      statement_descriptor: payout.statement_descriptor || null,
      metadata: {
        stripe_payout: payout,
        automatic: payout.automatic,
        method: payout.method,
        type: payout.type,
      },
    };

    if (existingPayout) {
      // Update existing payout
      const { error: updateError } = await supabaseClient
        .from("payouts")
        .update({
          payout_status: payoutData.payout_status,
          arrival_date: payoutData.arrival_date,
          metadata: payoutData.metadata,
        })
        .eq("id", existingPayout.id);

      if (updateError) {
        console.error("Error updating payout:", updateError);
      } else {
        console.log("✅ Updated payout:", payout.id);
      }
    } else {
      // Insert new payout
      const { error: insertError } = await supabaseClient
        .from("payouts")
        .insert(payoutData);

      if (insertError) {
        console.error("Error inserting payout:", insertError);
      } else {
        console.log("✅ Inserted new payout:", payout.id);
      }
    }
  } catch (error) {
    console.error("Error handling payout event:", error);
  }
}

function mapPayoutStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "pending":
      return "pending";
    case "in_transit":
      return "in_transit";
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}