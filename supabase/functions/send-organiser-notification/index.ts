import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { eventId, orderData, customerInfo, orderId } = body

    // Handle both old format (eventId, orderData, customerInfo) and new format (orderId)
    let event: Record<string, any> | null = null
    let finalOrderData: Array<Record<string, any>> = []
    let finalCustomerInfo: Record<string, any> = {}

    if (orderId) {
      // New format - fetch all data from orderId
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get order with all related data
      const { data: orderWithDetails, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          events!inner(
            *,
            organizations (
              name,
              logo_url
            )
          ),
          order_items!inner(
            *,
            ticket_types(name, price, description),
            merchandise(name, price, description)
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !orderWithDetails) {
        throw new Error(`Order not found: ${orderId}`)
      }

      event = orderWithDetails.events
      finalCustomerInfo = {
        name: orderWithDetails.customer_name,
        email: orderWithDetails.customer_email,
        phone: orderWithDetails.customer_phone,
        customAnswers: orderWithDetails.custom_answers || {}
      }

      // Transform order_items to expected format
      finalOrderData = (orderWithDetails.order_items as Array<Record<string, any>>).map((item: Record<string, any>) => ({
        type: item.item_type,
        name: item.ticket_types?.name || item.merchandise?.name || 'Unknown Item',
        price: item.unit_price,
        quantity: item.quantity,
        selectedSeats: item.selected_seats || [],
        selectedSize: item.selected_size,
        selectedColor: item.selected_color
      }))

    } else if (eventId && orderData && customerInfo) {
      // Old format - use provided data
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get event and organization details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          organizations (
            name,
            logo_url
          )
        `)
        .eq('id', eventId)
        .single()

      if (eventError || !eventData) {
        throw new Error('Event not found')
      }

      event = eventData
      finalOrderData = orderData
      finalCustomerInfo = customerInfo
    } else {
      throw new Error('Missing required parameters. Provide either orderId or (eventId, orderData, customerInfo)')
    }

    // Event data is already loaded above

    // Check if organizer notifications are enabled
    const emailCustomization = event.email_customization || {}
    const notifications = emailCustomization.notifications || {}
    
    if (!notifications.organiserNotifications || !notifications.organiserEmail) {
      console.log('Organizer notifications not enabled for this event')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notifications not enabled' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const organizerEmail = notifications.organiserEmail

    // Calculate order summary
    const ticketItems = finalOrderData.filter((item: Record<string, any>) => item.type === 'ticket')
    const merchandiseItems = finalOrderData.filter((item: Record<string, any>) => item.type === 'merchandise')

    const ticketTotal = ticketItems.reduce((sum: number, item: Record<string, any>) => sum + (Number(item.price) * Number(item.quantity)), 0)
    const merchandiseTotal = merchandiseItems.reduce((sum: number, item: Record<string, any>) => sum + (Number(item.price) * Number(item.quantity)), 0)
    const subtotal = ticketTotal + merchandiseTotal

    // Generate email content
    const emailSubject = `New Ticket Sale - ${event.name}`
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Ticket Sale</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .order-summary { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .customer-info { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .ticket-item { padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .ticket-item:last-child { border-bottom: none; }
          .total { font-weight: bold; font-size: 18px; padding: 15px 0; border-top: 2px solid #e9ecef; }
          .badge { display: inline-block; padding: 4px 8px; background-color: #28a745; color: white; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #333;">🎫 New Ticket Sale!</h1>
            <p style="margin: 10px 0 0 0; color: #666;">You have a new ticket sale for your event.</p>
          </div>

          <div class="order-summary">
            <h2 style="margin-top: 0;">Order Summary</h2>
            
            ${ticketItems.length > 0 ? `
              <h3>Tickets</h3>
              ${ticketItems.map((item: Record<string, any>) => `
                <div class="ticket-item">
                  <strong>${item.name}</strong><br>
                  Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
                  ${item.selectedSeats && item.selectedSeats.length > 0 ? `<br>Seats: ${item.selectedSeats.join(', ')}` : ''}
                </div>
              `).join('')}
            ` : ''}

            ${merchandiseItems.length > 0 ? `
              <h3>Merchandise</h3>
              ${merchandiseItems.map((item: Record<string, any>) => `
                <div class="ticket-item">
                  <strong>${item.name}</strong><br>
                  Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
                  ${item.selectedSize ? `<br>Size: ${item.selectedSize}` : ''}
                  ${item.selectedColor ? `<br>Color: ${item.selectedColor}` : ''}
                </div>
              `).join('')}
            ` : ''}

            <div class="total">
              Subtotal: $${subtotal.toFixed(2)}<br>
              Total: $${subtotal.toFixed(2)}
            </div>
          </div>

          <div class="customer-info">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${finalCustomerInfo.name}</p>
            <p><strong>Email:</strong> ${finalCustomerInfo.email}</p>
            ${finalCustomerInfo.phone ? `<p><strong>Phone:</strong> ${finalCustomerInfo.phone}</p>` : ''}
            ${finalCustomerInfo.customAnswers ? `
              <h4>Custom Questions:</h4>
              ${Object.entries(finalCustomerInfo.customAnswers).map(([question, answer]) => `
                <p><strong>${question}:</strong> ${answer}</p>
              `).join('')}
            ` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
              This notification was sent automatically by TicketFlo.<br>
              Event: <strong>${event.name}</strong><br>
              Date: ${new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    const emailText = `
New Ticket Sale - ${event.name}

Order Summary:
${ticketItems.length > 0 ? `
Tickets:
${ticketItems.map((item: Record<string, any>) =>
  `${item.name} - Quantity: ${item.quantity} × $${Number(item.price).toFixed(2)} = $${(Number(item.quantity) * Number(item.price)).toFixed(2)}${item.selectedSeats && Array.isArray(item.selectedSeats) && item.selectedSeats.length > 0 ? ` - Seats: ${item.selectedSeats.join(', ')}` : ''}`
).join('\n')}
` : ''}
${merchandiseItems.length > 0 ? `
Merchandise:
${merchandiseItems.map((item: Record<string, any>) =>
  `${item.name} - Quantity: ${item.quantity} × $${Number(item.price).toFixed(2)} = $${(Number(item.quantity) * Number(item.price)).toFixed(2)}${item.selectedSize ? ` - Size: ${item.selectedSize}` : ''}${item.selectedColor ? ` - Color: ${item.selectedColor}` : ''}`
).join('\n')}
` : ''}

Subtotal: $${subtotal.toFixed(2)}
Total: $${subtotal.toFixed(2)}

Customer Information:
Name: ${finalCustomerInfo.name}
Email: ${finalCustomerInfo.email}
${finalCustomerInfo.phone ? `Phone: ${finalCustomerInfo.phone}` : ''}
${finalCustomerInfo.customAnswers ? `
Custom Questions:
${Object.entries(finalCustomerInfo.customAnswers).map(([question, answer]) => `${question}: ${answer}`).join('\n')}
` : ''}

---
This notification was sent automatically by TicketFlo.
Event: ${event.name}
Date: ${new Date().toLocaleDateString()}
    `

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TicketFlo <notifications@ticketflo.org>',
        to: [organizerEmail],
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorData}`)
    }

    console.log(`Organizer notification sent to ${organizerEmail} for event ${eventId}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Organizer notification sent successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error sending organizer notification:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})