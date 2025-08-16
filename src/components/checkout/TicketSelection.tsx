import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus } from 'lucide-react';
import { TicketType, CartItem } from '@/types/widget';

interface TicketSelectionProps {
  ticketTypes: TicketType[];
  cartItems: CartItem[];
  onUpdateQuantity: (ticketTypeId: string, quantity: number) => void;
  onNext: () => void;
}

export const TicketSelection: React.FC<TicketSelectionProps> = ({
  ticketTypes,
  cartItems,
  onUpdateQuantity,
  onNext
}) => {
  const getCartQuantity = (ticketTypeId: string) => {
    const item = cartItems.find(item => item.id === ticketTypeId);
    return item?.quantity || 0;
  };

  const hasSelectedTickets = cartItems.some(item => item.quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Your Tickets</h2>
        <p className="text-muted-foreground">Choose the tickets you'd like to purchase</p>
      </div>

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => {
          const quantity = getCartQuantity(ticketType.id);
          const isAvailable = ticketType.quantity_available > ticketType.quantity_sold;
          
          return (
            <Card key={ticketType.id} className={!isAvailable ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{ticketType.name}</CardTitle>
                    {ticketType.description && (
                      <CardDescription className="mt-1">
                        {ticketType.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${ticketType.price}</div>
                    <Badge variant={isAvailable ? "default" : "secondary"}>
                      {isAvailable 
                        ? `${ticketType.quantity_available - ticketType.quantity_sold} available`
                        : 'Sold out'
                      }
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {isAvailable && (
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(ticketType.id, Math.max(0, quantity - 1))}
                        disabled={quantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(ticketType.id, quantity + 1)}
                        disabled={quantity >= (ticketType.quantity_available - ticketType.quantity_sold)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={onNext} 
          disabled={!hasSelectedTickets}
          size="lg"
        >
          Continue to Add-ons
        </Button>
      </div>
    </div>
  );
};