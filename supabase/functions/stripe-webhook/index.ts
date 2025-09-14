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

    console.log("Webhook event received:", event.type);

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
      }
    }

  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabaseClient: any) {
  console.log("Processing payment_intent.succeeded:", paymentIntent.id);
  
  try {
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