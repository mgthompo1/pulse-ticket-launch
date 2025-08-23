import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Circle, 
  Save, 
  Grid3x3, 
  MousePointer, 
  Trash2,
  Eye
} from "lucide-react";

interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: string;
  type: 'standard' | 'premium' | 'vip' | 'accessible';
  isOccupied?: boolean;
}

interface SeatMapDesignerProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

export const SeatMapDesigner = ({ eventId, eventName, onClose }: SeatMapDesignerProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'seat' | 'row'>('pointer');
  const [selectedSeatType, setSelectedSeatType] = useState<Seat['type']>('standard');
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedSeat, setDraggedSeat] = useState<string | null>(null);
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [currentRow, setCurrentRow] = useState('A');
  const [seatCounter, setSeatCounter] = useState(1);
  const [seatMapName, setSeatMapName] = useState('Main Seating Layout');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [seatsPerRow, setSeatsPerRow] = useState(10);
  const [rowSpacing, setRowSpacing] = useState(40);

  const seatColors = {
    standard: '#3b82f6',
    premium: '#f59e0b', 
    vip: '#ef4444',
    accessible: '#10b981'
  };

  useEffect(() => {
    drawCanvas();
  }, [seats, isPreviewMode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid in design mode
    if (!isPreviewMode) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal lines  
      for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw stage
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(canvas.width / 2 - 100, 20, 200, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', canvas.width / 2, 45);

    // Draw seats
    seats.forEach(seat => {
      const color = isPreviewMode && seat.isOccupied 
        ? '#9ca3af' 
        : seatColors[seat.type];
      
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
    if (isPreviewMode) return;
    
    const pos = getCanvasPosition(e);
    const existingSeat = findSeatAt(pos.x, pos.y);

    if (selectedTool === 'seat' && !existingSeat) {
      // Add new seat
      const newSeat: Seat = {
        id: `seat-${Date.now()}-${Math.random()}`,
        x: Math.round(pos.x / 20) * 20,
        y: Math.round(pos.y / 20) * 20,
        row: currentRow,
        number: seatCounter.toString(),
        type: selectedSeatType
      };
      
      setSeats(prev => [...prev, newSeat]);
      setSeatCounter(prev => prev + 1);
    } else if (selectedTool === 'pointer' && existingSeat) {
      // Select/deselect seat
      console.log('Selected seat:', existingSeat);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreviewMode || selectedTool !== 'pointer') return;
    
    const pos = getCanvasPosition(e);
    const seat = findSeatAt(pos.x, pos.y);
    
    if (seat) {
      setDraggedSeat(seat.id);
      setIsDrawing(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !draggedSeat || isPreviewMode) return;
    
    const pos = getCanvasPosition(e);
    setSeats(prev => prev.map(seat => 
      seat.id === draggedSeat 
        ? { ...seat, x: Math.round(pos.x / 20) * 20, y: Math.round(pos.y / 20) * 20 }
        : seat
    ));
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    setDraggedSeat(null);
  };

  const addRowOfSeats = () => {
    const startX = 200;
    
    // Calculate Y position based on existing rows, not just current row
    const existingRows = [...new Set(seats.map(s => s.row))];
    const currentRowIndex = existingRows.indexOf(currentRow);
    let startY;
    
    if (currentRowIndex === -1) {
      // This is a new row, find the highest Y position and add spacing
      const maxY = seats.length > 0 ? Math.max(...seats.map(s => s.y)) : 160;
      startY = maxY + rowSpacing;
    } else {
      // This row already exists, find the Y position of existing seats in this row
      const existingSeatsInRow = seats.filter(s => s.row === currentRow);
      if (existingSeatsInRow.length > 0) {
        startY = existingSeatsInRow[0].y;
      } else {
        // Fallback: find the highest Y position and add spacing
        const maxY = seats.length > 0 ? Math.max(...seats.map(s => s.y)) : 160;
        startY = maxY + rowSpacing;
      }
    }
    
    const newSeats: Seat[] = [];
    for (let i = 0; i < seatsPerRow; i++) {
      newSeats.push({
        id: `seat-${Date.now()}-${Math.random()}`,
        x: startX + (i * 40),
        y: startY,
        row: currentRow,
        number: (i + 1).toString(),
        type: selectedSeatType
      });
    }
    
    setSeats(prev => [...prev, ...newSeats]);
    setSeatCounter(prev => prev + seatsPerRow);
  };

  const clearSeats = () => {
    setSeats([]);
    setSeatCounter(1);
  };

  const saveSeatMap = async () => {
    try {
      const layoutData = {
        seats: seats.map(seat => ({
          id: seat.id,
          x: seat.x,
          y: seat.y,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          isOccupied: seat.isOccupied || false
        })),
        canvasSize: canvasSize,
        metadata: {
          name: seatMapName,
          totalSeats: seats.length,
          seatTypes: Object.keys(seatColors).map(type => ({
            type,
            count: seats.filter(s => s.type === type).length
          }))
        }
      } as any;

      const { data, error } = await supabase
        .from('seat_maps')
        .upsert([{
          event_id: eventId,
          name: seatMapName,
          layout_data: layoutData,
          total_seats: seats.length
        }])
        .select()
        .single();

      if (error) throw error;

      // Save individual seats
      if (seats.length > 0) {
        const seatData = seats.map(seat => ({
          seat_map_id: data.id,
          seat_number: seat.number,
          row_label: seat.row,
          x_position: seat.x,
          y_position: seat.y,
          seat_type: seat.type
        }));

        const { error: seatsError } = await supabase
          .from('seats')
          .delete()
          .eq('seat_map_id', data.id);

        if (seatsError) console.warn('Could not clear existing seats:', seatsError);

        const { error: insertError } = await supabase
          .from('seats')
          .insert(seatData);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Seat map saved successfully!"
      });
      
    } catch (error) {
      console.error('Error saving seat map:', error);
      toast({
        title: "Error",
        description: "Failed to save seat map",
        variant: "destructive"
      });
    }
  };

  const nextRow = () => {
    const nextChar = String.fromCharCode(currentRow.charCodeAt(0) + 1);
    setCurrentRow(nextChar);
    setSeatCounter(1);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-row items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">Seat Map Designer - {eventName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Design your venue's seating layout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? "Edit Mode" : "Preview"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex h-full w-full">
          {/* Toolbar */}
          {!isPreviewMode && (
            <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tools" className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Drawing Tools</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant={selectedTool === 'pointer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('pointer')}
                      >
                        <MousePointer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={selectedTool === 'seat' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('seat')}
                      >
                        <Circle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={selectedTool === 'row' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('row')}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Seat Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(seatColors).map(([type, color]) => (
                        <Button
                          key={type}
                          variant={selectedSeatType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedSeatType(type as Seat['type'])}
                          className="capitalize"
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: color }}
                          />
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Current Row</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input 
                        value={currentRow} 
                        onChange={(e) => setCurrentRow(e.target.value.toUpperCase())}
                        className="w-16 text-center"
                        maxLength={2}
                      />
                      <Button size="sm" onClick={nextRow}>
                        Next Row
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Row Configuration</Label>
                    <div className="space-y-2 mt-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Seats per Row</Label>
                        <Input 
                          type="number"
                          value={seatsPerRow} 
                          onChange={(e) => setSeatsPerRow(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full"
                          min="1"
                          max="50"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Row Spacing (px)</Label>
                        <Input 
                          type="number"
                          value={rowSpacing} 
                          onChange={(e) => setRowSpacing(Math.max(20, parseInt(e.target.value) || 40))}
                          className="w-full"
                          min="20"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={addRowOfSeats} className="w-full" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Row of {seatsPerRow} Seats
                    </Button>
                    <Button onClick={clearSeats} variant="outline" className="w-full" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Seats
                    </Button>
                    <Button onClick={saveSeatMap} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save Seat Map
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label htmlFor="map-name">Layout Name</Label>
                    <Input
                      id="map-name"
                      value={seatMapName}
                      onChange={(e) => setSeatMapName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Statistics</Label>
                    <div className="space-y-1">
                      <div className="text-sm">Total Seats: {seats.length}</div>
                      {Object.entries(seatColors).map(([type, color]) => {
                        const count = seats.filter(s => s.type === type).length;
                        return count > 0 ? (
                          <div key={type} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="capitalize">{type}: {count}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 p-4 bg-white">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border border-gray-300 cursor-crosshair bg-gray-50"
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            
            {isPreviewMode && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">Preview Mode - Click Edit Mode to make changes</Badge>
                <Badge>Total Seats: {seats.length}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};