import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Mail, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TicketDisplay } from "@/components/TicketDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingTickets, setDownloadingTickets] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showTickets, setShowTickets] = useState(false);

  const loadTickets = async () => {
    if (!orderDetails) return;
    
    try {
      // Get tickets for this order
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*, tickets(*), ticket_types(name)')
        .eq('order_id', orderDetails.id);

      if (orderItemsError) {
        console.error('Error fetching tickets:', orderItemsError);
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        console.error('No tickets found for this order');
        return;
      }

      // Format tickets for display
      const formattedTickets = orderItems.flatMap(item => 
        item.tickets.map((ticket: any) => ({
          ...ticket,
          ticketTypeName: item.ticket_types.name,
          eventName: orderDetails.events?.name,
          eventDate: orderDetails.events?.event_date,
          customerName: orderDetails.customer_name
        }))
      );

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const viewTickets = async () => {
    await loadTickets();
    setShowTickets(true);
  };

  const printTickets = () => {
    window.print();
  };

  useEffect(() => {
    const updateOrderStatus = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(location.search);
        const sessionId = urlParams.get('sessionId');
        const merchantReference = urlParams.get('merchantReference');
        const orderId = urlParams.get('orderId');
        
        console.log('Payment success params:', { sessionId, merchantReference, orderId });
        console.log('Full URL search:', location.search);

        if (sessionId || merchantReference || orderId) {
          // Try to find the order by different parameters
          let order = null;
          
          // First try to find by orderId (for Stripe payments)
          if (orderId) {
            const { data: orderById, error: orderError } = await supabase
              .from('orders')
              .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, organizations(logo_url, name))')
              .eq('id', orderId)
              .single();

            if (!orderError && orderById) {
              order = orderById;
              console.log('Found order by order ID:', order.id);
            }
          }
          
          // Then try to find by windcave_session_id (for Windcave payments)
          if (sessionId) {
            const { data: orderBySession, error: sessionError } = await supabase
              .from('orders')
              .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, organizations(logo_url, name))')
              .eq('windcave_session_id', sessionId)
              .single();

            if (!sessionError && orderBySession) {
              order = orderBySession;
              console.log('Found order by session ID:', order.id);
            }
          }

          // If not found by session, try to find the most recent completed order
          if (!order) {
            console.log('Trying to find most recent completed order...');
            const { data: recentOrder, error: recentError } = await supabase
              .from('orders')
              .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, organizations(logo_url, name))')
              .in('status', ['completed', 'paid'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!recentError && recentOrder) {
              order = recentOrder;
              console.log('Found most recent completed order:', order.id);
            }
          }

          if (order) {
            setOrderDetails(order);
            console.log('Order details set:', order);
          } else {
            console.error('No order found');
          }
        } else {
          console.log('No session parameters found, looking for most recent order...');
          // If no URL params, show the most recent completed order
          const { data: recentOrder, error: recentError } = await supabase
            .from('orders')
            .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, organizations(logo_url, name))')
            .in('status', ['completed', 'paid'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!recentError && recentOrder) {
            setOrderDetails(recentOrder);
            console.log('Showing most recent order:', recentOrder.id);
          }
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
      } finally {
        setLoading(false);
      }
    };

    updateOrderStatus();
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your tickets have been confirmed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderDetails && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{orderDetails.events?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>Confirmation sent to {orderDetails.customer_email}</span>
              </div>
              <div className="bg-accent/50 p-3 rounded-lg">
                <p className="text-sm font-medium">Order Total: ${orderDetails.total_amount}</p>
                <p className="text-xs text-muted-foreground">Order ID: {orderDetails.id}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate('/')}>
              Return to Home
            </Button>
            <Dialog open={showTickets} onOpenChange={setShowTickets}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" onClick={viewTickets}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Tickets
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Your Tickets</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {tickets.map((ticket, index) => (
                    <div key={ticket.id} className="print:break-after-page">
                      <TicketDisplay 
                        ticket={ticket}
                        eventDetails={{
                          venue: orderDetails?.events?.venue,
                          logo_url: orderDetails?.events?.logo_url,
                          description: orderDetails?.events?.description
                        }}
                        organizationDetails={{
                          logo_url: orderDetails?.events?.organizations?.logo_url,
                          name: orderDetails?.events?.organizations?.name
                        }}
                        ticketCustomization={orderDetails?.events?.ticket_customization || {
                          content: {
                            showLogo: true,
                            logoSource: "event",
                            customLogoUrl: ""
                          }
                        }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-4 print:hidden">
                    <Button onClick={printTickets} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Print/Save Tickets
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;