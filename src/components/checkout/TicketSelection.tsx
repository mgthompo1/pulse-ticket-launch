import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { TicketType, CartItem } from '@/types/widget';
import { GuestSeatSelector } from '@/components/GuestSeatSelector';
import { createClient } from '@supabase/supabase-js';
import { Theme } from '@/types/theme';

interface TicketSelectionProps {
  ticketTypes: TicketType[];
  cartItems: CartItem[];
  onAddToCart: (ticketType: TicketType) => void;
  onNext: () => void;
  theme: Theme;
}

export const TicketSelection: React.FC<TicketSelectionProps> = ({
  ticketTypes,
  cartItems,
  onAddToCart,
  onNext,
  theme
}) => {
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [pendingSeatSelection, setPendingSeatSelection] = useState<TicketType | null>(null);
  
  
  // Create anonymous Supabase client for seat map queries
  const anonymousSupabase = createClient(
    "https://yoxsewbpoqxscsutqlcb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const hasSelectedTickets = cartItems.some(item => item.quantity > 0);

  const addToCartWithSeatCheck = async (ticketType: TicketType) => {
    console.log("=== SEAT MAP CHECK DEBUG ===");
    console.log("Ticket Type:", ticketType);
    console.log("Event ID:", ticketType.event_id);
    
    // First check if seat maps are enabled in event customization
    // We need to get the event data to check this
    const { data: eventData, error: eventError } = await anonymousSupabase
      .from('events')
      .select('widget_customization')
      .eq('id', ticketType.event_id)
      .single();

    if (eventError) {
      console.error("Error fetching event data:", eventError);
      // Fallback: add directly to cart
      onAddToCart(ticketType);
      return;
    }

    const seatMapsEnabled = eventData?.widget_customization?.seatMaps?.enabled;
    console.log("Seat maps enabled in customization:", seatMapsEnabled);
    
    // Only check for seat maps if they're enabled in customization
    if (seatMapsEnabled) {
      console.log("Checking for seat maps in database...");
      
      const { data: seatMaps, error: seatMapError } = await anonymousSupabase
        .from('seat_maps')
        .select('id, name, total_seats')
        .eq('event_id', ticketType.event_id);

      console.log("Seat maps query result:", seatMaps);
      console.log("Seat maps query error:", seatMapError);
      console.log("Number of seat maps found:", seatMaps?.length || 0);

      if (seatMaps && seatMaps.length > 0) {
        // Event has seating - show seat selector
        console.log("🎫 Found seat maps, showing seat selection");
        setPendingSeatSelection(ticketType);
        setShowSeatSelection(true);
        return;
      }
    }

    console.log("❌ Seat maps disabled or not found, adding directly to cart");
    // No seating or seat maps disabled - add directly to cart
    onAddToCart(ticketType);
  };

  const handleSeatsSelected = (seats: string[]) => {
    if (pendingSeatSelection) {
      // Add to cart with selected seats
      const ticketWithSeats = {
        ...pendingSeatSelection,
        selectedSeats: seats
      };
      onAddToCart(ticketWithSeats);
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  const handleSkipSeatSelection = () => {
    if (pendingSeatSelection) {
      // Add to cart without seat selection
      onAddToCart(pendingSeatSelection);
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.headerTextColor }}>Select Your Tickets</h2>
        <p style={{ color: theme.bodyTextColor }}>Choose the tickets you'd like to purchase</p>
      </div>

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => {
          const isAvailable = ticketType.quantity_available > ticketType.quantity_sold;
          
          return (
            <Card key={ticketType.id} className={!isAvailable ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                                        <CardTitle className="text-lg" style={{ color: theme.headerTextColor }}>{ticketType.name}</CardTitle>
                    {ticketType.description && (
                      <CardDescription className="mt-1" style={{ color: theme.bodyTextColor }}>
                        {ticketType.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: theme.headerTextColor }}>${ticketType.price}</div>
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
                      onClick={() => addToCartWithSeatCheck(ticketType)}
                      variant="secondary"
                      className="border-0"
                      disabled={ticketType.quantity_available - ticketType.quantity_sold <= 0}
                      style={{ 
                        backgroundColor: theme.primaryColor,
                        color: theme.buttonTextColor
                      }}
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

      {/* Navigation Button Below Content */}
      <div className="flex justify-end pt-6">
        <Button 
          onClick={onNext} 
          disabled={!hasSelectedTickets}
          size="lg"
          className="border-0"
          style={{ 
            backgroundColor: theme.primaryColor,
                                color: theme.buttonTextColor
          }}
        >
          Continue to Add-ons
        </Button>
      </div>

      {/* Seat Selection Modal */}
      {showSeatSelection && pendingSeatSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <GuestSeatSelector
              eventId={pendingSeatSelection.event_id}
              ticketTypeId={pendingSeatSelection.id}
              requestedQuantity={1}
              onSeatsSelected={handleSeatsSelected}
              onSkip={handleSkipSeatSelection}
            />
          </div>
        </div>
      )}
    </div>
  );
};