import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  Clock, 
  Users, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Loader2
} from "lucide-react";
import { AttractionStripePayment } from "@/components/payment/AttractionStripePayment";

interface AttractionBookingWidgetProps {
  attractionId: string;
  onBack?: () => void;
  compact?: boolean; // render without outer header/layout chrome for sidebar embedding
}

interface AttractionData {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  logo_url: string | null;
  widget_customization: any;
  organization_id: string;
  resource_label: string | null; // User-configurable label for resources (e.g., "Simulator", "Room", "Lane")
}

interface BookingSlot {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  max_capacity: number;
  current_bookings: number;
  price_override: number | null;
  resource_id: string | null;
}

interface AttractionResource {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
}

interface BookingFormData {
  selectedDate: string;
  selectedSlotId: string | null;
  selectedResourceId: string | null;
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests: string;
}

const AttractionBookingWidget: React.FC<AttractionBookingWidgetProps> = ({ 
  attractionId, 
  onBack,
  compact = false
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<'booking' | 'payment' | 'confirmation'>('booking');
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [windcaveSessionData, setWindcaveSessionData] = useState<any>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [resources, setResources] = useState<AttractionResource[]>([]);
  
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    selectedDate: new Date().toISOString().split('T')[0],
    selectedSlotId: null,
    selectedResourceId: null,
    partySize: 1,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialRequests: ""
  });

  // Get theme colors from attraction customization
  const theme = useMemo(() => {
    const themeData = attractionData?.widget_customization?.theme || {};
    const isEnabled = themeData.enabled === true;
    
    let newTheme;
    if (!isEnabled) {
      // Use default theme when customization is disabled
      newTheme = {
        enabled: false,
        primaryColor: '#000000', // Default black for buttons and progress bars
        buttonTextColor: '#ffffff', // White for button text
        secondaryColor: '#ffffff', // White for borders and secondary elements
        backgroundColor: '#ffffff', // White background
        cardBackgroundColor: '#ffffff',
        inputBackgroundColor: '#ffffff',
        borderEnabled: false,
        borderColor: '#e5e7eb',
        headerTextColor: '#111827', // Dark gray for headers
        bodyTextColor: '#6b7280', // Lighter gray for body text
        fontFamily: 'Manrope' // Default to Manrope
      };
    } else {
      // Use custom theme when enabled
      newTheme = {
        enabled: true,
        primaryColor: themeData.primaryColor || '#000000',
        buttonTextColor: themeData.buttonTextColor || '#ffffff',
        secondaryColor: themeData.secondaryColor || '#ffffff',
        backgroundColor: themeData.backgroundColor || '#ffffff',
        cardBackgroundColor: themeData.cardBackgroundColor || themeData.backgroundColor || '#ffffff',
        inputBackgroundColor: themeData.inputBackgroundColor || '#ffffff',
        borderEnabled: themeData.borderEnabled ?? false,
        borderColor: themeData.borderColor || '#e5e7eb',
        headerTextColor: themeData.headerTextColor || '#111827',
        bodyTextColor: themeData.bodyTextColor || '#6b7280',
        fontFamily: themeData.fontFamily || 'Manrope'
      };
    }
    
    return newTheme;
  }, [attractionData?.widget_customization?.theme]);

  // Destructure theme colors for easier use
  const { 
    primaryColor, 
    buttonTextColor, 
    headerTextColor, 
    bodyTextColor, 
    fontFamily
  } = theme;

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar days
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays(currentMonth);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toISOString().split('T')[0] === bookingForm.selectedDate;
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = (date: Date) => {
    if (isPast(date)) return;
    
    setBookingForm(prev => ({ 
      ...prev, 
      selectedDate: date.toISOString().split('T')[0],
      selectedSlotId: null
    }));
    setShowCalendar(false);
  };

  const changeMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const quickDateSelect = (type: 'tomorrow' | 'weekend') => {
    const today = new Date();
    let targetDate = new Date(today);
    
    if (type === 'tomorrow') {
      targetDate.setDate(today.getDate() + 1);
    } else if (type === 'weekend') {
      const daysUntilWeekend = 6 - today.getDay(); // Saturday is 6
      targetDate.setDate(today.getDate() + daysUntilWeekend);
    }
    
    setBookingForm(prev => ({ 
      ...prev, 
      selectedDate: targetDate.toISOString().split('T')[0],
      selectedSlotId: null
    }));
  };

  useEffect(() => {
    if (attractionId) {
      loadAttractionData();
      loadResources();
    }
  }, [attractionId]);

  // Handle click outside calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  useEffect(() => {
    if (attractionId && bookingForm.selectedDate) {
      loadAvailableSlots();
    }
  }, [attractionId, bookingForm.selectedDate, bookingForm.selectedResourceId]);

  // Initialize Windcave Drop-In when session data is available AND payment step is active
  useEffect(() => {
    if (windcaveSessionData && paymentProvider === "windcave" && window.WindcavePayments && bookingStep === 'payment') {
      // Add a small delay to ensure DOM is fully rendered
      setTimeout(() => {
        initializeWindcaveDropIn();
      }, 100);
    }
  }, [windcaveSessionData, paymentProvider, bookingStep]);

  const initializeWindcaveDropIn = async (retryCount = 0) => {
    if (!windcaveSessionData || !window.WindcavePayments) {
      console.error("Windcave session data or WindcavePayments not available");
      return;
    }

    // Wait for DOM element to be available
    const container = document.getElementById('windcave-drop-in');
    if (!container) {
      if (retryCount < 10) { // Maximum 10 retries (1 second total)
        console.log(`Windcave container element not found, retrying... (${retryCount + 1}/10)`);
        setTimeout(() => initializeWindcaveDropIn(retryCount + 1), 100);
        return;
      } else {
        console.error("Windcave container element not found after maximum retries");
        toast({
          title: "Payment Setup Error",
          description: "Payment form container not found. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      console.log("Initializing Windcave Drop-In with session data:", windcaveSessionData);
      console.log("Container element found:", container);
      
      // Create the drop-in using the session data from the server
      const dropIn = window.WindcavePayments.DropIn.create({
        ...windcaveSessionData,
        container: 'windcave-drop-in', // Specify the container element ID
        // Override success/error callbacks
        onSuccess: async (status: string) => {
          console.log("=== WINDCAVE SUCCESS CALLBACK ===");
          console.log("Status:", status);
          
          if (status === "done") {
            console.log("Windcave transaction finished");
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            return;
          }
          
          // Handle payment success
          await handlePaymentSuccess();
        },
        onError: (error: any) => {
          console.error("=== WINDCAVE ERROR CALLBACK ===");
          console.error("Error:", error);
          toast({
            title: "Payment Error",
            description: error.message || "Payment failed. Please try again.",
            variant: "destructive"
          });
        },
        // Additional configuration options
        options: {
          enableAutoComplete: true,
          enableSecureForm: true,
          enableFormValidation: true,
          enableCardValidation: true,
          enableCardFormatting: true
        }
      } as any);
      window.windcaveDropIn = dropIn;
      
    } catch (error) {
      console.error("Error initializing Windcave Drop-In:", error);
      toast({
        title: "Payment Setup Error",
        description: "Failed to initialize payment form. Please refresh and try again.",
        variant: "destructive"
      });
    }
  };

  const loadWindcaveScripts = async (endpoint: string): Promise<void> => {
    return new Promise((resolve, reject) => {
    const baseUrl = endpoint === "SEC" ? "https://sec.windcave.com" : "https://uat.windcave.com";
    const scripts = [
      "/js/lib/drop-in-v1.js",
      "/js/windcavepayments-dropin-v1.js", 
      "/js/lib/hosted-fields-v1.js",
      "/js/windcavepayments-hostedfields-v1.js",
      "/js/windcavepayments-applepay-v1.js",
      "/js/windcavepayments-googlepay-v1.js"
    ];

    console.log(`Loading Windcave scripts for ${endpoint} endpoint from:`, baseUrl);
    
    // Check if scripts are already loaded
    const existingScripts = Array.from(document.head.querySelectorAll('script'))
      .filter(script => script.src.includes('windcave'));
    
    if (existingScripts.length > 0) {
      console.log("Windcave scripts already loaded:", existingScripts.map(s => s.src));
      resolve();
      return;
    }
    
    let loadedCount = 0;
    const totalScripts = scripts.length;
    
    scripts.forEach((scriptPath) => {
      const script = document.createElement('script');
      script.src = baseUrl + scriptPath;
      script.async = true;
      script.onload = () => {
        console.log(`✅ Windcave script loaded successfully: ${scriptPath}`);
        loadedCount++;
        
        if (scriptPath === "/js/windcavepayments-dropin-v1.js") {
          setTimeout(() => {
            console.log("Drop-in script loaded, WindcavePayments available:", !!window.WindcavePayments);
            if (window.WindcavePayments) {
              console.log("WindcavePayments object:", window.WindcavePayments);
              console.log("DropIn available:", !!window.WindcavePayments.DropIn);
            }
          }, 500);
        }
        
        if (loadedCount === totalScripts) {
          resolve();
        }
      };
      script.onerror = (error) => {
        console.error(`❌ Failed to load Windcave script: ${scriptPath}`, error);
        toast({
          title: "Script Loading Error", 
          description: `Failed to load ${scriptPath}. Please check your internet connection.`,
          variant: "destructive"
        });
        reject(error);
      };
      document.head.appendChild(script);
    });
    });
  };

  const loadAttractionData = async () => {
    try {
      const { data, error } = await supabase
        .from("attractions")
        .select(`
          *,
          organizations (
            payment_provider,
            currency,
            name,
            logo_url
          )
        `)
        .eq("id", attractionId)
        .single();

      if (error) throw error;
      setAttractionData(data as AttractionData);
      
      // Set payment provider from organization data
      if (data.organizations) {
        console.log("🔍 Organization payment provider:", data.organizations.payment_provider);
        setPaymentProvider(data.organizations.payment_provider || "stripe");
        
        // Load appropriate Windcave scripts if Windcave is the payment provider
        if (data.organizations.payment_provider === "windcave") {
          console.log("🔍 Loading Windcave scripts...");
          await loadWindcaveScripts("UAT"); // Default to UAT for public widgets
        }
      } else {
        console.log("⚠️ No organizations data found in attraction data");
      }
    } catch (error) {
      console.error("Error loading attraction:", error);
      toast({
        title: "Error",
        description: "Failed to load attraction details",
        variant: "destructive"
      });
    }
  };

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from("attraction_resources")
        .select("*")
        .eq("attraction_id", attractionId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error loading resources:", error);
    }
  };

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("booking_slots")
        .select("*")
        .eq("attraction_id", attractionId)
        .eq("status", "available")
        .gte("start_time", `${bookingForm.selectedDate}T00:00:00`)
        .lt("start_time", `${bookingForm.selectedDate}T23:59:59`)
        .order("start_time");

      if (bookingForm.selectedResourceId) {
        query = query.eq("resource_id", bookingForm.selectedResourceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out fully booked slots
      const availableSlots = data?.filter(slot => 
        slot.current_bookings < slot.max_capacity
      ) || [];

      setAvailableSlots(availableSlots);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createWindcaveSessionForBooking = async (bookingId: string) => {
    if (!bookingId || !attractionData) return;

    try {
      setLoading(true);
      
      const customerInfo = {
        name: bookingForm.customerName,
        email: bookingForm.customerEmail,
        phone: bookingForm.customerPhone
      };

      const bookingItems = [{
        id: bookingId,
        name: `${attractionData.name} - Booking`,
        quantity: bookingForm.partySize,
        price: totalPrice,
        type: 'attraction_booking'
      }];

      const requestPayload = { 
        attractionId: attractionId,
        bookingId: bookingId,
        items: bookingItems,
        customerInfo: customerInfo,
        isAttraction: true
      };

      console.log("Creating Windcave session for attraction booking...");
      console.log("=== REQUEST PAYLOAD ===");
      console.log("Full payload:", JSON.stringify(requestPayload, null, 2));
      console.log("isAttraction value:", requestPayload.isAttraction, "(type:", typeof requestPayload.isAttraction, ")");
      
      const { data, error } = await supabase.functions.invoke("windcave-session", {
        body: requestPayload
      });

      if (error) throw error;
      
      console.log("Windcave session created:", data);
      setWindcaveSessionData(data);
      setBookingStep('payment');
      
    } catch (error) {
      console.error("Error creating Windcave session:", error);
      toast({
        title: "Payment Setup Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPendingBooking = async () => {
    if (!bookingForm.selectedSlotId || !attractionData) {
      return;
    }

    setLoading(true);
    try {
      const selectedSlot = availableSlots.find(slot => slot.id === bookingForm.selectedSlotId);
      if (!selectedSlot) throw new Error("Selected slot not found");

      // Validation check
      if (!attractionData.organization_id) {
        console.error("Missing organization_id in attractionData:", attractionData);
        throw new Error("Missing organization information");
      }

      const totalAmount = (selectedSlot.price_override || attractionData.base_price) * bookingForm.partySize;

      // Generate a short booking reference that fits in VARCHAR(20)
      const shortRef = `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-3).toUpperCase()}`;
      
      const bookingData = {
        attraction_id: attractionId,
        booking_slot_id: bookingForm.selectedSlotId,
        organization_id: attractionData.organization_id,
        customer_name: bookingForm.customerName,
        customer_email: bookingForm.customerEmail,
        customer_phone: bookingForm.customerPhone || null,
        party_size: bookingForm.partySize,
        special_requests: bookingForm.specialRequests || null,
        total_amount: totalAmount,
        payment_status: 'pending',
        booking_status: 'pending',
        booking_reference: shortRef // Short reference that fits in VARCHAR(20)
      };

      console.log("=== BOOKING DATA DEBUG ===");
      console.log("Generated booking reference:", shortRef, "Length:", shortRef.length);
      console.log("Full booking data:", JSON.stringify(bookingData, null, 2));
      console.log("Field lengths:");
      Object.entries(bookingData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          console.log(`${key}: "${value}" (${value.length} chars)`);
        }
      });
      console.log("About to create booking via Edge Function...");

      const { data, error } = await supabase.functions.invoke('create-attraction-booking', {
        body: bookingData
      });

      if (error) throw error;
      
      if (!data.booking) {
        throw new Error('No booking data returned from function');
      }

      setPendingBookingId(data.booking.id);
      
      if (paymentProvider === "windcave") {
        // For Windcave, create session with the booking ID
        await createWindcaveSessionForBooking(data.booking.id);
      } else {
        // For Stripe, go directly to payment step
        setBookingStep('payment');
      }
      
      toast({
        title: "Booking Created",
        description: "Please complete payment to confirm your booking"
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!pendingBookingId) return;

    try {
      const selectedSlot = availableSlots.find(slot => slot.id === bookingForm.selectedSlotId);
      if (!selectedSlot) throw new Error("Selected slot not found");

      // Update booking status
      await supabase
        .from("attraction_bookings")
        .update({ 
          payment_status: 'paid',
          booking_status: 'confirmed'
        })
        .eq("id", pendingBookingId);

      // Update slot booking count
      await supabase
        .from("booking_slots")
        .update({ 
          current_bookings: selectedSlot.current_bookings + bookingForm.partySize
        })
        .eq("id", bookingForm.selectedSlotId!);

      // Send confirmation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-booking-email', {
          body: { bookingId: pendingBookingId! }
        });
        
        if (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      setBookingStep('confirmation');
      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed!"
      });
    } catch (error) {
      console.error("Error confirming booking:", error);
      toast({
        title: "Error",
        description: "Payment was successful but there was an issue confirming your booking. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(bookingForm.selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setBookingForm(prev => ({
      ...prev,
      selectedDate: currentDate.toISOString().split('T')[0],
      selectedSlotId: null
    }));
  };

  // Get user-configured resource label with fallback
  const getResourceLabel = () => {
    if (!attractionData) return "Resource";
    
    // Use user-configured label if available, otherwise fall back to "Resource"
    return attractionData.resource_label || "Resource";
  };

  const getResourceName = (resourceId: string | null) => {
    const label = getResourceLabel();
    if (!resourceId) return `Any ${label}`;
    const resource = resources.find(r => r.id === resourceId);
    return resource?.name || `Unknown ${label}`;
  };

  const selectedSlot = availableSlots.find(slot => slot.id === bookingForm.selectedSlotId);
  const totalPrice = selectedSlot ? (selectedSlot.price_override || attractionData?.base_price || 0) * bookingForm.partySize : 0;

  if (!attractionData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center">Loading attraction...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "max-w-4xl mx-auto p-4 space-y-6"} style={{ fontFamily: fontFamily }}>
      {/* Header (hidden in compact mode) */}
      {!compact && (
        <Card style={{ borderColor: primaryColor + '20' }}>
          <CardHeader>
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1">
                <CardTitle className="text-2xl" style={{ color: primaryColor }}>
                  {attractionData.name}
                </CardTitle>
                {attractionData.description && (
                  <p className="text-muted-foreground mt-1">{attractionData.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {attractionData.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {attractionData.duration_minutes} minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    From ${attractionData.base_price}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {bookingStep === 'booking' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Date & Resource Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Book Your Experience</CardTitle>
              <p className="text-gray-600">Choose your preferred date and time</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold" style={{ color: headerTextColor }}>Select a date</Label>
                
                {/* Enhanced Date Picker with Calendar Popup */}
                <div className="relative">
                  <div 
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer bg-white"
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    {/* Calendar Icon */}
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                    </div>
                    
                    {/* Date Display */}
                    <div className="flex-1">
                      <div className="text-lg font-medium" style={{ color: headerTextColor }}>
                        {formatDate(bookingForm.selectedDate)}
                      </div>
                      <div className="text-sm" style={{ color: bodyTextColor }}>
                        {new Date(bookingForm.selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long' 
                        })}
                      </div>
                    </div>
                    
                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          changeDate(-1);
                        }}
                        disabled={new Date(bookingForm.selectedDate) <= new Date()}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        style={{ color: headerTextColor }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          changeDate(1);
                        }}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        style={{ color: headerTextColor }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Calendar Popup */}
                  {showCalendar && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowCalendar(false)} />
                      
                      {/* Calendar */}
                      <div 
                        ref={calendarRef}
                        className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4 min-w-[320px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeMonth(-1)}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="font-semibold" style={{ color: headerTextColor }}>
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeMonth(1)}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium p-2" style={{ color: bodyTextColor }}>
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, index) => (
                          <button
                            key={index}
                            onClick={() => handleDateSelect(date)}
                            disabled={isPast(date)}
                            className={`
                              h-10 w-10 rounded-lg text-sm font-medium transition-colors
                              ${isToday(date) ? 'bg-blue-100 text-blue-700' : ''}
                              ${isSelected(date) ? 'bg-blue-600 text-white' : ''}
                              ${isPast(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                              ${!isToday(date) && !isSelected(date) && !isPast(date) ? 'text-gray-700' : ''}
                            `}
                          >
                            {date.getDate()}
                          </button>
                        ))}
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickDateSelect('tomorrow')}
                          className="flex-1 text-xs"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          Tomorrow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickDateSelect('weekend')}
                          className="flex-1 text-xs"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          This Weekend
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Hidden Date Input for Accessibility */}
                  <Input
                    type="date"
                    value={bookingForm.selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingForm(prev => ({ 
                      ...prev, 
                      selectedDate: e.target.value,
                      selectedSlotId: null
                    }))}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                
                {/* Quick Date Navigation */}
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: bodyTextColor }}>
                    {new Date(bookingForm.selectedDate) <= new Date() ? 'Today' : 'Available dates'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: bodyTextColor }}>Quick jump:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => quickDateSelect('tomorrow')}
                      className="h-6 px-2 text-xs hover:bg-gray-100"
                      style={{ color: primaryColor }}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => quickDateSelect('weekend')}
                      className="h-6 px-2 text-xs hover:bg-gray-100"
                      style={{ color: primaryColor }}
                    >
                      This Weekend
                    </Button>
                  </div>
                </div>
              </div>

              {/* Resource Selection */}
                            {resources.length > 0 && (
                <div className="space-y-2">
                  <Label>Select {getResourceLabel()} (Optional)</Label>
                  <Select
                    value={bookingForm.selectedResourceId || "any"}
                    onValueChange={(value) => setBookingForm(prev => ({
                      ...prev,
                      selectedResourceId: value === "any" ? null : value,
                      selectedSlotId: null
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Any available ${getResourceLabel().toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Available {getResourceLabel()}</SelectItem>
                      {resources.map(resource => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name} (Capacity: {resource.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Party Size */}
              <div className="space-y-2">
                <Label>Party Size</Label>
                <Select
                  value={bookingForm.partySize.toString()}
                  onValueChange={(value) => setBookingForm(prev => ({ 
                    ...prev, 
                    partySize: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} {size === 1 ? 'Person' : 'People'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary Sidebar */}
          <Card className="lg:col-span-1 h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attraction Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">{attractionData?.name}</h4>
                {attractionData?.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{attractionData.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {attractionData?.duration_minutes}min
                  </span>
                  {attractionData?.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {attractionData.venue}
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Selection Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="text-sm font-medium">
                    {new Date(bookingForm.selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                
                {selectedSlot && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="text-sm font-medium">
                      {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Party Size:</span>
                  <span className="text-sm font-medium">
                    {bookingForm.partySize} {bookingForm.partySize === 1 ? 'person' : 'people'}
                  </span>
                </div>

                {selectedSlot?.resource_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{getResourceLabel()}:</span>
                    <span className="text-sm font-medium">
                      {getResourceName(selectedSlot.resource_id)}
                    </span>
                  </div>
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Price */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    ${selectedSlot?.price_override || attractionData?.base_price || 0} × {bookingForm.partySize}
                  </span>
                  <span className="text-lg font-bold" style={{ color: primaryColor }}>
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Continue Button */}
              {bookingForm.selectedSlotId && (
                <Button 
                  className="w-full mt-4"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  onClick={() => {
                    // Scroll to customer details form
                    const detailsForm = document.getElementById('customer-details-form');
                    if (detailsForm) {
                      detailsForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  Continue to Details
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Time Slots - Now full width */}
      {bookingStep === 'booking' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Times for {new Date(bookingForm.selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading available times...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No available slots for this date</p>
                  <p className="text-sm text-gray-500 mb-4">Try selecting a different date or check back later</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setBookingForm(prev => ({ 
                        ...prev, 
                        selectedDate: tomorrow.toISOString().split('T')[0],
                        selectedSlotId: null
                      }));
                    }}
                  >
                    Try Tomorrow
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Session Times Grid - Enhanced */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setBookingForm(prev => ({ 
                          ...prev, 
                          selectedSlotId: slot.id 
                        }))}
                        className={`group relative p-5 border-2 rounded-xl text-center transition-all duration-300 transform hover:scale-105 ${
                          bookingForm.selectedSlotId === slot.id
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105 ring-2 ring-blue-200' 
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-gray-50'
                        }`}
                      >
                        {/* Selected Indicator */}
                        {bookingForm.selectedSlotId === slot.id && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                        
                        {/* Time Display */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className={`text-xl font-bold ${
                              bookingForm.selectedSlotId === slot.id ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {formatTime(slot.start_time)}
                            </div>
                            <div className="text-sm text-gray-500">
                              to {formatTime(slot.end_time)}
                            </div>
                          </div>
                          
                          {/* Resource Info */}
                          {slot.resource_id && (
                            <div className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                              {getResourceName(slot.resource_id)}
                            </div>
                          )}
                          
                          {/* Price Badge */}
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            bookingForm.selectedSlotId === slot.id 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${slot.price_override || attractionData.base_price}
                          </div>
                          
                          {/* Availability */}
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{slot.max_capacity - slot.current_bookings} spots left</span>
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                          bookingForm.selectedSlotId === slot.id 
                            ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10' 
                            : 'bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5'
                        }`} />
                      </button>
                    ))}
                  </div>
                  
                  {/* Quick Selection Hint */}
                  {!bookingForm.selectedSlotId && availableSlots.length > 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        👆 Select a time slot to continue with your booking
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {/* Customer Details Form - Now part of booking step */}
      {bookingStep === 'booking' && bookingForm.selectedSlotId && (
        <Card id="customer-details-form" className="scroll-mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Almost There! 🎉</CardTitle>
            <p className="text-gray-600">Just a few details to complete your booking</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={bookingForm.customerName}
                  onChange={(e) => setBookingForm(prev => ({ 
                    ...prev, 
                    customerName: e.target.value 
                  }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingForm.customerEmail}
                  onChange={(e) => setBookingForm(prev => ({ 
                    ...prev, 
                    customerEmail: e.target.value 
                  }))}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={bookingForm.customerPhone}
                  onChange={(e) => setBookingForm(prev => ({ 
                    ...prev, 
                    customerPhone: e.target.value 
                  }))}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requests">Special Requests (Optional)</Label>
              <Input
                id="requests"
                value={bookingForm.specialRequests}
                onChange={(e) => setBookingForm(prev => ({ 
                  ...prev, 
                  specialRequests: e.target.value 
                }))}
                placeholder="Any special requests or notes..."
              />
            </div>

            {/* Enhanced Action Buttons */}
            <div className="bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-lg border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setBookingForm(prev => ({ ...prev, selectedSlotId: null }))}
                  className="sm:w-auto"
                >
                  ← Back to Times
                </Button>
                <Button 
                  onClick={createPendingBooking}
                  disabled={!bookingForm.customerName || !bookingForm.customerEmail || loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Booking...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Secure Checkout - ${totalPrice.toFixed(2)}
                    </div>
                  )}
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Instant Confirmation</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Easy Cancellation</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingStep === 'payment' && pendingBookingId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Booking Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Attraction:</span>
                  <span className="font-medium">{attractionData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{formatDate(bookingForm.selectedDate)} at {selectedSlot && formatTime(selectedSlot.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Party Size:</span>
                  <span>{bookingForm.partySize} {bookingForm.partySize === 1 ? 'person' : 'people'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{getResourceLabel()}:</span>
                  <span>{getResourceName(selectedSlot?.resource_id || null)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span style={{ color: primaryColor }}>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Form - Conditional based on payment provider */}
            {paymentProvider === "stripe" ? (
              <AttractionStripePayment
                amount={totalPrice}
                currency="USD"
                description={`Booking for ${attractionData?.name}`}
                customerEmail={bookingForm.customerEmail}
                customerName={bookingForm.customerName}
                onSuccess={handlePaymentSuccess}
                onError={(error) => {
                  console.error('Payment failed:', error);
                  toast({
                    title: "Payment Failed",
                    description: error.message || "Please try again",
                    variant: "destructive"
                  });
                }}
                metadata={{
                  booking_id: pendingBookingId || '',
                  booking_slot_id: bookingForm.selectedSlotId || '',
                  attraction_id: attractionId,
                  booking_type: 'attraction',
                  organization_id: attractionData?.organization_id || '',
                  party_size: bookingForm.partySize.toString(),
                  special_requests: bookingForm.specialRequests || ''
                }}
                theme={{
                  primary: primaryColor,
                  secondary: primaryColor
                }}
              />
            ) : paymentProvider === "windcave" ? (
              <div className="space-y-4">
                {windcaveSessionData ? (
                  <div>
                    <div id="windcave-drop-in" className="min-h-[400px]"></div>
                    <p className="text-sm text-gray-600 mt-2">
                      Complete your payment using the secure Windcave payment form above.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Setting up secure payment...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-600">Unsupported payment provider: {paymentProvider}</p>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setBookingStep('booking')}
              >
                Back to Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingStep === 'confirmation' && (
        <Card style={{ borderColor: primaryColor }}>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
              Booking Confirmed!
            </h2>
            <p className="text-muted-foreground mb-4">
              Your booking for {attractionData.name} has been confirmed.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
              <h3 className="font-medium mb-2">Booking Details:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Date:</strong> {formatDate(bookingForm.selectedDate)}</p>
                <p><strong>Time:</strong> {selectedSlot && formatTime(selectedSlot.start_time)} - {selectedSlot && formatTime(selectedSlot.end_time)}</p>
                <p><strong>Party Size:</strong> {bookingForm.partySize}</p>
                <p><strong>{getResourceLabel()}:</strong> {getResourceName(selectedSlot?.resource_id || null)}</p>
                <p><strong>Total:</strong> ${totalPrice.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              A confirmation email will be sent to {bookingForm.customerEmail}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttractionBookingWidget;
