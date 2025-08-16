import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CartItem, MerchandiseCartItem, EventData } from '@/types/widget';

interface OrderSummaryProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  eventData,
  cartItems,
  merchandiseCart
}) => {
  const calculateTicketSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateMerchandiseSubtotal = () => {
    return merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  };

  const subtotal = calculateTicketSubtotal() + calculateMerchandiseSubtotal();
  
  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage 
    ? (subtotal * (eventData.organizations.credit_card_processing_fee_percentage / 100))
    : 0;

  const total = subtotal + processingFee;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{eventData.name}</h3>
          {eventData.venue && (
            <p className="text-sm text-muted-foreground">{eventData.venue}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {new Date(eventData.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <Separator />

        {/* Ticket Items */}
        {cartItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Tickets</h4>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </span>
                  </div>
                </div>
                <p className="font-medium text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Merchandise Items */}
        {merchandiseCart.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Merchandise</h4>
            {merchandiseCart.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.merchandise.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
                    {item.selectedSize && (
                      <Badge variant="outline" className="text-xs">
                        {item.selectedSize}
                      </Badge>
                    )}
                    {item.selectedColor && (
                      <Badge variant="outline" className="text-xs">
                        {item.selectedColor}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ${item.merchandise.price.toFixed(2)} each
                  </span>
                </div>
                <p className="font-medium text-sm">
                  ${(item.merchandise.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {(cartItems.length > 0 || merchandiseCart.length > 0) && (
          <>
            <Separator />
            
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {processingFee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing Fee ({eventData.organizations?.credit_card_processing_fee_percentage}%)</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {cartItems.length === 0 && merchandiseCart.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Your cart is empty</p>
            <p className="text-xs mt-1">Add tickets or merchandise to continue</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};