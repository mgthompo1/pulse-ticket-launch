import React, { useState, useEffect } from 'react';
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
  hideHeader?: boolean;
  hideContinueButton?: boolean;
  buttonText?: string;
  groupId?: string | null;
  allocationId?: string | null;
}

export const TicketSelection: React.FC<TicketSelectionProps> = ({
  ticketTypes,
  cartItems,
  onAddToCart,
  onNext,
  theme,
  hideHeader = false,
  hideContinueButton = false,
  buttonText = "Add to Cart",
  groupId,
  allocationId
}) => {
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [pendingSeatSelection, setPendingSeatSelection] = useState<TicketType | null>(null);
  const [groupAllocation, setGroupAllocation] = useState<{
    allocated_quantity: number;
    used_quantity: number;
    reserved_quantity: number;
    ticket_type_id: string;
  } | null>(null);
  
  
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

  // Load group allocation if this is a group purchase
  useEffect(() => {
    const loadAllocation = async () => {
      if (!allocationId) return;

      console.log("🎯 TicketSelection: Loading allocation for", allocationId);

      const { data: allocation, error } = await anonymousSupabase
        .from("group_ticket_allocations")
        .select("ticket_type_id, allocated_quantity, used_quantity, reserved_quantity")
        .eq("id", allocationId)
        .single();

      if (error) {
        console.error("Error loading allocation:", error);
      } else if (allocation) {
        console.log("🎯 TicketSelection: Allocation loaded:", allocation);
        setGroupAllocation(allocation);
      }
    };

    loadAllocation();
  }, [allocationId]);

  // Helper to get available quantity (group allocation or ticket type)
  const getAvailableQuantity = (ticketType: TicketType): number => {
    const isGroupPurchase = !!groupId && !!allocationId;
    if (isGroupPurchase && groupAllocation && ticketType.id === groupAllocation.ticket_type_id) {
      const remaining = groupAllocation.allocated_quantity - groupAllocation.used_quantity - groupAllocation.reserved_quantity;
      console.log(`🎯 TicketSelection: Group allocation remaining for ${ticketType.name}:`, remaining);
      return Math.max(0, remaining);
    }
    return ticketType.quantity_available - ticketType.quantity_sold;
  };

  const hasSelectedTickets = cartItems.some(item => item.quantity > 0);

  const addToCartWithSeatCheck = async (ticketType: TicketType) => {
    // First check if seat maps are enabled in event customization
    // We need to get the event data to check this
    const { data: eventData, error: eventError } = await anonymousSupabase
      .from('events')
      .select('widget_customization')
      .eq('id', ticketType.event_id)
      .single();

    if (eventError) {
      // Fallback: add directly to cart
      onAddToCart(ticketType);
      return;
    }

    const seatMapsEnabled = eventData?.widget_customization?.seatMaps?.enabled;

    // Only check for seat maps if they're enabled in customization
    if (seatMapsEnabled) {
      const { data: seatMaps } = await anonymousSupabase
        .from('seat_maps')
        .select('id, name, total_seats')
        .eq('event_id', ticketType.event_id);

      if (seatMaps && seatMaps.length > 0) {
        // Event has seating - show seat selector
        setPendingSeatSelection(ticketType);
        setShowSeatSelection(true);
        return;
      }
    }

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
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.headerTextColor }}>Select Your Tickets</h2>
          <p style={{ color: theme.bodyTextColor }}>Choose the tickets you'd like to purchase</p>
        </div>
      )}

      <div className="space-y-4">
        {ticketTypes.map((ticketType) => {
          const availableQuantity = getAvailableQuantity(ticketType);
          const isAvailable = availableQuantity > 0;

          return (
            <Card
              key={ticketType.id}
              className={!isAvailable ? 'opacity-50' : ''}
              style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}
            >
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
                        ? `${availableQuantity} available`
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
                      disabled={availableQuantity <= 0}
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: theme.buttonTextColor
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {buttonText}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Navigation Button Below Content */}
      {!hideContinueButton && (
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
      )}

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