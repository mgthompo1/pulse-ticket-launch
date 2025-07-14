import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Mail, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateOrderStatus = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(location.search);
        const sessionId = urlParams.get('sessionId');
        const merchantReference = urlParams.get('merchantReference');
        
        console.log('Payment success params:', { sessionId, merchantReference });

        if (sessionId || merchantReference) {
          // Find the order using the session ID
          const { data: order, error } = await supabase
            .from('orders')
            .select('*, events(name, event_date)')
            .eq('stripe_session_id', sessionId) // We stored Windcave session ID in this field
            .single();

          if (error) {
            console.error('Error finding order:', error);
          } else if (order) {
            // Update order status to completed
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: 'completed' })
              .eq('id', order.id);

            if (updateError) {
              console.error('Error updating order:', updateError);
            } else {
              setOrderDetails(order);
            }
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
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Tickets
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;