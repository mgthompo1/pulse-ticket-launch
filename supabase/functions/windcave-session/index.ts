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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();
    console.log("=== RAW REQUEST BODY ===");
    console.log("Full request body:", JSON.stringify(requestBody, null, 2));
    
    const { eventId, attractionId, bookingId, items, customerInfo, isAttraction } = requestBody;
    
    console.log("=== PARSED REQUEST DATA ===");
    console.log("eventId:", eventId);
    console.log("attractionId:", attractionId);
    console.log("bookingId:", bookingId);
    console.log("isAttraction:", isAttraction, "(type:", typeof isAttraction, ")");
    console.log("items:", JSON.stringify(items, null, 2));
    console.log("customerInfo:", JSON.stringify(customerInfo, null, 2));

    // Validate parameters based on mode
    if (isAttraction) {
      if (!attractionId || !bookingId || !items || !Array.isArray(items) || items.length === 0) {
        console.error("Missing required parameters for attraction:", { attractionId, bookingId, items: items ? items.length : 'null', isArray: Array.isArray(items) });
        throw new Error("Missing required parameters: attractionId, bookingId, items");
      }
    } else {
      if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
        console.error("Missing required parameters for event:", { eventId, items: items ? items.length : 'null', isArray: Array.isArray(items) });
        throw new Error("Missing required parameters: eventId, items");
      }
    }

    let organizationData;
    let organizationId;

    if (isAttraction) {
      // Get attraction and organization details
      const { data: attraction, error: attractionError } = await supabaseClient
        .from("attractions")
        .select(`
          *,
          organizations!inner(
            payment_provider,
            currency
          )
        `)
        .eq("id", attractionId)
        .single();

      if (attractionError || !attraction) {
        throw new Error("Attraction not found");
      }

      organizationData = attraction.organizations;
      organizationId = attraction.organization_id;
    } else {
      // Get event and organization details
      const { data: event, error: eventError } = await supabaseClient
        .from("events")
        .select(`
          *,
          organizations!inner(
            payment_provider,
            currency
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      organizationData = event.organizations;
      organizationId = event.organization_id;
    }

    // Get payment credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from("payment_credentials")
      .select("windcave_username, windcave_api_key, windcave_endpoint, windcave_enabled")
      .eq("organization_id", organizationId)
      .single();

    if (credError || !credentials) {
      throw new Error("Payment credentials not found");
    }

    if (!credentials.windcave_enabled || organizationData.payment_provider !== "windcave") {
      throw new Error("Windcave not configured for this organization");
    }

    if (!credentials.windcave_username || !credentials.windcave_api_key) {
      throw new Error("Windcave credentials not configured");
    }

    // Calculate total amount - handle both 'price' and 'unit_price' property names
    console.log("=== CALCULATING TOTAL AMOUNT ===");
    const totalAmount = items.reduce((sum: number, item: any) => {
      const price = item.price || item.unit_price || 0;
      const quantity = item.quantity || 0;
      
      console.log(`Item debug:`, {
        type: item.type,
        id: item.id || item.ticket_type_id || item.merchandise_id,
        price: price,
        quantity: quantity,
        rawItem: item
      });
      
      const itemTotal = parseFloat(price.toString()) * parseInt(quantity.toString());
      console.log(`Item: ${item.type || 'ticket'}, Price: ${price}, Quantity: ${quantity}, Total: ${itemTotal}`);
      
      if (isNaN(itemTotal)) {
        console.error("Invalid item total calculation:", { price, quantity, itemTotal, item });
        throw new Error(`Invalid item data: price=${price}, quantity=${quantity}`);
      }
      
      return sum + itemTotal;
    }, 0);
    
    console.log("Final total amount:", totalAmount);
    
    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error("Invalid total amount:", totalAmount);
      throw new Error(`Invalid total amount: ${totalAmount}`);
    }

    // Windcave API endpoint
    const windcaveEndpoint = credentials.windcave_endpoint === "SEC" 
      ? "https://sec.windcave.com/api/v1/sessions"
      : "https://uat.windcave.com/api/v1/sessions";

    // Create Windcave session - following documentation format
    const orgCurrency = organizationData.currency || "NZD";
    const merchantRef = isAttraction 
      ? `attraction-${attractionId}-${Date.now()}`
      : `event-${eventId}-${Date.now()}`;
    const sessionData = {
      type: "purchase",
      amount: totalAmount.toFixed(2), // Windcave expects decimal format, not cents
      currency: orgCurrency,
      merchantReference: merchantRef,
      language: "en",
      callbackUrls: {
        approved: `${req.headers.get("origin")}/payment-success`,
        declined: `${req.headers.get("origin")}/payment-failed`,
        cancelled: `${req.headers.get("origin")}/payment-cancelled`
      }
      // Remove notificationUrl for drop-in implementation
    };

    console.log("=== WINDCAVE API REQUEST ===");
    console.log("Endpoint:", windcaveEndpoint);
    console.log("Request payload:", JSON.stringify(sessionData, null, 2));
    console.log("Authorization header:", `Basic ${btoa(`${credentials.windcave_username}:${credentials.windcave_api_key}`)}`);

    const windcaveResponse = await fetch(windcaveEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${credentials.windcave_username}:${credentials.windcave_api_key}`)}`
      },
      body: JSON.stringify(sessionData)
    });

    console.log("=== WINDCAVE API RESPONSE ===");
    console.log("Status:", windcaveResponse.status);
    console.log("Status Text:", windcaveResponse.statusText);
    console.log("Headers:", Object.fromEntries(windcaveResponse.headers.entries()));

    const windcaveResult = await windcaveResponse.json();
    console.log("Response body:", JSON.stringify(windcaveResult, null, 2));

    if (!windcaveResponse.ok) {
      console.error("Windcave API error - Status:", windcaveResponse.status);
      console.error("Windcave API error - Body:", windcaveResult);
      throw new Error(`Windcave API error (${windcaveResponse.status}): ${windcaveResult.message || windcaveResult.error || "Unknown error"}`);
    }

    console.log("Windcave session created:", windcaveResult);

    // Check if we have the expected response structure
    if (!windcaveResult.id) {
      console.error("Missing session ID in Windcave response:", windcaveResult);
      throw new Error("Invalid Windcave response: Missing session ID");
    }

    // For Drop-In implementation, we return the full links array instead of extracting redirect URL
    if (!windcaveResult.links || !Array.isArray(windcaveResult.links)) {
      console.error("Missing links array in Windcave response:", windcaveResult);
      throw new Error("Invalid Windcave response: Missing links array");
    }

    console.log("Links array received:", JSON.stringify(windcaveResult.links, null, 2));

    let recordId; // Will store either booking ID or order ID

    if (isAttraction) {
      // For attractions, try to update the existing booking with Windcave session ID
      // Handle case where windcave_session_id column might not exist yet
      try {
        const { data: booking, error: bookingError } = await supabaseClient
          .from("attraction_bookings")
          .update({
            windcave_session_id: windcaveResult.id
          })
          .eq("id", bookingId)
          .select()
          .single();

        if (bookingError) {
          console.error("Error updating attraction booking:", bookingError);
          // If the column doesn't exist, we'll continue without storing the session ID in the booking
          if (bookingError.message?.includes('column "windcave_session_id" of relation "attraction_bookings" does not exist')) {
            console.warn("windcave_session_id column does not exist in attraction_bookings table. Continuing without storing session ID.");
            // Get the booking without updating it
            const { data: existingBooking, error: fetchError } = await supabaseClient
              .from("attraction_bookings")
              .select()
              .eq("id", bookingId)
              .single();
            
            if (fetchError) {
              throw new Error("Failed to fetch booking details");
            }
            recordId = existingBooking.id;
          } else {
            throw new Error("Failed to update booking with session ID");
          }
        } else {
          console.log("Attraction booking updated with session ID:", booking);
          recordId = booking.id;
        }
      } catch (updateError) {
        console.error("Exception updating attraction booking:", updateError);
        // Fallback: just get the booking ID without updating
        const { data: existingBooking, error: fetchError } = await supabaseClient
          .from("attraction_bookings")
          .select()
          .eq("id", bookingId)
          .single();
        
        if (fetchError) {
          throw new Error("Failed to fetch booking details");
        }
        recordId = existingBooking.id;
        console.warn("Continuing without storing windcave session ID in booking record");
      }
    } else {
      // For events, store the order in the database with custom answers
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert({
          event_id: eventId,
          customer_name: customerInfo?.name || "Anonymous",
          customer_email: customerInfo?.email || "noemail@example.com",
          customer_phone: customerInfo?.phone || null,
          total_amount: totalAmount,
          status: "pending",
          custom_answers: customerInfo?.customAnswers || {},
          windcave_session_id: windcaveResult.id // Store Windcave session ID in the correct field
        })
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw new Error("Failed to create order");
      }

      console.log("Order created:", order);
      recordId = order.id;
    }

    // Create order items for events only (attractions don't need order items)
    if (!isAttraction) {
      const orderItems = [];
    
    for (const item of items) {
      const price = item.price || item.unit_price || 0;
      
      if (item.type === 'merchandise') {
        // Merchandise item
        orderItems.push({
          order_id: recordId,
          merchandise_id: item.merchandise_id || item.id,
          item_type: 'merchandise',
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(price.toString()),
          merchandise_options: {
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor
          }
        });
      } else {
        // Ticket item (default/legacy)
        orderItems.push({
          order_id: recordId,
          ticket_type_id: item.ticket_type_id || item.id,
          item_type: 'ticket',
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(price.toString())
        });
      }
    }

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

      if (orderItemsError) {
        console.error("Error creating order items:", orderItemsError);
        throw new Error("Failed to create order items");
      }

      // Track usage for billing (platform fees) - events only
      try {
        await supabaseClient.functions.invoke('track-usage', {
          body: {
            order_id: recordId,
            organization_id: organizationId,
            transaction_amount: totalAmount
          }
        });
        console.log('Usage tracked for billing');
      } catch (usageError) {
        console.error('Error tracking usage:', usageError);
        // Don't fail the order creation if usage tracking fails
      }
    }

    return new Response(JSON.stringify({
      sessionId: windcaveResult.id,
      links: windcaveResult.links.map(link => ({
        ...link,
        sessionId: windcaveResult.id // Add session ID to each link for easy access
      })),
      orderId: recordId, // Use recordId which works for both orders and bookings
      totalAmount: totalAmount,
      windcaveResponse: windcaveResult,
      debug: {
        state: windcaveResult.state,
        linksCount: windcaveResult.links?.length || 0,
        sessionId: windcaveResult.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Windcave session error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});