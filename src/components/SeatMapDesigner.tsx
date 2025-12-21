import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Circle,
  Save,
  Grid3x3,
  MousePointer,
  Trash2,
  Eye,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Copy,
  Layers,
  Square,
  Theater,
  Armchair,
  DollarSign,
  Palette,
  Settings2,
  Download,
  Upload,
  Undo2,
  Redo2,
  AlignHorizontalJustifyCenter,
  ImageIcon
} from "lucide-react";

// Section for grouping seats with pricing
interface Section {
  id: string;
  name: string;
  color: string;
  ticketTypeId: string | null;
  price: number | null;
}

interface Seat {
  id: string;
  x: number;
  y: number;
  row: string;
  number: string;
  type: 'standard' | 'premium' | 'vip' | 'accessible';
  sectionId: string | null;
  isOccupied?: boolean;
  isSelected?: boolean;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface VenueElement {
  id: string;
  type: 'stage' | 'entrance' | 'aisle' | 'label' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  color?: string;
}

interface SeatMapDesignerProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

// Pre-built templates with venue elements
const TEMPLATES = {
  theater: {
    name: "Theater",
    icon: Theater,
    sections: [
      { id: 'orchestra', name: 'Orchestra', color: '#3b82f6' },
      { id: 'mezzanine', name: 'Mezzanine', color: '#f59e0b' },
      { id: 'balcony', name: 'Balcony', color: '#10b981' },
    ],
    venueElements: [
      { type: 'stage' as const, x: 200, y: 60, width: 400, height: 60, label: 'STAGE' },
    ],
    generateSeats: () => {
      const seats: Omit<Seat, 'id'>[] = [];
      const centerX = 400;

      // Orchestra - 10 rows of 14 seats (slightly curved)
      for (let row = 0; row < 10; row++) {
        const seatsInRow = 14;
        const rowY = 160 + row * 32;
        const curve = Math.sin((row / 10) * Math.PI * 0.3) * 20; // slight curve

        for (let seat = 0; seat < seatsInRow; seat++) {
          const seatX = centerX - ((seatsInRow - 1) * 20) + seat * 40;
          seats.push({
            x: seatX,
            y: rowY + (Math.abs(seat - seatsInRow/2) * curve * 0.1),
            row: String.fromCharCode(65 + row),
            number: (seat + 1).toString(),
            type: row < 3 ? 'premium' : 'standard',
            sectionId: 'orchestra',
          });
        }
      }

      // Mezzanine - 5 rows of 16 seats (raised section)
      for (let row = 0; row < 5; row++) {
        const seatsInRow = 16;
        const rowY = 520 + row * 32;

        for (let seat = 0; seat < seatsInRow; seat++) {
          const seatX = centerX - ((seatsInRow - 1) * 20) + seat * 40;
          seats.push({
            x: seatX,
            y: rowY,
            row: String.fromCharCode(75 + row), // K, L, M, N, O
            number: (seat + 1).toString(),
            type: 'premium',
            sectionId: 'mezzanine',
          });
        }
      }

      // Balcony - 4 rows of 18 seats (top level)
      for (let row = 0; row < 4; row++) {
        const seatsInRow = 18;
        const rowY = 720 + row * 32;

        for (let seat = 0; seat < seatsInRow; seat++) {
          const seatX = centerX - ((seatsInRow - 1) * 20) + seat * 40;
          seats.push({
            x: seatX,
            y: rowY,
            row: String.fromCharCode(80 + row), // P, Q, R, S
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'balcony',
          });
        }
      }

      return seats;
    }
  },
  stadium: {
    name: "Stadium/Arena",
    icon: Circle,
    sections: [
      { id: 'floor', name: 'Floor/VIP', color: '#ef4444' },
      { id: 'lower', name: 'Lower Bowl', color: '#f59e0b' },
      { id: 'upper', name: 'Upper Bowl', color: '#3b82f6' },
    ],
    venueElements: [
      { type: 'stage' as const, x: 300, y: 80, width: 200, height: 80, label: 'STAGE' },
    ],
    generateSeats: () => {
      const seats: Omit<Seat, 'id'>[] = [];
      const centerX = 400;
      const centerY = 400;

      // Floor/VIP seating - curved rows facing stage
      for (let row = 0; row < 6; row++) {
        const seatsInRow = 10 + row * 2;
        const radius = 120 + row * 35;

        for (let seat = 0; seat < seatsInRow; seat++) {
          const angle = ((seat / (seatsInRow - 1)) * 0.8 + 0.1) * Math.PI; // Arc from ~20° to ~160°
          seats.push({
            x: centerX + Math.cos(angle - Math.PI/2) * radius * 1.2,
            y: 200 + Math.sin(angle - Math.PI/2) * radius * 0.4 + row * 30,
            row: String.fromCharCode(65 + row),
            number: (seat + 1).toString(),
            type: 'vip',
            sectionId: 'floor',
          });
        }
      }

      // Lower Bowl - wider curved sections on sides
      for (let row = 0; row < 8; row++) {
        const seatsInRow = 18 + row * 2;
        const rowY = 450 + row * 30;

        for (let seat = 0; seat < seatsInRow; seat++) {
          const seatX = centerX - ((seatsInRow - 1) * 18) + seat * 36;
          // Add slight curve
          const curveOffset = Math.pow(Math.abs(seat - seatsInRow/2) / (seatsInRow/2), 2) * 15;
          seats.push({
            x: seatX,
            y: rowY + curveOffset,
            row: String.fromCharCode(71 + row), // G, H, I, J, K, L, M, N
            number: (seat + 1).toString(),
            type: 'premium',
            sectionId: 'lower',
          });
        }
      }

      // Upper Bowl - top level with more seats
      for (let row = 0; row < 6; row++) {
        const seatsInRow = 24 + row * 2;
        const rowY = 720 + row * 28;

        for (let seat = 0; seat < seatsInRow; seat++) {
          const seatX = centerX - ((seatsInRow - 1) * 16) + seat * 32;
          const curveOffset = Math.pow(Math.abs(seat - seatsInRow/2) / (seatsInRow/2), 2) * 20;
          seats.push({
            x: seatX,
            y: rowY + curveOffset,
            row: String.fromCharCode(79 + row), // O, P, Q, R, S, T
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'upper',
          });
        }
      }

      return seats;
    }
  },
  classroom: {
    name: "Classroom/Conference",
    icon: Grid3x3,
    sections: [
      { id: 'front', name: 'Front Section', color: '#ef4444' },
      { id: 'middle', name: 'Middle Section', color: '#f59e0b' },
      { id: 'back', name: 'Back Section', color: '#3b82f6' },
    ],
    venueElements: [
      { type: 'stage' as const, x: 250, y: 40, width: 300, height: 50, label: 'PRESENTER' },
    ],
    generateSeats: () => {
      const seats: Omit<Seat, 'id'>[] = [];
      const centerX = 400;

      // Front section - 3 rows
      for (let row = 0; row < 3; row++) {
        for (let seat = 0; seat < 10; seat++) {
          seats.push({
            x: centerX - 225 + seat * 50,
            y: 130 + row * 45,
            row: String.fromCharCode(65 + row),
            number: (seat + 1).toString(),
            type: 'premium',
            sectionId: 'front',
          });
        }
      }

      // Middle section - 4 rows
      for (let row = 0; row < 4; row++) {
        for (let seat = 0; seat < 12; seat++) {
          seats.push({
            x: centerX - 275 + seat * 50,
            y: 300 + row * 45,
            row: String.fromCharCode(68 + row), // D, E, F, G
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'middle',
          });
        }
      }

      // Back section - 3 rows
      for (let row = 0; row < 3; row++) {
        for (let seat = 0; seat < 14; seat++) {
          seats.push({
            x: centerX - 325 + seat * 50,
            y: 500 + row * 45,
            row: String.fromCharCode(72 + row), // H, I, J
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'back',
          });
        }
      }

      return seats;
    }
  },
  concert: {
    name: "Concert Hall",
    icon: Armchair,
    sections: [
      { id: 'pit', name: 'Standing Pit', color: '#ef4444' },
      { id: 'floor', name: 'Floor Seats', color: '#f59e0b' },
      { id: 'tier1', name: 'First Tier', color: '#10b981' },
      { id: 'tier2', name: 'Second Tier', color: '#3b82f6' },
    ],
    venueElements: [
      { type: 'stage' as const, x: 200, y: 40, width: 400, height: 80, label: 'STAGE' },
    ],
    generateSeats: () => {
      const seats: Omit<Seat, 'id'>[] = [];
      const centerX = 400;

      // Standing pit area - represented as a grid
      for (let row = 0; row < 4; row++) {
        for (let pos = 0; pos < 16; pos++) {
          seats.push({
            x: centerX - 280 + pos * 36,
            y: 160 + row * 30,
            row: 'PIT',
            number: (row * 16 + pos + 1).toString(),
            type: 'vip',
            sectionId: 'pit',
          });
        }
      }

      // Floor seats - 8 rows
      for (let row = 0; row < 8; row++) {
        const seatsInRow = 14 + Math.floor(row / 2) * 2;
        for (let seat = 0; seat < seatsInRow; seat++) {
          seats.push({
            x: centerX - ((seatsInRow - 1) * 20) + seat * 40,
            y: 320 + row * 32,
            row: String.fromCharCode(65 + row),
            number: (seat + 1).toString(),
            type: 'premium',
            sectionId: 'floor',
          });
        }
      }

      // First tier - 5 rows
      for (let row = 0; row < 5; row++) {
        const seatsInRow = 20;
        for (let seat = 0; seat < seatsInRow; seat++) {
          seats.push({
            x: centerX - ((seatsInRow - 1) * 19) + seat * 38,
            y: 600 + row * 30,
            row: String.fromCharCode(73 + row), // I, J, K, L, M
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'tier1',
          });
        }
      }

      // Second tier - 4 rows
      for (let row = 0; row < 4; row++) {
        const seatsInRow = 22;
        for (let seat = 0; seat < seatsInRow; seat++) {
          seats.push({
            x: centerX - ((seatsInRow - 1) * 18) + seat * 36,
            y: 780 + row * 28,
            row: String.fromCharCode(78 + row), // N, O, P, Q
            number: (seat + 1).toString(),
            type: 'standard',
            sectionId: 'tier2',
          });
        }
      }

      return seats;
    }
  }
};

export const SeatMapDesigner = ({ eventId, eventName, onClose }: SeatMapDesignerProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core state
  const [seats, setSeats] = useState<Seat[]>([]);
  const [sections, setSections] = useState<Section[]>([
    { id: 'default', name: 'General Admission', color: '#3b82f6', ticketTypeId: null, price: null }
  ]);
  const [venueElements, setVenueElements] = useState<VenueElement[]>([
    { id: 'stage', type: 'stage', x: 300, y: 30, width: 200, height: 50, rotation: 0, label: 'STAGE' }
  ]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  // Tool state
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'seat' | 'row' | 'section' | 'move'>('pointer');
  const [selectedSeatType, setSelectedSeatType] = useState<Seat['type']>('standard');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('default');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedSeat, setDraggedSeat] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Settings
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [currentRow, setCurrentRow] = useState('A');
  const [seatCounter, setSeatCounter] = useState(1);
  const [seatMapName, setSeatMapName] = useState('Main Seating Layout');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [seatsPerRow, setSeatsPerRow] = useState(10);
  const [rowSpacing, setRowSpacing] = useState(40);
  const [seatSpacing, setSeatSpacing] = useState(40);
  const [showEntrance, setShowEntrance] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  // Dialogs
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<{ seats: Seat[]; sections: Section[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Section colors palette
  const SECTION_COLORS = [
    '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  const seatColors = {
    standard: '#3b82f6',
    premium: '#f59e0b',
    vip: '#ef4444',
    accessible: '#10b981'
  };

  // Load ticket types for section pricing
  useEffect(() => {
    const loadTicketTypes = async () => {
      const { data, error } = await supabase
        .from('ticket_types')
        .select('id, name, price')
        .eq('event_id', eventId);

      if (!error && data) {
        setTicketTypes(data);
      }
    };
    loadTicketTypes();
  }, [eventId]);

  useEffect(() => {
    drawCanvas();
  }, [seats, sections, venueElements, isPreviewMode, showEntrance, zoom, pan, showGrid, selectedSeats, selectionBox]);

  // Load existing seat map data when component mounts
  useEffect(() => {
    const loadExistingSeatMap = async () => {
      try {
        const { data: existingSeatMap, error } = await supabase
          .from('seat_maps')
          .select('*')
          .eq('event_id', eventId)
          .single();

        if (!error && existingSeatMap) {
          // Load existing seat map data
          const layoutData = existingSeatMap.layout_data as any;
          if (layoutData?.seats) {
            setSeats(layoutData.seats.map((s: any) => ({ ...s, sectionId: s.sectionId || 'default' })));
          }
          if (layoutData?.sections) {
            setSections(layoutData.sections);
          }
          if (layoutData?.show_entrance !== undefined) {
            setShowEntrance(layoutData.show_entrance);
          }
          if (existingSeatMap.name) {
            setSeatMapName(existingSeatMap.name);
          }
        }
      } catch (error) {
        console.log('No existing seat map found or error loading:', error);
      }
    };

    loadExistingSeatMap();
  }, [eventId]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to get section color
  const getSectionColor = (sectionId: string | null): string => {
    if (!sectionId) return seatColors.standard;
    const section = sections.find(s => s.id === sectionId);
    return section?.color || seatColors.standard;
  };

  // Add section
  const addSection = (name: string, color: string) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name,
      color,
      ticketTypeId: null,
      price: null
    };
    setSections(prev => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setShowSectionDialog(false);
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    if (sectionId === 'default') {
      toast({ title: "Cannot delete", description: "Default section cannot be deleted", variant: "destructive" });
      return;
    }
    // Move seats to default section
    setSeats(prev => prev.map(s => s.sectionId === sectionId ? { ...s, sectionId: 'default' } : s));
    setSections(prev => prev.filter(s => s.id !== sectionId));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId('default');
    }
  };

  // Apply template
  const applyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateKey];
    console.log('Template data:', template);

    // Create sections from template
    const newSections: Section[] = template.sections.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      ticketTypeId: null,
      price: null
    }));
    console.log('New sections:', newSections);

    // Generate seats
    const generatedSeats = template.generateSeats();
    console.log('Generated seats count:', generatedSeats.length);

    const newSeats: Seat[] = generatedSeats.map((s, index) => ({
      id: `seat-${Date.now()}-${index}`,
      x: s.x,
      y: s.y,
      row: s.row,
      number: s.number,
      type: s.type,
      sectionId: s.sectionId
    }));
    console.log('New seats with IDs:', newSeats.length);

    // Set venue elements from template (stage, etc.)
    if (template.venueElements) {
      const newVenueElements: VenueElement[] = template.venueElements.map((el, index) => ({
        id: `venue-${Date.now()}-${index}`,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: 0,
        label: el.label,
        color: '#1f2937'
      }));
      setVenueElements(newVenueElements);
    }

    // Update state
    setSections(newSections);
    setSelectedSectionId(newSections[0]?.id || 'default');
    setSeats(newSeats);

    // Calculate zoom to fit all seats
    const maxY = Math.max(...newSeats.map(s => s.y), 600);
    const maxX = Math.max(...newSeats.map(s => s.x), 800);
    const minX = Math.min(...newSeats.map(s => s.x), 0);

    // Adjust zoom to fit content (with some padding)
    const neededHeight = maxY + 50;
    const neededWidth = maxX - minX + 100;
    const zoomForHeight = 550 / neededHeight;
    const zoomForWidth = 750 / neededWidth;
    const optimalZoom = Math.min(zoomForHeight, zoomForWidth, 1);

    setZoom(Math.max(0.5, optimalZoom));
    setPan({ x: 0, y: 0 });

    setShowTemplateDialog(false);
    toast({ title: "Template applied", description: `${template.name} layout with ${newSeats.length} seats has been applied` });
  };

  // Assign selected seats to section
  const assignSeatsToSection = (sectionId: string) => {
    if (selectedSeats.length === 0) {
      toast({ title: "No seats selected", description: "Select seats first using the pointer tool", variant: "destructive" });
      return;
    }
    setSeats(prev => prev.map(s =>
      selectedSeats.includes(s.id) ? { ...s, sectionId } : s
    ));
    toast({ title: "Seats assigned", description: `${selectedSeats.length} seats assigned to section` });
    setSelectedSeats([]);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high DPI rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set the actual size in memory (scaled up for high DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale the drawing context so everything draws at the correct size
    ctx.scale(dpr, dpr);

    // Set the CSS size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Improve rendering quality
    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Save the context state before applying transforms
    ctx.save();

    // Apply zoom and pan transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid in design mode
    if (!isPreviewMode && showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1 / zoom;

      const gridStep = gridSize;
      const startX = -pan.x / zoom;
      const startY = -pan.y / zoom;
      const endX = (rect.width - pan.x) / zoom;
      const endY = (rect.height - pan.y) / zoom;

      // Vertical lines
      for (let x = Math.floor(startX / gridStep) * gridStep; x <= endX; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = Math.floor(startY / gridStep) * gridStep; y <= endY; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    // Draw venue elements (stage, etc.)
    venueElements.forEach(element => {
      if (element.type === 'stage') {
        // Draw stage background
        ctx.fillStyle = element.color || '#1f2937';
        ctx.fillRect(element.x, element.y, element.width, element.height);

        // Draw stage border
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(element.x, element.y, element.width, element.height);

        // Draw stage label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(16, element.height * 0.4) / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.label || 'STAGE', element.x + element.width / 2, element.y + element.height / 2);
      } else if (element.type === 'aisle') {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(element.x, element.y, element.width, element.height);
      } else if (element.type === 'label') {
        ctx.fillStyle = '#374151';
        ctx.font = `${14 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(element.label || '', element.x, element.y);
      }
    });

    // Draw entrance (if enabled) - position based on max seat Y
    if (showEntrance) {
      const maxSeatY = seats.length > 0 ? Math.max(...seats.map(s => s.y)) : 500;
      const entranceY = maxSeatY + 50;
      const centerX = seats.length > 0
        ? (Math.min(...seats.map(s => s.x)) + Math.max(...seats.map(s => s.x))) / 2
        : 400;

      ctx.fillStyle = '#10b981';
      ctx.fillRect(centerX - 60, entranceY, 120, 30);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(centerX - 60, entranceY, 120, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${12 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENTRANCE', centerX, entranceY + 15);
    }

    // Draw seats - color by section
    seats.forEach(seat => {
      let color: string;

      if (isPreviewMode && seat.isOccupied) {
        color = '#9ca3af';
      } else if (seat.sectionId) {
        color = getSectionColor(seat.sectionId);
      } else {
        color = seatColors[seat.type];
      }

      const isSelected = selectedSeats.includes(seat.id);
      const seatRadius = 12;

      // Draw selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, seatRadius + 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#374151';
      ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;

      // Draw seat circle
      ctx.beginPath();
      ctx.arc(seat.x, seat.y, seatRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw seat label
      ctx.fillStyle = '#ffffff';
      ctx.font = `${10 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(seat.row + seat.number, seat.x, seat.y + 3);
    });

    // Draw selection box if active
    if (selectionBox && selectedTool === 'pointer') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';

      const boxX = Math.min(selectionBox.startX, selectionBox.endX);
      const boxY = Math.min(selectionBox.startY, selectionBox.endY);
      const boxWidth = Math.abs(selectionBox.endX - selectionBox.startX);
      const boxHeight = Math.abs(selectionBox.endY - selectionBox.startY);

      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      ctx.setLineDash([]);
    }

    // Restore the context state
    ctx.restore();

    // Draw zoom indicator (fixed position, not affected by transforms)
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(zoom * 100)}%`, rect.width - 10, rect.height - 10);
  };

  // Get canvas position accounting for zoom and pan
  const getCanvasPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Transform to account for zoom and pan
    return {
      x: (rawX - pan.x) / zoom,
      y: (rawY - pan.y) / zoom
    };
  };

  // Get raw canvas position (for panning)
  const getRawCanvasPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      return distance <= 12 / zoom; // Adjust for zoom
    }) || null;
  };

  // Find all seats within a selection box
  const findSeatsInBox = (box: { startX: number; startY: number; endX: number; endY: number }): string[] => {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    return seats
      .filter(seat => seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY)
      .map(seat => seat.id);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;

    const pos = getCanvasPosition(e);
    const existingSeat = findSeatAt(pos.x, pos.y);

    if (selectedTool === 'seat' && !existingSeat) {
      // Add new seat with section
      const snapX = snapToGrid ? Math.round(pos.x / gridSize) * gridSize : pos.x;
      const snapY = snapToGrid ? Math.round(pos.y / gridSize) * gridSize : pos.y;

      const newSeat: Seat = {
        id: `seat-${Date.now()}-${Math.random()}`,
        x: snapX,
        y: snapY,
        row: currentRow,
        number: seatCounter.toString(),
        type: selectedSeatType,
        sectionId: selectedSectionId
      };

      setSeats(prev => [...prev, newSeat]);
      setSeatCounter(prev => prev + 1);
    } else if (selectedTool === 'pointer' && existingSeat) {
      // Toggle seat selection
      if (e.shiftKey) {
        // Multi-select with shift
        setSelectedSeats(prev =>
          prev.includes(existingSeat.id)
            ? prev.filter(id => id !== existingSeat.id)
            : [...prev, existingSeat.id]
        );
      } else {
        // Single select
        setSelectedSeats(prev =>
          prev.includes(existingSeat.id) && prev.length === 1
            ? []
            : [existingSeat.id]
        );
      }
    } else if (selectedTool === 'pointer' && !existingSeat) {
      // Click on empty space clears selection
      setSelectedSeats([]);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;

    const pos = getCanvasPosition(e);
    const rawPos = getRawCanvasPosition(e);

    // Handle panning with move tool or middle mouse button
    if (selectedTool === 'move' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: rawPos.x - pan.x, y: rawPos.y - pan.y });
      return;
    }

    if (selectedTool === 'pointer') {
      const seat = findSeatAt(pos.x, pos.y);

      if (seat && selectedSeats.includes(seat.id)) {
        // Drag selected seats
        setDraggedSeat(seat.id);
        setIsDrawing(true);
      } else if (!seat) {
        // Start selection box
        setSelectionBox({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        setIsDrawing(true);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    const rawPos = getRawCanvasPosition(e);

    // Handle panning
    if (isPanning) {
      setPan({
        x: rawPos.x - panStart.x,
        y: rawPos.y - panStart.y
      });
      return;
    }

    if (!isDrawing || isPreviewMode) return;

    if (draggedSeat) {
      // Drag seats
      const snapX = snapToGrid ? Math.round(pos.x / gridSize) * gridSize : pos.x;
      const snapY = snapToGrid ? Math.round(pos.y / gridSize) * gridSize : pos.y;

      setSeats(prev => prev.map(seat =>
        seat.id === draggedSeat
          ? { ...seat, x: snapX, y: snapY }
          : seat
      ));
    } else if (selectionBox) {
      // Update selection box
      setSelectionBox(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
    }
  };

  const handleCanvasMouseUp = () => {
    // Finalize selection box
    if (selectionBox && !draggedSeat) {
      const selectedIds = findSeatsInBox(selectionBox);
      setSelectedSeats(selectedIds);
    }

    setIsDrawing(false);
    setDraggedSeat(null);
    setSelectionBox(null);
    setIsPanning(false);
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
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
        x: startX + (i * seatSpacing),
        y: startY,
        row: currentRow,
        number: (i + 1).toString(),
        type: selectedSeatType,
        sectionId: selectedSectionId
      });
    }

    setSeats(prev => [...prev, ...newSeats]);
    setSeatCounter(prev => prev + seatsPerRow);
  };

  // Delete selected seats
  const deleteSelectedSeats = () => {
    if (selectedSeats.length === 0) return;
    setSeats(prev => prev.filter(s => !selectedSeats.includes(s.id)));
    setSelectedSeats([]);
    toast({ title: "Deleted", description: `${selectedSeats.length} seats deleted` });
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
          sectionId: seat.sectionId,
          isOccupied: seat.isOccupied || false
        })),
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          color: section.color,
          ticketTypeId: section.ticketTypeId,
          price: section.price
        })),
        canvasSize: canvasSize,
        show_entrance: showEntrance,
        showGrid: showGrid,
        gridSize: gridSize,
        metadata: {
          name: seatMapName,
          totalSeats: seats.length,
          sectionStats: sections.map(s => ({
            id: s.id,
            name: s.name,
            count: seats.filter(seat => seat.sectionId === s.id).length
          })),
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
            Design your venue's seating layout with sections and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
          >
            <Layers className="w-4 h-4 mr-2" />
            Templates
          </Button>
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="sections">Sections</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="tools" className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Drawing Tools</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <Button
                        variant={selectedTool === 'pointer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('pointer')}
                        title="Select & Move"
                      >
                        <MousePointer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={selectedTool === 'seat' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('seat')}
                        title="Add Single Seat"
                      >
                        <Circle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={selectedTool === 'row' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('row')}
                        title="Add Row"
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={selectedTool === 'move' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('move')}
                        title="Pan Canvas"
                      >
                        <Move className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Selected Seats Actions */}
                  {selectedSeats.length > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium">{selectedSeats.length} seats selected</p>
                        <div className="flex gap-2">
                          <Select onValueChange={assignSeatsToSection}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Assign to section" />
                            </SelectTrigger>
                            <SelectContent>
                              {sections.map(section => (
                                <SelectItem key={section.id} value={section.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                                    {section.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="destructive" size="icon" onClick={deleteSelectedSeats}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Active Section</Label>
                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                              {section.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">New seats will be added to this section</p>
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
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Row Spacing</Label>
                          <Input
                            type="number"
                            value={rowSpacing}
                            onChange={(e) => setRowSpacing(Math.max(20, parseInt(e.target.value) || 40))}
                            className="w-full"
                            min="20"
                            max="100"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Seat Spacing</Label>
                          <Input
                            type="number"
                            value={seatSpacing}
                            onChange={(e) => setSeatSpacing(Math.max(20, parseInt(e.target.value) || 40))}
                            className="w-full"
                            min="20"
                            max="100"
                          />
                        </div>
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

                {/* Sections Tab */}
                <TabsContent value="sections" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Sections</Label>
                    <Button size="sm" onClick={() => { setEditingSection(null); setShowSectionDialog(true); }}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {sections.map(section => {
                        const seatCount = seats.filter(s => s.sectionId === section.id).length;
                        const linkedTicketType = ticketTypes.find(t => t.id === section.ticketTypeId);

                        return (
                          <Card key={section.id} className={`cursor-pointer ${selectedSectionId === section.id ? 'ring-2 ring-primary' : ''}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2" onClick={() => setSelectedSectionId(section.id)}>
                                  <div
                                    className="w-4 h-4 rounded-full border-2"
                                    style={{ backgroundColor: section.color, borderColor: section.color }}
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{section.name}</p>
                                    <p className="text-xs text-muted-foreground">{seatCount} seats</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => { setEditingSection(section); setShowSectionDialog(true); }}
                                  >
                                    <Settings2 className="w-3 h-3" />
                                  </Button>
                                  {section.id !== 'default' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => deleteSection(section.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {linkedTicketType && (
                                <div className="mt-2 flex items-center gap-1 text-xs">
                                  <DollarSign className="w-3 h-3 text-green-600" />
                                  <span className="text-green-600">${linkedTicketType.price} - {linkedTicketType.name}</span>
                                </div>
                              )}
                              {section.price && !linkedTicketType && (
                                <div className="mt-2 flex items-center gap-1 text-xs">
                                  <DollarSign className="w-3 h-3 text-green-600" />
                                  <span className="text-green-600">${section.price} (Custom Price)</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="pt-2 border-t">
                    <Label className="text-sm font-medium mb-2 block">Quick Color Palette</Label>
                    <div className="flex flex-wrap gap-1">
                      {SECTION_COLORS.map(color => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            const section = sections.find(s => s.id === selectedSectionId);
                            if (section) updateSection(section.id, { color });
                          }}
                        />
                      ))}
                    </div>
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

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Show Grid</Label>
                      <p className="text-xs text-muted-foreground">Display alignment grid</p>
                    </div>
                    <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Snap to Grid</Label>
                      <p className="text-xs text-muted-foreground">Align seats to grid</p>
                    </div>
                    <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Grid Size (px)</Label>
                    <Input
                      type="number"
                      value={gridSize}
                      onChange={(e) => setGridSize(Math.max(10, parseInt(e.target.value) || 20))}
                      className="w-full"
                      min="10"
                      max="50"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Show Entrance</Label>
                      <p className="text-xs text-muted-foreground">Display entrance marker</p>
                    </div>
                    <Switch checked={showEntrance} onCheckedChange={setShowEntrance} />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium">Statistics</Label>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Total Seats: {seats.length}</div>
                      <div className="text-xs text-muted-foreground mb-2">By Section:</div>
                      {sections.map(section => {
                        const count = seats.filter(s => s.sectionId === section.id).length;
                        return count > 0 ? (
                          <div key={section.id} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                            <span>{section.name}: {count}</span>
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
          <div className="flex-1 p-4 bg-white overflow-hidden" ref={containerRef}>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className={`border border-gray-300 bg-gray-50 w-full h-full max-w-none ${
                selectedTool === 'move' ? 'cursor-grab' :
                selectedTool === 'seat' ? 'cursor-crosshair' :
                'cursor-default'
              }`}
              style={{ imageRendering: 'crisp-edges' }}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleWheel}
            />

            {isPreviewMode && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">Preview Mode - Click Edit Mode to make changes</Badge>
                <Badge>Total Seats: {seats.length}</Badge>
                {sections.map(section => {
                  const count = seats.filter(s => s.sectionId === section.id).length;
                  return count > 0 ? (
                    <Badge key={section.id} style={{ backgroundColor: section.color }}>
                      {section.name}: {count}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Selection Dialog - Using portal-style for z-index */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 border">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <p className="text-sm text-muted-foreground">
                Start with a pre-built layout and customize it to your needs
              </p>
            </div>
            <div className="grid gap-3 mb-4">
              {Object.entries(TEMPLATES).map(([key, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    className="w-full text-left border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      console.log('Applying template:', key);
                      applyTemplate(key as keyof typeof TEMPLATES);
                    }}
                  >
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.sections.length} sections included
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {template.sections.map(s => (
                        <div
                          key={s.id}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                          title={s.name}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Section Add/Edit Dialog */}
      {showSectionDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 border max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{editingSection ? 'Edit Section' : 'Add Section'}</h3>
              <p className="text-sm text-muted-foreground">
                {editingSection ? 'Update section details and pricing' : 'Create a new section for your seating layout'}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const name = formData.get('name') as string;
                const color = formData.get('color') as string;
                const ticketTypeId = formData.get('ticketTypeId') as string;
                const customPrice = formData.get('customPrice') as string;

                if (editingSection) {
                  updateSection(editingSection.id, {
                    name,
                    color,
                    ticketTypeId: ticketTypeId || null,
                    price: customPrice ? parseFloat(customPrice) : null
                  });
                } else {
                  addSection(name, color);
                }
                setShowSectionDialog(false);
              }}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="section-name">Section Name</Label>
                  <Input
                    id="section-name"
                    name="name"
                    defaultValue={editingSection?.name || ''}
                    placeholder="e.g., Orchestra, Balcony, VIP"
                    required
                  />
                </div>

                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SECTION_COLORS.map(color => (
                      <label key={color} className="cursor-pointer">
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={editingSection?.color === color || (!editingSection && color === SECTION_COLORS[0])}
                          className="sr-only peer"
                        />
                        <div
                          className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-gray-800 peer-checked:ring-2 peer-checked:ring-offset-2"
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {editingSection && (
                  <>
                    <div>
                      <Label htmlFor="ticket-type">Link to Ticket Type</Label>
                      <Select name="ticketTypeId" defaultValue={editingSection.ticketTypeId || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a ticket type (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No linked ticket type</SelectItem>
                          {ticketTypes.map(tt => (
                            <SelectItem key={tt.id} value={tt.id}>
                              {tt.name} - ${tt.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Link to use that ticket type's price for this section
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="custom-price">Or Set Custom Price</Label>
                      <Input
                        id="custom-price"
                        name="customPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingSection.price || ''}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Only used if no ticket type is linked
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowSectionDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSection ? 'Save Changes' : 'Add Section'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};