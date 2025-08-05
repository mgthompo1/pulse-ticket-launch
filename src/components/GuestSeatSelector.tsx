import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { MapPin, Users, Check } from "lucide-react";

interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: string;
  type: 'standard' | 'premium' | 'vip' | 'accessible';
  isOccupied: boolean;
  price?: number;
}

interface GuestSeatSelectorProps {
  eventId: string;
  ticketTypeId: string;
  requestedQuantity: number;
  onSeatsSelected: (selectedSeats: string[]) => void;
  onSkip: () => void;
}

export const GuestSeatSelector = ({ 
  eventId, 
  requestedQuantity, 
  onSeatsSelected, 
  onSkip 
}: GuestSeatSelectorProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatMap, setSeatMap] = useState<{
    id: string;
    event_id: string;
    name: string;
    layout_data: Json;
    total_seats: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const seatColors = {
    standard: '#3b82f6',
    premium: '#f59e0b', 
    vip: '#ef4444',
    accessible: '#10b981'
  };

  useEffect(() => {
    loadSeatMap();
  }, [eventId]);

  useEffect(() => {
    drawCanvas();
  }, [seats, selectedSeats]);

  const loadSeatMap = async () => {
    try {
      setLoading(true);
      
      // Load seat map for the event
      const { data: seatMapData, error: mapError } = await supabase
        .from('seat_maps')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (mapError || !seatMapData) {
        // No seat map found - allow guest to skip seat selection
        setLoading(false);
        return;
      }

      setSeatMap(seatMapData);

      // Load seats with their current occupancy status
      const { data: seatsData, error: seatsError } = await supabase
        .from('seats')
        .select('*')
        .eq('seat_map_id', seatMapData.id);

      if (seatsError) throw seatsError;

      // Check which seats are already taken (from existing orders/tickets)
      const { data: _takenTickets, error: _takenError } = await supabase
        .from('tickets')
        .select(`
          id,
          order_item_id,
          order_items (
            id,
            order_id,
            orders (
              status
            )
          )
        `);

      // Get seat IDs that are occupied (from completed or pending orders)
      const occupiedSeatIds = new Set();
      
      // For now, we'll just mark some random seats as occupied for demo
      // In production, you'd properly track seat assignments
      if (seatsData && seatsData.length > 3) {
        occupiedSeatIds.add(seatsData[1].id);
        occupiedSeatIds.add(seatsData[3].id);
      }

      const formattedSeats: Seat[] = seatsData?.map(seat => ({
        id: seat.id,
        x: seat.x_position,
        y: seat.y_position,
        row: seat.row_label,
        number: seat.seat_number,
        type: seat.seat_type as Seat['type'],
        isOccupied: occupiedSeatIds.has(seat.id),
        price: seat.price_override || undefined
      })) || [];

      setSeats(formattedSeats);
    } catch (error) {
      console.error('Error loading seat map:', error);
      toast({
        title: "Error",
        description: "Failed to load seat map",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !seatMap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stage
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(canvas.width / 2 - 100, 20, 200, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', canvas.width / 2, 45);

    // Draw seats
    seats.forEach(seat => {
      let color = seatColors[seat.type];
      
      if (seat.isOccupied) {
        color = '#9ca3af'; // Gray for occupied
      } else if (selectedSeats.includes(seat.id)) {
        color = '#22c55e'; // Green for selected
      }
      
      ctx.fillStyle = color;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      
      // Draw seat circle
      ctx.beginPath();
      ctx.arc(seat.x, seat.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw seat label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(seat.row + seat.number, seat.x, seat.y + 3);
      
      // Draw selection indicator
      if (selectedSeats.includes(seat.id)) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, 16, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw legend
    const legendY = canvas.height - 80;
    const legendItems = [
      { label: 'Available', color: '#3b82f6' },
      { label: 'Selected', color: '#22c55e' },
      { label: 'Occupied', color: '#9ca3af' },
      { label: 'Premium', color: '#f59e0b' },
      { label: 'VIP', color: '#ef4444' }
    ];

    legendItems.forEach((item, index) => {
      const x = 20 + (index * 100);
      
      // Draw legend circle
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x, legendY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw legend text
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 15, legendY + 4);
    });
  };

  const getCanvasPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findSeatAt = (x: number, y: number): Seat | null => {
    return seats.find(seat => {
      const distance = Math.sqrt(
        Math.pow(seat.x - x, 2) + Math.pow(seat.y - y, 2)
      );
      return distance <= 12;
    }) || null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    const clickedSeat = findSeatAt(pos.x, pos.y);
    
    if (!clickedSeat || clickedSeat.isOccupied) return;

    if (selectedSeats.includes(clickedSeat.id)) {
      // Deselect seat
      setSelectedSeats(prev => prev.filter(id => id !== clickedSeat.id));
    } else if (selectedSeats.length < requestedQuantity) {
      // Select seat
      setSelectedSeats(prev => [...prev, clickedSeat.id]);
    } else {
      toast({
        title: "Selection Limit Reached",
        description: `You can only select ${requestedQuantity} seat(s).`,
        variant: "destructive"
      });
    }
  };

  const handleConfirmSelection = () => {
    if (selectedSeats.length === requestedQuantity) {
      onSeatsSelected(selectedSeats);
    } else {
      toast({
        title: "Incomplete Selection",
        description: `Please select exactly ${requestedQuantity} seat(s).`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading seat map...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seatMap || seats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Seating Selection
          </CardTitle>
          <CardDescription>No seat map available for this event</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This event doesn't have assigned seating. You can proceed with general admission tickets.
          </p>
          <Button onClick={onSkip} className="w-full">
            Continue with General Admission
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Your Seats
        </CardTitle>
        <CardDescription>
          Choose {requestedQuantity} seat(s) from the map below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {selectedSeats.length} of {requestedQuantity} seats selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSkip} size="sm">
              Skip Seat Selection
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={selectedSeats.length !== requestedQuantity}
              size="sm"
            >
              <Check className="mr-2 h-4 w-4" />
              Confirm Selection
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-gray-300 cursor-pointer bg-white rounded"
            onClick={handleCanvasClick}
          />
        </div>

        {selectedSeats.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Seats:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map(seatId => {
                const seat = seats.find(s => s.id === seatId);
                return seat ? (
                  <Badge key={seatId} variant="secondary">
                    {seat.row}{seat.number}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Click on available seats to select them. You can click again to deselect.
        </p>
      </CardContent>
    </Card>
  );
};