import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { CustomerInfo, CartItem, MerchandiseCartItem, EventData } from '@/types/widget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PaymentProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: CustomerInfo;
  onBack: () => void;
}

export const Payment: React.FC<PaymentProps> = ({
  eventData,
  cartItems,
  merchandiseCart,
  customerInfo,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateTotal = () => {
    const ticketTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseTotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    return ticketTotal + merchandiseTotal;
  };

  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage 
    ? (calculateTotal() * (eventData.organizations.credit_card_processing_fee_percentage / 100))
    : 0;

  const finalTotal = calculateTotal() + processingFee;

  const handlePayment = async () => {
    if (!eventData.organizations?.payment_provider) {
      toast({
        title: "Payment Error",
        description: "Payment provider not configured for this event.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order items
      const items = [
        ...cartItems.map(item => ({
          type: 'ticket' as const,
          ticket_type_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        ...merchandiseCart.map(item => ({
          type: 'merchandise' as const,
          merchandise_id: item.merchandise.id,
          quantity: item.quantity,
          unit_price: item.merchandise.price,
          merchandise_options: {
            size: item.selectedSize,
            color: item.selectedColor,
          },
        })),
      ];

      if (eventData.organizations.payment_provider === 'windcave') {
        const { data, error } = await supabase.functions.invoke('windcave-session', {
          body: {
            eventId: eventData.id,
            items,
            customerInfo,
          },
        });

        if (error) throw error;

        if (data.links) {
          const redirectLink = data.links.find((link: any) => link.rel === 'redirect');
          if (redirectLink) {
            window.location.href = redirectLink.href;
          }
        }
      } else if (eventData.organizations.payment_provider === 'stripe') {
        // Implement Stripe payment flow
        toast({
          title: "Stripe Integration",
          description: "Stripe payment integration coming soon.",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment</h2>
        <p className="text-muted-foreground">Complete your order by proceeding to payment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
              </div>
              <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}

          {merchandiseCart.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.merchandise.name}</p>
                <p className="text-sm text-muted-foreground">
                  Quantity: {item.quantity}
                  {item.selectedSize && ` • Size: ${item.selectedSize}`}
                  {item.selectedColor && ` • Color: ${item.selectedColor}`}
                </p>
              </div>
              <p className="font-medium">${(item.merchandise.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}

          <div className="border-t pt-4">
            <div className="flex justify-between">
              <p>Subtotal</p>
              <p>${calculateTotal().toFixed(2)}</p>
            </div>
            {processingFee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <p>Processing Fee ({eventData.organizations?.credit_card_processing_fee_percentage}%)</p>
                <p>${processingFee.toFixed(2)}</p>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <p>Total</p>
              <p>${finalTotal.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {customerInfo.name}</p>
            <p><span className="font-medium">Email:</span> {customerInfo.email}</p>
            {customerInfo.phone && <p><span className="font-medium">Phone:</span> {customerInfo.phone}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg" disabled={isProcessing}>
          Back to Details
        </Button>
        <Button 
          onClick={handlePayment} 
          size="lg" 
          disabled={isProcessing}
          className="min-w-[140px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${finalTotal.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
};