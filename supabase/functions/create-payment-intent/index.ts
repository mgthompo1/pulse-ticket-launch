import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key",
};

serve(async (req) => {
  console.log("=== FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("=== RECEIVED REQUEST BODY ===");
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // Get idempotency key from headers or generate fallback
    const idempotencyKey = req.headers.get('idempotency-key') ||
                           req.headers.get('x-idempotency-key') ||
                           `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log("=== IDEMPOTENCY KEY ===", idempotencyKey);
    
    // Check if this is an attraction payment (simple format) or event payment (complex format)
    const isAttractionPayment = requestBody.amount && requestBody.currency && requestBody.customer_email;
    const isEventPayment = requestBody.eventId && requestBody.items;
    
    console.log("=== PAYMENT TYPE DETECTION ===");
    console.log("Is attraction payment:", isAttractionPayment);
    console.log("Is event payment:", isEventPayment);
    
    if (!isAttractionPayment && !isEventPayment) {
      throw new Error("Invalid request format. Must include either attraction payment fields (amount, currency, customer_email) or event payment fields (eventId, items)");
    }

    const Stripe = await import("https://esm.sh/stripe@14.21.0");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    
    console.log("=== GETTING SECRET KEY ===");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for existing payment intent with this idempotency key
    console.log("=== CHECKING IDEMPOTENCY ===");
    const { data: existingIntent, error: idempotencyError } = await supabaseClient
      .from('payment_intents_log')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingIntent && !idempotencyError) {
      console.log("=== RETURNING CACHED PAYMENT INTENT ===", existingIntent.payment_intent_id);
      return new Response(JSON.stringify({
        success: true,
        paymentIntentId: existingIntent.payment_intent_id,
        client_secret: existingIntent.client_secret,
        orderId: existingIntent.order_id,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("=== NO CACHED INTENT FOUND, PROCEEDING WITH NEW PAYMENT ===");

    let stripeSecretKey: string;
    let currency: string;
    let amountInCents: number;
    let metadata: any = {};
    let orderId: string | null = null;
    let bookingFeesEnabled = false;
    let subtotal = 0;
    let bookingFee = 0;
    let event: any = null;

    if (isAttractionPayment) {
      // Handle attraction payment (simple format)
      console.log("=== PROCESSING ATTRACTION PAYMENT ===");
      
      // Get organization ID from metadata
      const organizationId = requestBody.metadata?.organization_id;
      if (!organizationId) {
        throw new Error("Organization ID is required for attraction payments");
      }

      // Get payment credentials for the organization
      const { data: credentials, error: credError } = await supabaseClient
        .rpc('get_payment_credentials_for_processing', { 
          p_organization_id: organizationId 
        });

      console.log("=== PAYMENT CREDENTIALS DEBUG ===");
      console.log("Credentials query error:", credError);
      console.log("Credentials found:", credentials?.length || 0);
      console.log("Has stripe secret:", credentials?.[0]?.stripe_secret_key ? 'YES' : 'NO');

      if (credError || !credentials || credentials.length === 0) {
        console.error("Credentials error:", credError);
        throw new Error("Payment credentials not found for organization");
      }

      const creds = credentials[0];
      if (!creds.stripe_secret_key) {
        throw new Error("Stripe secret key not configured for this organization");
      }

      stripeSecretKey = creds.stripe_secret_key;
      currency = requestBody.currency.toLowerCase();
      amountInCents = requestBody.amount; // Already in cents from frontend
      metadata = {
        ...requestBody.metadata,
        customerName: requestBody.customer_name,
        customerEmail: requestBody.customer_email,
        paymentType: 'attraction'
      };

      // Create attraction booking in database instead of order
      console.log("=== CREATING ATTRACTION BOOKING ===");
      const bookingData = {
        attraction_id: requestBody.metadata?.attraction_id,
        booking_slot_id: requestBody.metadata?.booking_slot_id, // Fixed: use booking_slot_id instead of booking_id
        organization_id: organizationId,
        customer_name: requestBody.customer_name || "Unknown",
        customer_email: requestBody.customer_email || "unknown@example.com",
        customer_phone: null,
        party_size: requestBody.metadata?.party_size || 1,
        special_requests: requestBody.metadata?.special_requests || null,
        total_amount: amountInCents / 100, // Convert back to dollars for display
        currency: currency.toUpperCase(),
        payment_status: "pending",
        payment_method: "stripe",
        stripe_payment_intent_id: null, // Will be updated after payment intent creation
        booking_status: "pending"
      };

      const { data: booking, error: bookingError } = await supabaseClient
        .from("attraction_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error("Error creating attraction booking:", bookingError);
        throw new Error("Failed to create attraction booking record");
      }

      orderId = booking.id; // Use booking ID for consistency
      console.log("=== ATTRACTION BOOKING CREATED ===", { bookingId: booking.id });
    } else {
      // Handle event payment (existing complex format)
      console.log("=== PROCESSING EVENT PAYMENT ===");

      const {
        eventId,
        items,
        customerInfo,
        attendees,
        total,
        bookingFeesEnabled: requestBookingFeesEnabled,
        subtotal: requestSubtotal,
        bookingFee: requestBookingFee,
        // Tax fields from frontend
        taxData
      } = requestBody;
      
      // Assign to outer scope variables
      bookingFeesEnabled = requestBookingFeesEnabled || false;
      subtotal = requestSubtotal || 0;
      bookingFee = requestBookingFee || 0;
      
      if (!eventId || !items) {
        throw new Error("Missing required parameters: eventId, items");
      }

      // Get event and organization info with booking fee settings
      const { data: eventData, error: eventError } = await supabaseClient
        .from("events")
        .select(`
          id,
          name,
          organization_id,
          organizations (
            id,
            name,
            currency,
            stripe_booking_fee_enabled
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        throw new Error("Event not found");
      }

      event = eventData; // Assign to outer scope variable
      console.log("=== EVENT FOUND ===", event.name);

      // Get payment credentials for the organization
      const { data: credentials, error: credError } = await supabaseClient
        .rpc('get_payment_credentials_for_processing', { 
          p_organization_id: event.organization_id 
        });

      console.log("=== PAYMENT CREDENTIALS DEBUG ===");
      console.log("Credentials query error:", credError);
      console.log("Credentials found:", credentials?.length || 0);
      console.log("Has stripe secret:", credentials?.[0]?.stripe_secret_key ? 'YES' : 'NO');

      if (credError || !credentials || credentials.length === 0) {
        console.error("Credentials error:", credError);
        throw new Error("Payment credentials not found for organization");
      }

      const creds = credentials[0];
      if (!creds.stripe_secret_key) {
        throw new Error("Stripe secret key not configured for this organization");
      }

      stripeSecretKey = creds.stripe_secret_key;

      console.log("=== BOOKING FEE DEBUG ===");
      console.log("Booking fees enabled from request:", bookingFeesEnabled);
      console.log("Booking fees enabled from org:", event.organizations?.stripe_booking_fee_enabled);
      console.log("Subtotal:", subtotal);
      console.log("Booking fee:", bookingFee);

      // Calculate amount in cents - handle both total parameter and calculate from items
      let finalTotal = total;
      console.log("=== TOTAL CALCULATION DEBUG ===");
      console.log("Received total:", total, "type:", typeof total);
      
      if (!finalTotal || finalTotal === 0) {
        // Calculate total from items if not provided
        console.log("=== CALCULATING FROM ITEMS ===");
        console.log("Items array:", JSON.stringify(items, null, 2));
        
        finalTotal = items.reduce((sum: number, item: any) => {
          const itemPrice = item.unit_price || item.price || 0;
          const itemTotal = itemPrice * item.quantity;
          console.log(`Item: ${item.type}, price: ${itemPrice}, qty: ${item.quantity}, subtotal: ${itemTotal}`);
          return sum + itemTotal;
        }, 0);
        console.log("=== CALCULATED TOTAL FROM ITEMS ===", finalTotal);
      }
      
      console.log("=== FINAL TOTAL ===", finalTotal);
      amountInCents = Math.round(finalTotal * 100);
      currency = event.organizations?.currency || "usd";

      // Create order in database first
      console.log("=== CREATING ORDER IN DATABASE ===");
      console.log("=== TAX DATA ===", taxData);

      const orderData = {
        event_id: eventId,
        customer_name: customerInfo?.name || "Unknown",
        customer_email: customerInfo?.email || "unknown@example.com",
        customer_phone: customerInfo?.phone || null,
        total_amount: finalTotal,
        status: "pending",
        custom_answers: customerInfo?.customAnswers || {},
        donation_amount: customerInfo?.donationAmount || 0,
        attendees: attendees || null, // Store attendee details for ticket assignment
        stripe_session_id: null, // Will be updated after payment intent creation

        // Tax fields
        subtotal: taxData?.subtotal ?? subtotal,
        tax_rate: taxData?.tax_rate ?? 0,
        tax_amount: taxData?.tax_amount ?? 0,
        tax_name: taxData?.tax_name ?? null,
        tax_inclusive: taxData?.tax_inclusive ?? false,
        tax_on_tickets: taxData?.tax_on_tickets ?? 0,
        tax_on_addons: taxData?.tax_on_addons ?? 0,
        tax_on_donations: taxData?.tax_on_donations ?? 0,
        tax_on_fees: taxData?.tax_on_fees ?? 0,
        booking_fee: taxData?.booking_fee ?? bookingFee,
        booking_fee_tax: taxData?.booking_fee_tax ?? 0,
      };

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw new Error("Failed to create order record");
      }

      console.log("=== ORDER CREATED ===", { orderId: order.id });
      orderId = order.id;

      // Create order items
      console.log("=== CREATING ORDER ITEMS ===");
      const orderItems = items.map((item: any) => {
        const baseItem = {
          order_id: order.id,
          item_type: item.type || 'ticket',
          quantity: item.quantity,
          unit_price: item.unit_price || item.price,
          merchandise_options: item.type === 'merchandise' ? item.merchandise_options : null
        };

        // Handle ticket items
        if (item.type === 'ticket') {
          return {
            ...baseItem,
            ticket_type_id: item.ticket_type_id,
            merchandise_id: null
          };
        }
        
        // Handle merchandise items
        if (item.type === 'merchandise') {
          return {
            ...baseItem,
            ticket_type_id: null,
            merchandise_id: item.merchandise_id
          };
        }

        // Default to ticket if type is not specified
        return {
          ...baseItem,
          ticket_type_id: item.ticket_type_id,
          merchandise_id: null
        };
      });

      const { error: orderItemsError } = await supabaseClient
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        console.error("Error creating order items:", orderItemsError);
        throw new Error("Failed to create order items");
      }

      console.log("=== ORDER ITEMS CREATED ===", { count: orderItems.length });

      metadata = {
        eventId: eventId,
        orderId: order.id,
        customerName: customerInfo?.name || "Unknown",
        customerEmail: customerInfo?.email || "unknown@example.com",
        itemCount: items?.length || 0,
        paymentType: 'event',
        bookingFeesEnabled: bookingFeesEnabled || false,
        subtotal: subtotal || 0,
        bookingFee: bookingFee || 0
      };
    }

    console.log("=== INITIALIZING STRIPE ===");

    const enableBookingFees = isEventPayment && bookingFeesEnabled && event?.organizations?.stripe_booking_fee_enabled;

    console.log("=== PAYMENT INTENT CREATION MODE ===");
    console.log("Enable booking fees:", enableBookingFees);
    console.log("Amount:", amountInCents, "cents");
    console.log("Currency:", currency);

    // Create Payment Intent for both scenarios
    console.log("=== CREATING PAYMENT INTENT ===");
    console.log("This should NOT be creating any checkout sessions!");
    
    // Add booking fee metadata if enabled
    if (enableBookingFees) {
      metadata.useBookingFees = 'true';
      metadata.ticketAmount = Math.round((subtotal || 0) * 100);
      metadata.bookingFeeAmount = Math.round((bookingFee || 0) * 100);
      console.log("Added booking fee metadata:", {
        useBookingFees: metadata.useBookingFees,
        ticketAmount: metadata.ticketAmount,
        bookingFeeAmount: metadata.bookingFeeAmount
      });
    }

    // Use Connect ONLY when booking fees are enabled AND organization has connected account
    let stripeAccountId = null;
    let transferAmount = amountInCents;
    let useConnectPayment = false;
    
    if (isEventPayment && enableBookingFees && event?.organizations?.stripe_account_id) {
      // Connect is required when booking fees are enabled
      stripeAccountId = event.organizations.stripe_account_id;
      useConnectPayment = true;
      
      const platformFeeAmount = Math.round((bookingFee || 0) * 100);
      transferAmount = amountInCents - platformFeeAmount;
      
      console.log("=== CONNECT PAYMENT WITH BOOKING FEES ===");
      console.log("Total amount:", amountInCents, "cents");
      console.log("Platform fee:", platformFeeAmount, "cents"); 
      console.log("Transfer to organization:", transferAmount, "cents");
    } else if (isEventPayment && enableBookingFees && !event?.organizations?.stripe_account_id) {
      // Booking fees enabled but no connected account - this is an error
      throw new Error("Booking fees require Stripe Connect. Please connect your Stripe account first.");
    } else {
      console.log("=== DIRECT PAYMENT (NO CONNECT) ===");
      console.log("Using organization's Stripe account directly");
      console.log("Booking fees:", enableBookingFees ? "enabled but not passed to customer" : "disabled");
    }

    // Initialize Stripe with the appropriate key
    let stripeKey: string;
    if (useConnectPayment) {
      // Use platform Stripe account for Connect payments
      const platformStripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!platformStripeKey) {
        throw new Error("Platform Stripe secret key not configured");
      }
      stripeKey = platformStripeKey;
      console.log("Using PLATFORM Stripe key for Connect payment");
    } else {
      // Use organization's Stripe account for direct payments
      stripeKey = stripeSecretKey;
      console.log("Using ORGANIZATION Stripe key for direct payment");
    }
    
    const stripe = new Stripe.default(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const paymentIntentParams: any = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: metadata,
      automatic_payment_methods: { enabled: true },
    };

    // Add Connect parameters only if using Connect payment
    if (useConnectPayment && stripeAccountId) {
      paymentIntentParams.on_behalf_of = stripeAccountId;
      paymentIntentParams.transfer_data = {
        destination: stripeAccountId,
        amount: transferAmount,
      };
      console.log("=== CREATING CONNECT PAYMENT INTENT ===");
      console.log("Connected account:", stripeAccountId);
      console.log("Transfer amount:", transferAmount, "cents");
    } else {
      console.log("=== CREATING DIRECT PAYMENT INTENT ===");
      console.log("Payment goes directly to organization's Stripe account");
    }
    
    console.log("About to create Payment Intent with params:", paymentIntentParams);
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
      idempotencyKey: idempotencyKey // Use Stripe's built-in idempotency
    });

    console.log("=== PAYMENT INTENT CREATED ===", paymentIntent.id);

    // Log the payment intent for future idempotency checks
    console.log("=== LOGGING PAYMENT INTENT ===");
    const { error: logError } = await supabaseClient
      .from('payment_intents_log')
      .insert({
        idempotency_key: idempotencyKey,
        order_id: orderId,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: amountInCents / 100,
        currency: currency.toLowerCase(),
        metadata: metadata
      });

    if (logError) {
      console.error("Error logging payment intent:", logError);
      // Don't fail the whole process for this logging error
    } else {
      console.log("✅ Payment intent logged successfully");
    }

    // Update record with Stripe payment intent ID if we have an order/booking
    if (orderId) {
      if (isAttractionPayment) {
        // Update attraction booking with Stripe payment intent ID
        const { error: updateError } = await supabaseClient
          .from("attraction_bookings")
          .update({ stripe_payment_intent_id: paymentIntent.id })
          .eq("id", orderId);

        if (updateError) {
          console.error("Error updating attraction booking with Stripe payment intent ID:", updateError);
          // Don't fail the whole process for this update error
        }
      } else {
        // Update order with Stripe payment intent ID in stripe_session_id field
        const { error: updateError } = await supabaseClient
          .from("orders")
          .update({ stripe_session_id: paymentIntent.id })
          .eq("id", orderId);

        if (updateError) {
          console.error("Error updating order with Stripe payment intent ID:", updateError);
          // Don't fail the whole process for this update error
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      paymentIntentId: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      orderId: orderId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== DETAILED ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error type:", error.constructor.name);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    
    // Log the error details for debugging
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.statusCode) {
      console.error("Status code:", error.statusCode);
    }
    if (error.raw) {
      console.error("Raw error:", error.raw);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.constructor.name,
      code: error.code || 'UNKNOWN'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});