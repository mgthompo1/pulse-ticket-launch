import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { TicketType, CartItem } from '@/types/widget';

interface TicketSelectionProps {
  ticketTypes: TicketType[];
  cartItems: CartItem[];
  onAddToCart: (ticketType: TicketType) => void;
  onNext: () => void;
}

export const TicketSelection: React.FC<TicketSelectionProps> = ({
  ticketTypes,
  cartItems,
  onAddToCart,
  onNext
}) => {
  const hasSelectedTickets = cartItems.some(item => item.quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Your Tickets</h2>
        <p className="text-muted-foreground">Choose the tickets you'd like to purchase</p>
      </div>

      {/* Navigation Button Above Content */}
      <div className="flex justify-end">
        <Button 
          onClick={onNext} 
          disabled={!hasSelectedTickets}
          size="lg"
          className="bg-neutral-900 hover:bg-neutral-800 text-white border-0"
        >
          Continue to Add-ons
        </Button>
      </div>

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => {
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
                    <Badge variant={isAvailable ? "secondary" : "secondary"}>
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
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => onAddToCart(ticketType)}
                      variant="secondary"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white border-0"
                      disabled={ticketType.quantity_available - ticketType.quantity_sold <= 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};