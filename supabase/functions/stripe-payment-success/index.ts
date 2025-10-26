import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== STRIPE PAYMENT SUCCESS HANDLER ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, paymentIntentId } = await req.json();
    console.log("Processing payment success for order:", orderId, "payment intent:", paymentIntentId);

    if (!orderId) {
      throw new Error("Missing orderId parameter");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Initialize Stripe to get payment method details
    let paymentMethodDetails = null;
    if (paymentIntentId) {
      try {
        const Stripe = await import("https://esm.sh/stripe@14.21.0");
        
        // Get order to find organization
        const { data: orderData } = await supabaseClient
          .from('orders')
          .select(`
            event_id,
            events (
              organization_id
            )
          `)
          .eq('id', orderId)
          .single();

        if ((orderData as any)?.events?.organization_id) {
          // Get payment credentials
          const { data: credentials } = await supabaseClient
            .rpc('get_payment_credentials_for_processing', {
              p_organization_id: (orderData as any).events.organization_id
            });

          if (Array.isArray(credentials) && credentials[0]?.stripe_secret_key) {
            const stripe = new Stripe.default(credentials[0].stripe_secret_key, {
              apiVersion: "2023-10-16",
            });

            // Get payment intent details
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            console.log("Payment intent retrieved:", paymentIntent.id);
            
            if (paymentIntent.payment_method) {
              // Get payment method details
              const paymentMethod = await stripe.paymentMethods.retrieve(
                typeof paymentIntent.payment_method === 'string' 
                  ? paymentIntent.payment_method 
                  : paymentIntent.payment_method.id
              );
              
              console.log("Payment method retrieved:", paymentMethod.id);
              console.log("Payment method type:", paymentMethod.type);
              console.log("Card details:", paymentMethod.card);
              
              paymentMethodDetails = {
                type: paymentMethod.type,
                cardBrand: paymentMethod.card?.brand,
                cardLast4: paymentMethod.card?.last4,
                paymentMethodId: paymentMethod.id
              };
            }
          }
        }
      } catch (stripeError) {
        console.error("Error retrieving payment method details:", stripeError);
        // Don't fail the whole process for this
      }
    }

    // Update order status to paid
    console.log("Updating order status to paid...");
    console.log("Looking for order with ID:", orderId);
    
    // First, let's check if the order exists
    const { data: existingOrder, error: lookupError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    
    if (lookupError || !existingOrder) {
      console.error("Order lookup failed:", lookupError);
      console.error("Order ID searched:", orderId);
      throw new Error(`Order not found: ${orderId}`);
    }
    
    console.log("Order found:", existingOrder.id, "Status:", existingOrder.status);
    
    console.log("About to update order with data:", {
      orderId: orderId,
      newStatus: "paid",
      paymentIntentId: paymentIntentId,
      paymentMethodDetails: paymentMethodDetails
    });
    
    // Build update object with payment method details
    const updateData: any = {
      status: "paid",
      stripe_session_id: paymentIntentId || null
    };
    
    // Add payment method details if available
    if (paymentMethodDetails) {
      updateData.payment_method_type = paymentMethodDetails.type;
      updateData.card_brand = paymentMethodDetails.cardBrand;
      updateData.card_last_four = paymentMethodDetails.cardLast4;
      updateData.payment_method_id = paymentMethodDetails.paymentMethodId;
    }
    
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status:", updateError);
      console.error("Update error details:", {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      throw new Error("Failed to update order status");
    }

    console.log("Order status updated successfully");

    // Create or update contact record and donations (if CRM is enabled)
    try {
      console.log("Checking if CRM is enabled for this organization...");

      // Get order details with organization and event info
      const { data: fullOrderData, error: fullOrderError } = await supabaseClient
        .from("orders")
        .select(`
          *,
          events!inner (
            id,
            organization_id,
            donations_enabled,
            organizations!inner (
              crm_enabled
            )
          )
        `)
        .eq("id", orderId)
        .single();

      if (fullOrderError) {
        console.error("Failed to get full order data:", fullOrderError);
      } else if ((fullOrderData.events as any).organizations.crm_enabled) {
        console.log("CRM is enabled, creating/updating contact...");

        const organizationId = (fullOrderData.events as any).organization_id;
        const customerEmail = fullOrderData.customer_email;
        const customerName = fullOrderData.customer_name || '';
        const customerPhone = fullOrderData.customer_phone;

        // Parse name into first_name and last_name
        const nameParts = customerName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Check if contact already exists
        const { data: existingContact } = await supabaseClient
          .from("contacts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("email", customerEmail)
          .single();

        let contactId: string;

        if (existingContact) {
          console.log("Contact exists, using existing contact ID:", existingContact.id);
          contactId = existingContact.id;

          // Update existing contact with latest info
          await supabaseClient
            .from("contacts")
            .update({
              first_name: firstName,
              last_name: lastName,
              full_name: customerName,
              phone: customerPhone,
              updated_at: new Date().toISOString()
            })
            .eq("id", contactId);

          console.log("Updated existing contact:", contactId);
        } else {
          // Create new contact
          console.log("Creating new contact for:", customerEmail);
          const { data: newContact, error: contactError } = await supabaseClient
            .from("contacts")
            .insert({
              organization_id: organizationId,
              email: customerEmail,
              first_name: firstName,
              last_name: lastName,
              full_name: customerName,
              phone: customerPhone
            })
            .select("id")
            .single();

          if (contactError) {
            console.error("Failed to create contact:", contactError);
          } else {
            contactId = newContact.id;
            console.log("Created new contact:", contactId);
          }
        }

        // Create contact_events entry for attendance tracking
        if (contactId) {
          try {
            await supabaseClient
              .from("contact_events")
              .insert({
                contact_id: contactId,
                event_id: (fullOrderData.events as any).id,
                order_id: orderId,
                ticket_type: 'purchased' // We could enhance this to track specific ticket types
              });
            console.log("Created contact_events entry for attendance tracking");
          } catch (contactEventError) {
            console.error("Failed to create contact_events entry:", contactEventError);
            // Don't fail the whole process for this
          }
        }

        // Handle donations if present and donations are enabled
        const donationAmount = fullOrderData.donation_amount;
        if (contactId && donationAmount && donationAmount > 0 && (fullOrderData.events as any).donations_enabled) {
          console.log("Creating donation record for amount:", donationAmount);

          try {
            const { data: donation, error: donationError } = await supabaseClient
              .from("donations")
              .insert({
                organization_id: organizationId,
                contact_id: contactId,
                order_id: orderId,
                amount: donationAmount,
                currency: 'NZD',
                stripe_payment_id: paymentIntentId,
                payment_status: 'completed',
                donation_date: new Date().toISOString()
              })
              .select("id")
              .single();

            if (donationError) {
              console.error("Failed to create donation record:", donationError);
            } else {
              console.log("Created donation record:", donation.id);
            }
          } catch (donationInsertError) {
            console.error("Donation creation error:", donationInsertError);
            // Don't fail the whole process for donation tracking issues
          }
        } else if (donationAmount && donationAmount > 0) {
          console.log("Donation amount present but donations not enabled for event");
        }

      } else {
        console.log("CRM not enabled for this organization, skipping contact creation");
      }
    } catch (crmError) {
      console.error("CRM processing error:", crmError);
      // Don't fail the whole process for CRM issues
    }

    // Get event information to check ticket delivery method
    console.log("Checking event ticket delivery method...");
    const { data: orderWithEvent, error: orderEventError } = await supabaseClient
      .from("orders")
      .select("event_id, events!inner(ticket_delivery_method)")
      .eq("id", orderId)
      .single();

    if (orderEventError || !orderWithEvent) {
      console.error("Failed to get event delivery method:", orderEventError);
      throw new Error("Failed to get event information");
    }

    const ticketDeliveryMethod = (orderWithEvent.events as any).ticket_delivery_method || 'qr_ticket';
    console.log("Event ticket delivery method:", ticketDeliveryMethod);

    // Get order items
    console.log("Fetching order items...");
    const { data: orderItems, error: orderItemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (orderItemsError) {
      throw new Error(`Order items lookup failed: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      throw new Error("No order items found");
    }

    // Only create tickets if the delivery method is 'qr_ticket'
    let ticketsToCreate = [];
    if (ticketDeliveryMethod === 'qr_ticket') {
      console.log("Creating QR tickets for", orderItems.length, "order items");
      
      // Create tickets for each order item (only for ticket items, not merchandise)
      for (const item of orderItems) {
        if (item.item_type === 'ticket') {
          for (let i = 0; i < item.quantity; i++) {
            // Generate simple ticket code
            const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            ticketsToCreate.push({
              order_item_id: item.id,
              ticket_code: ticketCode,
              status: 'valid',
              checked_in: false
            });
          }
        }
      }
    } else if (ticketDeliveryMethod === 'confirmation_email') {
      console.log("Email confirmation only mode - no tickets will be generated");
    }

    if (ticketsToCreate.length > 0) {
      console.log("Inserting", ticketsToCreate.length, "tickets");
      
      // Try direct insert first (should work with service role)
      try {
        const { data: createdTickets, error: ticketError } = await supabaseClient
          .from("tickets")
          .insert(ticketsToCreate)
          .select();

        if (ticketError) {
          console.error("Direct insert failed:", ticketError);
          throw new Error(`Ticket creation failed: ${ticketError.message}`);
        }
        
        console.log("Successfully created", createdTickets?.length || 0, "tickets via direct insert");
      } catch (insertError) {
        console.error("Ticket creation error:", insertError);
        
        // If direct insert fails, try creating tickets one by one
        console.log("Trying individual ticket creation...");
        let successCount = 0;
        
        for (const ticket of ticketsToCreate) {
          try {
            const { error: singleError } = await supabaseClient
              .from("tickets")
              .insert(ticket);
            
            if (!singleError) {
              successCount++;
            } else {
              console.error("Failed to create individual ticket:", singleError);
            }
          } catch (singleTicketError) {
            console.error("Individual ticket creation failed:", singleTicketError);
          }
        }
        
        if (successCount === 0) {
          throw new Error(`Failed to create any tickets. Success: ${successCount}/${ticketsToCreate.length}`);
        }
        
        console.log(`Created ${successCount}/${ticketsToCreate.length} tickets via individual insert`);
      }
    } else {
      console.log("No tickets to create (merchandise only order)");
    }

    // Send ticket email
    console.log("Sending ticket email...");
    try {
      await supabaseClient.functions.invoke('send-ticket-email-v2', {
        body: { orderId: orderId }
      });
      console.log("Ticket email sent successfully");
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
      // Don't fail the whole process for email issues
    }
    
    // Send organizer notification if enabled
    console.log("Checking for organizer notifications...");
    try {
      // Get event ID from order
      const { data: order } = await supabaseClient
        .from("orders")
        .select("event_id")
        .eq("id", orderId)
        .single();
      
      if (order?.event_id) {
        const { data: eventWithCustomization } = await supabaseClient
          .from("events")
          .select("email_customization")
          .eq("id", order.event_id)
          .single();
        
        if ((eventWithCustomization as any)?.email_customization?.notifications?.organiserNotifications) {
          console.log("Organizer notifications enabled, sending notification...");
          
          // Get order data for notification
          const { data: orderWithItems } = await supabaseClient
            .from("orders")
            .select(`
              *,
              order_items (
                *,
                ticket_types (
                  name,
                  price
                ),
                merchandise (
                  name,
                  price
                )
              )
            `)
            .eq("id", orderId)
            .single();
          
          if (orderWithItems) {
            // Format order data for notification
            const orderData = orderWithItems.order_items.map((item: any) => ({
              type: item.item_type,
              name: item.item_type === 'ticket' ? item.ticket_types?.name : item.merchandise?.name,
              price: item.item_type === 'ticket' ? item.ticket_types?.price : item.merchandise?.price,
              quantity: item.quantity,
              selectedSeats: item.selected_seats || [],
              selectedSize: item.selected_size,
              selectedColor: item.selected_color
            }));
            
            // Get customer info from order
            const customerInfo = {
              name: orderWithItems.customer_name,
              email: orderWithItems.customer_email,
              phone: orderWithItems.customer_phone,
              customAnswers: orderWithItems.custom_answers || {}
            };
            
            await supabaseClient.functions.invoke('send-organiser-notification', {
              body: { 
                eventId: order.event_id,
                orderData,
                customerInfo
              }
            });
            console.log("Organizer notification sent successfully");
          }
        }
      }
    } catch (notificationError) {
      console.log("Organizer notification failed:", notificationError);
      // Don't fail the whole process for notification issues
    }

    // Send promo code notification if promo code was used
    console.log("Checking for promo code usage notification...");
    try {
      const { data: orderWithPromo } = await supabaseClient
        .from("orders")
        .select("promo_code_id")
        .eq("id", orderId)
        .single();

      if (orderWithPromo?.promo_code_id) {
        console.log("Promo code used, sending notification...", orderWithPromo.promo_code_id);

        await supabaseClient.functions.invoke('send-promo-code-notification', {
          body: {
            promoCodeId: orderWithPromo.promo_code_id,
            orderId: orderId
          }
        });
        console.log("Promo code notification sent successfully");
      } else {
        console.log("No promo code used for this order");
      }
    } catch (promoNotificationError) {
      console.log("Promo code notification failed:", promoNotificationError);
      // Don't fail the whole process for notification issues
    }

    // Try to create Xero invoice if auto-sync is enabled
    try {
      console.log("Checking for Xero auto-invoice creation...");
      const { data: event } = await supabaseClient
        .from("events")
        .select("organization_id")
        .eq("id", (await supabaseClient.from("orders").select("event_id").eq("id", orderId).single()).data?.event_id)
        .single();

      if (event) {
        const { data: xeroConnection } = await supabaseClient
          .from("xero_connections")
          .select("sync_settings")
          .eq("organization_id", event.organization_id)
          .eq("connection_status", "connected")
          .single();

        if ((xeroConnection as any)?.sync_settings?.auto_create_invoices) {
          console.log("Creating Xero invoice automatically...");
          await supabaseClient.functions.invoke('xero-sync', {
            body: {
              action: 'createInvoice',
              organizationId: event.organization_id,
              orderId: orderId
            }
          });
          console.log("Xero invoice created successfully");
        }
      }
    } catch (xeroError) {
      console.log("Xero integration failed:", xeroError);
      // Don't fail the whole process for Xero issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Payment completed and tickets created successfully",
      orderId: orderId,
      ticketsCreated: ticketsToCreate.length,
      emailSent: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
