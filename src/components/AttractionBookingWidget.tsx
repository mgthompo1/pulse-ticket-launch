import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Theme } from "../types/theme";
import { 
  Calendar,
  Clock, 
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
import { SEOHead } from "@/components/SEOHead";

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
  widget_customization: Record<string, unknown>;
  organization_id: string;
  resource_label?: string | null; // User-configurable label for resources (e.g., "Simulator", "Room", "Lane")
  organizations?: {
    name: string;
    payment_provider?: string | null;
    currency?: string | null;
    logo_url?: string | null;
  }; // Organization data
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
  const [showBookingModal, setShowBookingModal] = useState(false);
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
  const theme = useMemo((): Theme => {
    const themeData = attractionData?.widget_customization?.theme || {};
    const isEnabled = themeData?.enabled === true;
    
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
        primaryColor: themeData?.primaryColor || '#000000',
        buttonTextColor: themeData?.buttonTextColor || '#ffffff',
        secondaryColor: themeData?.secondaryColor || '#ffffff',
        backgroundColor: themeData?.backgroundColor || '#ffffff',
        cardBackgroundColor: themeData?.cardBackgroundColor || themeData?.backgroundColor || '#ffffff',
        inputBackgroundColor: themeData?.inputBackgroundColor || '#ffffff',
        borderEnabled: themeData?.borderEnabled ?? false,
        borderColor: themeData?.borderColor || '#e5e7eb',
        headerTextColor: themeData?.headerTextColor || '#111827',
        bodyTextColor: themeData?.bodyTextColor || '#6b7280',
        fontFamily: themeData?.fontFamily || 'Manrope'
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
    const targetDate = new Date(today);
    
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

      let createdBookingId: string;

      try {
        // Try Edge Function first
        const { data, error } = await supabase.functions.invoke('create-attraction-booking', {
          body: bookingData
        });

        if (error) throw error;
        
        if (!data.booking) {
          throw new Error('No booking data returned from function');
        }

        createdBookingId = data.booking.id;
        setPendingBookingId(createdBookingId);
      } catch (functionError) {
        console.warn("Edge Function failed, falling back to direct database insert:", functionError);
        
        // Fallback to direct database insert
        const { data: directData, error: directError } = await supabase
          .from("attraction_bookings")
          .insert(bookingData)
          .select()
          .single();

        if (directError) {
          console.error("Direct database insert also failed:", directError);
          throw new Error(`Booking creation failed. Please try again or contact support. Error: ${directError.message}`);
        }

        createdBookingId = directData.id;
        setPendingBookingId(createdBookingId);
        console.log("Fallback booking creation successful");
      }
      
      if (paymentProvider === "windcave") {
        // For Windcave, create session with the booking ID
        await createWindcaveSessionForBooking(createdBookingId);
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

      toast({
        title: "Booking confirmed!",
        description: `Your ${attractionData?.name} booking has been confirmed. Check your email for details.`,
      });

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
      setShowBookingModal(false);
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
    <>
      {!compact && (
        <SEOHead
          title={`${attractionData?.name || 'Attraction'} - Book Now | TicketFlo`}
          description={attractionData?.description ? attractionData.description.replace(/<[^>]*>/g, '').substring(0, 155) + '...' : `Book ${attractionData?.name || 'this attraction'}. Secure online booking with TicketFlo.`}
          ogTitle={attractionData?.name || 'Attraction Booking'}
          ogDescription={attractionData?.description ? attractionData.description.replace(/<[^>]*>/g, '').substring(0, 155) + '...' : `Book ${attractionData?.name || 'this attraction'}`}
          ogImage={(attractionData as any)?.logo_url || "https://www.ticketflo.org/og-image.jpg"}
        />
      )}
      <div className={compact ? "space-y-4" : "max-w-6xl mx-auto bg-white"} style={{ fontFamily: fontFamily }}>
      {/* Logo/Image Hero Section */}
      {!compact && (
        <div className="bg-white py-8 px-4">
          {/* Back Button */}
          {onBack && (
            <div className="max-w-4xl">
              <div className="flex justify-start mb-6">
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Logo Container - Centered */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              {attractionData.logo_url ? (
                <img 
                  src={attractionData.logo_url} 
                  alt={`${attractionData.name} Logo`}
                  className="mx-auto max-h-64 w-auto object-contain rounded-lg shadow-lg"
                />
              ) : (
                /* Fallback with attraction type icon if no logo */
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="h-16 w-16" style={{ color: primaryColor }} />
                </div>
              )}

              {/* Organization Logo (if enabled and different from main logo) */}
              {attractionData?.widget_customization?.branding?.showOrgLogo && 
               attractionData.organizations?.logo_url && 
               attractionData.organizations.logo_url !== attractionData.logo_url && (
                <div className="mt-6">
                  <img 
                    src={attractionData.organizations.logo_url} 
                    alt={`${attractionData.organizations?.name || 'Organization'} Logo`}
                    className="h-12 mx-auto object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Text Container - Left Aligned */}
          <div className="max-w-4xl">
            <div className="space-y-6 text-left max-w-2xl">
              {/* Attraction Name */}
              <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: headerTextColor }}>
                {attractionData.name}
              </h1>

              {/* Venue */}
              {attractionData.venue && (
                <div className="flex items-center gap-3 text-xl" style={{ color: bodyTextColor }}>
                  <MapPin className="h-6 w-6" style={{ color: primaryColor }} />
                  <span className="font-medium">{attractionData.venue}</span>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-3 text-lg" style={{ color: bodyTextColor }}>
                <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                <span className="font-medium">{attractionData.duration_minutes} minute sessions</span>
              </div>

              {/* Pricing */}
              <div className="flex items-center gap-3 text-lg" style={{ color: bodyTextColor }}>
                <DollarSign className="h-5 w-5" style={{ color: primaryColor }} />
                <span className="font-medium">From ${attractionData.base_price}</span>
              </div>

              {/* Host/Organization */}
              {attractionData.organizations?.name && (
                <div className="flex items-center gap-3 text-lg" style={{ color: bodyTextColor }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <span className="text-xs text-white font-bold">H</span>
                  </div>
                  <span>Hosted by <span className="font-medium">{attractionData.organizations.name}</span></span>
                </div>
              )}

              {/* Custom Header Text */}
              {attractionData?.widget_customization?.branding?.customHeaderText && (
                <div 
                  className="text-xl leading-relaxed"
                  style={{ color: bodyTextColor }}
                  dangerouslySetInnerHTML={{ __html: attractionData?.widget_customization?.branding?.customHeaderText || '' }}
                />
              )}

              {/* Book Now CTA */}
              <div className="pt-4">
                <Button 
                  size="lg"
                  className="font-semibold px-12 py-4 text-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  onClick={() => {
                    const bookingSection = document.getElementById('booking-section');
                    if (bookingSection) {
                      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attraction Description Section - Like Humanitix */}
      {!compact && attractionData.description && (
        <div className="bg-white py-12 px-4">
          <div className="max-w-4xl">
            <div className="bg-white">
              <h2 className="text-2xl font-bold mb-6" style={{ color: headerTextColor }}>
                Experience description
              </h2>
              <div 
                className="text-lg leading-relaxed prose prose-lg max-w-none [&>p]:mb-4 [&>p]:leading-relaxed [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>ul]:ml-6 [&>ol]:ml-6 [&>li]:mb-2"
                style={{ color: bodyTextColor }}
                dangerouslySetInnerHTML={{ __html: attractionData.description }}
              />
            </div>
          </div>
        </div>
      )}

      {bookingStep === 'booking' && (
        <div id="booking-section" className={`grid gap-6 lg:grid-cols-3 ${compact ? 'pt-0' : 'pt-8 px-4'}`}>
          {/* Date & Resource Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
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
                              ${isSelected(date) ? 'text-white' : ''}
                              ${isPast(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                              ${!isToday(date) && !isSelected(date) && !isPast(date) ? 'text-gray-700' : ''}
                            `}
                            style={{
                              backgroundColor: isSelected(date) ? '#6B7280' : 
                                isToday(date) ? primaryColor + '20' : undefined,
                              color: isToday(date) && !isSelected(date) ? primaryColor : undefined
                            }}
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
                  <Label>
                    {attractionData?.widget_customization?.resourceSelection?.label || `Select ${getResourceLabel()} (Optional)`}
                  </Label>
                  <Select
                    value={bookingForm.selectedResourceId || "any"}
                    onValueChange={(value) => setBookingForm(prev => ({
                      ...prev,
                      selectedResourceId: value === "any" ? null : value,
                      selectedSlotId: null
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        attractionData?.widget_customization?.resourceSelection?.placeholder || 
                        `Any available ${getResourceLabel().toLowerCase()}`
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">
                        {attractionData?.widget_customization?.resourceSelection?.anyOption || `Any Available ${getResourceLabel()}`}
                      </SelectItem>
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
                  onClick={() => setShowBookingModal(true)}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setBookingForm(prev => ({ 
                          ...prev, 
                          selectedSlotId: slot.id 
                        }))}
                        className={`group relative p-4 border-2 rounded-lg text-center transition-all duration-200 hover:scale-102 ${
                          bookingForm.selectedSlotId === slot.id
                            ? 'text-white shadow-lg' 
                            : 'border-gray-200 bg-white hover:shadow-md'
                        }`}
                        style={{
                          borderColor: bookingForm.selectedSlotId === slot.id ? '#6B7280' : undefined,
                          backgroundColor: bookingForm.selectedSlotId === slot.id ? '#6B7280' : undefined,
                          '--hover-border-color': primaryColor + '40',
                          '--hover-bg-color': primaryColor + '10'
                        } as React.CSSProperties}
                      >
                        {/* Clean Time Display - Humanitix Style */}
                        <div className="space-y-2">
                          <div className={`text-lg font-bold ${
                            bookingForm.selectedSlotId === slot.id ? 'text-white' : 'text-gray-900'
                          }`}>
                            {formatTime(slot.start_time)}
                          </div>
                          
                          {/* Price */}
                          <div className={`text-sm font-medium ${
                            bookingForm.selectedSlotId === slot.id ? 'text-white/90' : 'text-gray-600'
                          }`}>
                            ${slot.price_override || attractionData.base_price}
                          </div>
                          
                          {/* Availability indicator */}
                          <div className={`text-xs ${
                            bookingForm.selectedSlotId === slot.id ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {slot.max_capacity - slot.current_bookings} left
                          </div>
                          
                          {/* Resource Info (if applicable) */}
                          {slot.resource_id && (
                            <div className={`text-xs px-2 py-1 rounded ${
                              bookingForm.selectedSlotId === slot.id 
                                ? 'bg-white/20 text-white/90' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {getResourceName(slot.resource_id)}
                            </div>
                          )}
                        </div>
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

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Complete Your Booking</DialogTitle>
            <DialogDescription>Just a few details and you're all set</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Details Form */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-name">Full Name *</Label>
                <Input
                  id="modal-name"
                  value={bookingForm.customerName}
                  onChange={(e) => setBookingForm(prev => ({ 
                    ...prev, 
                    customerName: e.target.value 
                  }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-email">Email Address *</Label>
                <Input
                  id="modal-email"
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
                <Label htmlFor="modal-phone">Phone Number</Label>
                <Input
                  id="modal-phone"
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
              <Label htmlFor="modal-requests">Special Requests (Optional)</Label>
              <Input
                id="modal-requests"
                value={bookingForm.specialRequests}
                onChange={(e) => setBookingForm(prev => ({ 
                  ...prev, 
                  specialRequests: e.target.value 
                }))}
                placeholder="Any special requests or notes..."
              />
            </div>

            {/* Payment Section */}
            {bookingStep === 'payment' && pendingBookingId && (
              <div className="space-y-4">
                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
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

                {/* Payment Form */}
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
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingForm(prev => ({ ...prev, selectedSlotId: null }));
                }}
                className="sm:w-auto"
              >
                ← Back to Times
              </Button>
              {bookingStep === 'booking' ? (
                <Button 
                  onClick={createPendingBooking}
                  disabled={!bookingForm.customerName || !bookingForm.customerEmail || loading}
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setBookingStep('booking')}
                >
                  Back to Details
                </Button>
              )}
            </div>
            

          </div>
        </DialogContent>
      </Dialog>



      {bookingStep === 'confirmation' && (
        <div className={`${compact ? '' : 'px-4'}`}>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-green-700">
                Booking Confirmed!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your booking for <strong>{attractionData.name}</strong> has been confirmed.
              </p>
            <div className="bg-white p-6 rounded-lg shadow-sm border max-w-lg mx-auto">
              <h3 className="font-semibold mb-4 text-gray-900">Your Booking Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{formatDate(bookingForm.selectedDate)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">
                    {selectedSlot && formatTime(selectedSlot.start_time)} - {selectedSlot && formatTime(selectedSlot.end_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Party Size</span>
                  <span className="font-medium">{bookingForm.partySize} {bookingForm.partySize === 1 ? 'person' : 'people'}</span>
                </div>
                {selectedSlot?.resource_id && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">{getResourceLabel()}</span>
                    <span className="font-medium">{getResourceName(selectedSlot.resource_id)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 bg-green-50 px-4 rounded-lg">
                  <span className="font-semibold text-green-700">Total Paid</span>
                  <span className="font-bold text-lg text-green-700">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 text-center flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                A confirmation email has been sent to <strong>{bookingForm.customerEmail}</strong>
              </p>
            </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </>
  );
};

export default AttractionBookingWidget;
