import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerInfo, CartItem, MerchandiseCartItem, EventData } from '@/types/widget';

interface PaymentProps {
  eventData: EventData;
  cartItems: CartItem[];
  merchandiseCart: MerchandiseCartItem[];
  customerInfo: CustomerInfo;
}

export const Payment: React.FC<PaymentProps> = ({
  eventData,
  cartItems,
  merchandiseCart,
  customerInfo
}) => {

  const calculateTotal = () => {
    const ticketTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseTotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    return ticketTotal + merchandiseTotal;
  };

  const processingFee = eventData.organizations?.credit_card_processing_fee_percentage 
    ? (calculateTotal() * (eventData.organizations.credit_card_processing_fee_percentage / 100))
    : 0;

  const finalTotal = calculateTotal() + processingFee;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment</h2>
        <p className="text-muted-foreground">Your payment will be processed using the order summary on the right</p>
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
    </div>
  );
};