import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, ShoppingCart, ArrowLeft, Calendar, Ticket, CreditCard, MapPin, HelpCircle } from "lucide-react";
import { GuestSeatSelector } from "@/components/GuestSeatSelector";
import MerchandiseSelector from "@/components/MerchandiseSelector";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { 
  EventData, 
  TicketType, 
  CartItem, 
  MerchandiseCartItem, 
  CustomerInfo, 
  WindcaveLink, 
  CustomQuestion
} from "@/types/widget";
import { MultiStepCheckout } from "@/components/checkout/MultiStepCheckout";

// Extend the global Window interface to include WindcavePayments
declare global {
  interface Window {
    WindcavePayments?: {
      DropIn: {
        create: (config: WindcaveDropInConfig) => WindcaveDropInInstance;
      };
    };
    windcaveDropIn?: WindcaveDropInInstance | null;
  }
}

interface WindcaveDropInConfig {
  container: string;
  links: WindcaveLink[];
  totalValue: string;
  card: {
    hideCardholderName: boolean;
    supportedCards: string[];
    disableCardAutoComplete: boolean;
    cardImagePlacement: string;
    sideIcons: string[];
    enableCardValidation: boolean;
    enableCardFormatting: boolean;
  };
  security: {
    enableAutoComplete: boolean;
    enableSecureForm: boolean;
    enableFormValidation: boolean;
  };
  mobilePayments?: {
    buttonType: string;
    buttonStyle: string;
    buttonLocale: string;
    merchantName: string;
    countryCode: string;
    currencyCode: string;
    supportedNetworks: string[];
    isTest: boolean;
    applePay: {
      merchantId: string;
      onSuccess: (status: string) => Promise<boolean> | void;
      onError?: (stage: string, error: string) => void;
    };
    googlePay?: {
      onSuccess: (status: string) => Promise<boolean> | void;
      onError?: (stage: string, error: string) => void;
    };
  };
  onSuccess?: (status: string, data?: any) => Promise<void> | void;
  onError?: (error: string) => void;
  options: {
    enableAutoComplete: boolean;
    enableSecureForm: boolean;
    enableFormValidation: boolean;
    enableCardValidation: boolean;
    enableCardFormatting: boolean;
  };
}

interface WindcaveDropInInstance {
  close: () => void;
}

// Create an anonymous Supabase client for external users - moved outside component
const createAnonymousSupabaseClient = () => createClient(
  "https://yoxsewbpoqxscsutqlcb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const TicketWidget = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  
  // Add debugging for eventId
  console.log("=== URL DEBUG ===");
  console.log("Current URL:", window.location.href);
  console.log("Event ID from params:", eventId);
  console.log("Expected Kaleidoscope event ID: 4217e500-6744-4480-b419-b4c61f5dbe89");
  
  // Use useMemo to ensure the client is only created once
  const anonymousSupabase = useMemo(() => createAnonymousSupabaseClient(), []);
  
  // Add render counter for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  console.log(`TicketWidget render #${renderCount.current}`);
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  // Get theme colors and apply them consistently - use useMemo to recalculate when eventData changes
  const theme = useMemo(() => {
    const themeData = eventData?.widget_customization?.theme || {};
    const isEnabled = themeData.enabled === true;
    
    let newTheme;
    if (!isEnabled) {
      // Use default theme when customization is disabled
      newTheme = {
        enabled: false,
        primaryColor: '#000000', // Default black for buttons and progress bars (matching live project)
        buttonTextColor: '#ffffff', // White for button text
        secondaryColor: '#ffffff', // White for borders and secondary elements
        backgroundColor: '#ffffff', // White background
        headerTextColor: '#111827', // Dark gray for headers
        bodyTextColor: '#6b7280', // Lighter gray for body text (matching GitHub)
        fontFamily: 'Manrope' // Default to Manrope
      };
    } else {
      // Use custom theme when enabled
      newTheme = {
        enabled: true,
        primaryColor: themeData.primaryColor || '#ff4d00', // Orange for buttons
        buttonTextColor: themeData.buttonTextColor || '#ffffff', // White for button text
        secondaryColor: themeData.secondaryColor || '#ffffff', // White for borders and secondary elements
        backgroundColor: themeData.backgroundColor || '#ffffff', // White background
        headerTextColor: themeData.headerTextColor || '#111827', // Dark gray for headers
        bodyTextColor: themeData.bodyTextColor || '#6b7280', // Lighter gray for body text (matching GitHub)
        fontFamily: themeData.fontFamily || 'Manrope'
      };
    }
    
    console.log("🎨 Theme recalculated:", newTheme);
    console.log("🎨 Event data widget_customization:", eventData?.widget_customization);
    console.log("🎨 Raw theme data:", themeData);
    console.log("🎨 Theme customization enabled:", isEnabled);
    
    return newTheme;
  }, [eventData?.widget_customization?.theme]);

  // Destructure theme colors for easier use
        const { primaryColor, buttonTextColor, backgroundColor, headerTextColor, bodyTextColor, fontFamily } = theme;
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<MerchandiseCartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: ""
  });
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [windcaveDropIn, setWindcaveDropIn] = useState<WindcaveDropInInstance | null>(null);
  const [, setWindcaveLinks] = useState<WindcaveLink[]>([]);
  const dropInRef = useRef<HTMLDivElement>(null);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [pendingSeatSelection, setPendingSeatSelection] = useState<CartItem | null>(null);
  const [, setSelectedSeats] = useState<Record<string, string[]>>({});
  const [creditCardProcessingFee, setCreditCardProcessingFee] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  
  // Debug effect to monitor Stripe key changes
  useEffect(() => {
    console.log("🔑 Stripe publishable key changed:", stripePublishableKey ? "Key loaded" : "No key");
  }, [stripePublishableKey]);

  // Function to refresh widget data
  const refreshWidgetData = useCallback(async () => {
    if (!eventId) return;
    
    try {
      console.log("🔄 Refreshing widget data...");
      console.log("🔄 Current checkout mode:", checkoutMode);
      console.log("🔄 Current widget customization:", eventData?.widget_customization);
      
      // Add timestamp to bypass any caching
      const timestamp = Date.now();
      console.log("🔄 Refresh timestamp:", timestamp);
      
      // Small delay to ensure database changes are propagated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch the complete event data to ensure we get the latest
      const { data: eventUpdate, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          organizations (
            name,
            payment_provider,
            currency,
            logo_url,
            credit_card_processing_fee_percentage
          )
        `)
        .eq("id", eventId as string)
        .eq("status", "published")
        .single();

      if (!eventError && eventUpdate) {
        console.log("🔄 Fresh event data loaded:", eventUpdate);
        console.log("🔄 Fresh widget customization:", eventUpdate.widget_customization);
        console.log("🔄 Fresh checkout mode:", (eventUpdate.widget_customization as any)?.checkoutMode);
        
        setEventData(eventUpdate);
        console.log("✅ Widget data refreshed successfully");
      } else {
        console.error("❌ Error refreshing widget data:", eventError);
      }
    } catch (error) {
      console.error("Error refreshing widget data:", error);
    }
  }, [eventId, eventData?.widget_customization]);

  // Auto-refresh widget data every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshWidgetData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [refreshWidgetData]);

  // Add a small delay after event data changes to ensure checkout mode is updated
  useEffect(() => {
    if (eventData?.widget_customization?.checkoutMode) {
      // Small delay to ensure state updates properly
      const timer = setTimeout(() => {
        console.log("⏰ Delayed checkout mode update for:", eventData.widget_customization.checkoutMode);
        setCheckoutMode(eventData.widget_customization.checkoutMode);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [eventData?.widget_customization?.checkoutMode]);

  // Function to test database connection and fetch raw data
  const testDatabaseConnection = useCallback(async () => {
    if (!eventId) return;
    
    try {
      console.log("🧪 Testing database connection...");
      
      // Test 1: Direct event query
      const { data: directEvent, error: directError } = await supabase
        .from("events")
        .select("widget_customization")
        .eq("id", eventId)
        .single();
      
      console.log("🧪 Direct event query result:", { directEvent, directError });
      
      // Test 2: Query with timestamp to bypass cache
      const timestamp = Date.now();
      const { data: timestampedEvent, error: timestampedError } = await supabase
        .from("events")
        .select("widget_customization")
        .eq("id", eventId)
        .eq("status", "published")
        .single();
      
      console.log("🧪 Timestamped event query result:", { timestampedEvent, timestampedError, timestamp });
      
      // Test 3: Check if checkoutMode exists in the data
      if (directEvent?.widget_customization) {
        console.log("🧪 Widget customization keys:", Object.keys(directEvent.widget_customization));
        console.log("🧪 Checkout mode value:", (directEvent.widget_customization as any)?.checkoutMode);
        console.log("🧪 Full widget customization:", directEvent.widget_customization);
      }
      
    } catch (error) {
      console.error("🧪 Database connection test error:", error);
    }
  }, [eventId]);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // State for custom question answers
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  // State for checkout mode
  const [checkoutMode, setCheckoutMode] = useState<'onepage' | 'multistep'>('onepage');

  const loadEventData = useCallback(async () => {
    try {
      console.log("=== LOADING EVENT DATA ===");
      console.log("Event ID:", eventId);
      
      // Load event details with safe payment configuration
              // Add timestamp to ensure we get fresh data and bypass any caching
        const timestamp = Date.now();
        console.log("🔄 Loading event data with timestamp:", timestamp);
      
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          organizations (
            name,
            payment_provider,
            currency,
            logo_url,
            credit_card_processing_fee_percentage
          )
        `)
        .eq("id", eventId as string)
        .single();

      if (eventError) {
        console.error("Event error:", eventError);
        throw eventError;
      }

      if (!event) {
        throw new Error("Event not found or not published");
      }

      console.log("=== LOADED EVENT DATA ===");
      console.log("Full event object:", event);
      console.log("Event status:", event.status);
      console.log("Event published?", event.status === 'published');
      console.log("Widget customization:", event.widget_customization);
      console.log("Widget customization type:", typeof event.widget_customization);
      console.log("Widget customization keys:", event.widget_customization ? Object.keys(event.widget_customization) : 'none');
      const widgetCustomization = event.widget_customization as any;
      console.log("Widget customization theme:", widgetCustomization?.theme);
      console.log("Widget customization theme keys:", widgetCustomization?.theme ? Object.keys(widgetCustomization.theme) : 'none');

      setEventData(event);

      // Get safe payment configuration from organization data
      if (event.organizations) {
        console.log("🔍 Organization payment provider:", event.organizations.payment_provider);
        setPaymentProvider(event.organizations.payment_provider || "stripe");
        setCreditCardProcessingFee(event.organizations.credit_card_processing_fee_percentage || 0);
        
        // Load payment configuration including Stripe publishable key
        try {
          console.log("🔍 Loading payment config for event:", eventId);
          const { data: paymentConfig, error: configError } = await supabase
            .rpc('get_public_payment_config', { 
              p_event_id: eventId as string
            });

          console.log("🔍 Payment config result:", { paymentConfig, configError });

          if (!configError && paymentConfig && paymentConfig.length > 0) {
            const config = paymentConfig[0];
            console.log("🔍 Payment config details:", config);
            if (config.stripe_publishable_key) {
              setStripePublishableKey(config.stripe_publishable_key);
              console.log("✅ Stripe publishable key loaded successfully");
            } else {
              console.warn("⚠️ No Stripe publishable key found in payment config");
            }
          } else {
            console.warn("⚠️ No payment config found or error occurred:", configError);
          }
        } catch (configError) {
          console.error("Error loading payment config:", configError);
        }

        // Note: Widget customization is already loaded in the initial event data above
        console.log("🔍 Widget customization from initial load:", event.widget_customization);
        console.log("🔍 Checkout mode from initial load:", (event.widget_customization as any)?.checkoutMode);
      }

      // Load ticket types
      const { data: types, error: typesError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId as string)
        .order("price", { ascending: true });

      if (typesError) {
        console.error("Ticket types error:", typesError);
        throw typesError;
      }

      setTicketTypes(types || []);
      
      // Load appropriate Windcave scripts if Windcave is the payment provider
      if (event.organizations?.payment_provider === "windcave") {
        await loadWindcaveScripts("UAT"); // Default to UAT for public widgets
      }
      
    } catch (error) {
      console.error("Error loading event data:", error);
      toast({
        title: "Error",
        description: "Failed to load event information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    if (eventId) {
      console.log("=== TicketWidget mounting or eventId changed ===");
              loadEventData();
    }
  }, [eventId, loadEventData]);

  // Debug effect to log theme changes
  useEffect(() => {
    console.log("🎨 Theme effect triggered - Current theme:", theme);
    console.log("🎨 Event data widget_customization:", eventData?.widget_customization);
  }, [theme, eventData?.widget_customization]);

  // Check if multi-step checkout should be used based on widget customization
  useEffect(() => {
    console.log("=== CHECKOUT MODE UPDATE EFFECT ===");
    console.log("Event data:", eventData);
    console.log("Widget customization:", eventData?.widget_customization);
    console.log("CheckoutMode from data:", eventData?.widget_customization?.checkoutMode);
    console.log("Current checkoutMode state:", checkoutMode);
    
    if (eventData?.widget_customization?.checkoutMode) {
      const newMode = eventData.widget_customization.checkoutMode;
      console.log("🔄 Setting checkout mode to:", newMode);
      console.log("Previous checkout mode was:", checkoutMode);
      setCheckoutMode(newMode);
    } else if (eventData) {
      // If no checkout mode is explicitly set in widget customization, default to onepage
      console.log("No checkoutMode found in widget_customization, defaulting to onepage");
      if (checkoutMode !== 'onepage') {
        console.log("🔄 CHECKOUT MODE CHANGING FROM", checkoutMode, "TO onepage (default)");
        setCheckoutMode('onepage');
      }
    }
  }, [eventData?.widget_customization?.checkoutMode, eventData?.id]); // Remove checkoutMode from dependencies to prevent circular updates

  // Function to dynamically load Windcave scripts based on endpoint
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

  // Function to check if all required Windcave components are loaded
  const checkWindcaveReadiness = () => {
    const checks = {
      "window.WindcavePayments": !!window.WindcavePayments,
      "WindcavePayments.DropIn": !!(window.WindcavePayments?.DropIn),
      "WindcavePayments.DropIn.create": !!(window.WindcavePayments?.DropIn?.create),
    };
    
    console.log("Windcave readiness check:", checks);
    return Object.values(checks).every(Boolean);
  };

  const addToCart = async (ticketType: TicketType) => {
    console.log("=== ADD TO CART DEBUG ===");
    console.log("Event ID:", eventId);
    console.log("Ticket Type:", ticketType);
    
    // First check if seat maps are enabled in event customization
    const seatMapsEnabled = eventData?.widget_customization?.seatMaps?.enabled;
    console.log("Seat maps enabled in customization:", seatMapsEnabled);
    
    // Only check for seat maps if they're enabled in customization
    if (seatMapsEnabled) {
      console.log("Checking for seat maps in database...");
      
      const { data: seatMaps, error: seatMapError } = await anonymousSupabase
        .from('seat_maps')
        .select('id, name, total_seats')
        .eq('event_id', eventId as string);

      console.log("Seat maps query result:", seatMaps);
      console.log("Seat maps query error:", seatMapError);
      console.log("Number of seat maps found:", seatMaps?.length || 0);

      if (seatMaps && seatMaps.length > 0) {
        // Event has seating - show seat selector
        console.log("🎫 Found seat maps, showing seat selection");
        setPendingSeatSelection({
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          quantity: 1,
          quantity_available: ticketType.quantity_available,
          quantity_sold: ticketType.quantity_sold,
          description: ticketType.description,
          event_id: eventId as string,
          type: 'ticket'
        });
        console.log("Setting showSeatSelection to true");
        setShowSeatSelection(true);
        return;
      }
    }

    console.log("❌ Seat maps disabled or not found, adding directly to cart");
    // No seating or seat maps disabled - add directly to cart
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === ticketType.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === ticketType.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...ticketType, quantity: 1, type: 'ticket' as const }];
      }
    });
  };

  const removeFromCart = (ticketTypeId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== ticketTypeId));
  };

  const updateCartQuantity = (ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(ticketTypeId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === ticketTypeId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleSeatsSelected = (seats: string[]) => {
    if (pendingSeatSelection) {
      const newCartItem = {
        ...pendingSeatSelection,
        quantity: pendingSeatSelection.quantity,
        selectedSeats: seats
      };

      setCart(prevCart => [...prevCart, newCartItem]);
      setSelectedSeats(prev => ({
        ...prev,
        [pendingSeatSelection.id]: seats
      }));
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  const handleSkipSeatSelection = () => {
    if (pendingSeatSelection) {
      const newCartItem = {
        ...pendingSeatSelection,
        quantity: pendingSeatSelection.quantity
      };
      setCart(prevCart => [...prevCart, newCartItem]);
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  const getMerchandiseTotal = () => {
    return merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  };

  const getTotalAmount = () => {
    const ticketTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseTotal = getMerchandiseTotal();
    const subtotal = ticketTotal + merchandiseTotal;
    
    // Apply credit card processing fee if configured
    const processingFeeAmount = creditCardProcessingFee > 0 ? (subtotal * creditCardProcessingFee / 100) : 0;
    
    return subtotal + processingFeeAmount;
  };

  // Optimize custom questions with useMemo
  const customQuestions = useMemo(() => {
    const questions = eventData?.widget_customization?.customQuestions?.enabled
      ? eventData.widget_customization.customQuestions.questions || []
      : [];

    // Only log once when questions change
    if (questions.length > 0) {
      console.log("=== CUSTOM QUESTIONS DEBUG ===");
      console.log("Custom questions enabled:", eventData?.widget_customization?.customQuestions?.enabled);
      console.log("Custom questions count:", questions.length);
      console.log("First question:", questions[0]);
    }

    return questions;
  }, [eventData?.widget_customization?.customQuestions]);

  // Validate custom questions before checkout
  const validateCustomQuestions = () => {
    const errors: Record<string, string> = {};
    customQuestions.forEach((q: CustomQuestion) => {
      if (q.required && !customAnswers[q.id]?.toString().trim()) {
        errors[q.id] = 'This field is required.';
      }
    });
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (cart.length === 0 && merchandiseCart.length === 0) {
      toast({
        title: "Error",
        description: "Please add tickets or merchandise to your cart first",
        variant: "destructive"
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Error", 
        description: "Please provide your name and email address",
        variant: "destructive"
      });
      return;
    }

    // Validate custom questions
    if (!validateCustomQuestions()) {
      toast({
        title: "Error",
        description: "Please answer all required questions.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare items for checkout (both tickets and merchandise)
      const allItems = [
        ...cart.map(item => ({ ...item, type: 'ticket' })),
        ...merchandiseCart.map(item => ({ 
          ...item.merchandise, 
          quantity: item.quantity,
          type: 'merchandise',
          selectedSize: (item as any).selectedSize,
          selectedColor: (item as any).selectedColor
        }))
      ];

      // Include customAnswers in customerInfo
      const fullCustomerInfo = { ...customerInfo, customAnswers };

      if (paymentProvider === "windcave") {
        // Create Windcave session and initialize Drop-In
        const { data, error } = await anonymousSupabase.functions.invoke("windcave-session", {
          body: { 
            eventId, 
            items: allItems,
            customerInfo: fullCustomerInfo
          }
        });

        if (error) throw error;

        console.log("=== WINDCAVE FRONTEND RESPONSE ===");
        console.log("Full Windcave response received:", JSON.stringify(data, null, 2));
        console.log("Links array:", data.links);

        if (data.links && Array.isArray(data.links)) {
          setWindcaveLinks(data.links);
          setShowPaymentForm(true);
          
          // Initialize Windcave Drop-In after state update
          setTimeout(() => {
            initializeWindcaveDropIn(data.links, data.totalAmount);
          }, 100);
        } else {
          console.error("No links array found. Full response:", data);
          throw new Error("Invalid response from Windcave: Missing links array");
        }
      } else {
        // Handle Stripe payment (existing logic)
        console.log("🔍 Starting Stripe checkout with key:", stripePublishableKey ? "Key available" : "No key");
        
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { 
            eventId, 
            items: allItems,
            customerInfo: fullCustomerInfo
          }
        });

        if (error) throw error;

        if (!stripePublishableKey) {
          throw new Error("Stripe publishable key not loaded. Please check organization payment configuration.");
        }

        const stripe = await loadStripe(stripePublishableKey);
        if (!stripe) throw new Error("Failed to load Stripe");

        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });

        if (stripeError) throw stripeError;
      }
     } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during checkout",
        variant: "destructive"
      });
    }
  };


  const initializeWindcaveDropIn = (links: WindcaveLink[], totalAmount: number) => {
    console.log("=== INITIALIZING WINDCAVE DROP-IN ===");
    console.log("Links received:", links);
    console.log("Total amount:", totalAmount);
    console.log("Event data:", eventData);
    console.log("Window WindcavePayments available:", !!window.WindcavePayments);
    
    // Check if WindcavePayments is available
    if (typeof window !== 'undefined' && checkWindcaveReadiness()) {
      console.log("✅ All Windcave components are ready");
      console.log("WindcavePayments object:", window.WindcavePayments);
      
      const dropInContainer = dropInRef.current;
      if (!dropInContainer) {
        console.error("Drop-in container not found - dropInRef.current is null");
        toast({
          title: "Payment System Error",
          description: "Payment container not found. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Drop-in container found:", dropInContainer);
      console.log("Container ID:", dropInContainer.id);

      try {
        console.log("=== CREATING DROP-IN CONFIGURATION ===");
        console.log("Organization config:", eventData?.organizations);
        console.log("Apple Pay Merchant ID:", eventData?.organizations?.apple_pay_merchant_id);
        const data = {
          container: "windcave-drop-in",
          links: links,
          totalValue: totalAmount.toString(), // Must be string as per sample
          card: {
            hideCardholderName: true,
            supportedCards: ["visa", "mastercard", "amex"], // lowercase as per sample
            disableCardAutoComplete: false, // This should be false to enable auto-fill
            cardImagePlacement: "right",
            sideIcons: ["visa", "mastercard", "amex"],
            // Add security settings
            enableCardValidation: true,
            enableCardFormatting: true
          },
          // Add security configuration
          security: {
            enableAutoComplete: true,
            enableSecureForm: true,
            enableFormValidation: true
          },
          // Mobile Payments configuration matching sample structure
          mobilePayments: eventData?.organizations?.apple_pay_merchant_id ? {
            buttonType: "plain", // Matching sample
            buttonStyle: "black",
            buttonLocale: "en-US",
            merchantName: eventData.organizations.name || "Event Tickets",
            countryCode: "NZ",
            currencyCode: "NZD", // Uppercase as required
            supportedNetworks: ["visa", "mastercard", "amex"], // lowercase as per sample
            isTest: eventData.organizations.windcave_endpoint !== "SEC",
            // Apple Pay configuration matching sample
            applePay: {
              merchantId: eventData.organizations.apple_pay_merchant_id,
               onSuccess: function(status: string) {
                console.log("=== APPLE PAY SUCCESS CALLBACK ===");
                console.log("Apple Pay status:", status);
                
                if (status === "done") {
                  console.log("Apple Pay transaction finished");
                  if (window.windcaveDropIn) {
                    window.windcaveDropIn.close();
                    window.windcaveDropIn = null;
                  }
                  return;
                }
                
                // Return Promise for non-done status as per sample
                return new Promise(async (resolve) => {
                  try {
                    console.log("Processing Apple Pay transaction...");
                    
                    // Extract session ID from links for completion
                    const sessionId = links[0]?.href?.split('/').pop();
                    
                    if (sessionId && eventData) {
                      toast({
                        title: "Apple Pay Successful!",
                        description: "Finalizing your order...",
                      });
                      
                // Call the Drop In success function to finalize the order
                const { error } = await anonymousSupabase.functions.invoke('windcave-dropin-success', {
                        body: { 
                          sessionId: sessionId,
                          eventId: eventData.id
                        }
                      });

                      if (error) {
                        console.error("Apple Pay finalization error:", error);
                        resolve(false);
                        return;
                      }

                      toast({
                        title: "Order Complete!",
                        description: "Your tickets have been confirmed via Apple Pay.",
                      });
                      
                      resolve(true);
                      
                      // Delay redirect to allow Apple Pay to show success
                      setTimeout(() => {
                        window.location.href = '/payment-success';
                      }, 2000);
                      
                    } else {
                      resolve(false);
                    }
                  } catch (error) {
                    console.error("Apple Pay order finalization error:", error);
                    resolve(false);
                  }
                });
              },
              onError: function(stage: any, error: any) {
                console.error("=== APPLE PAY ERROR CALLBACK ===");
                console.error("Stage:", stage, "Error:", error);
                
                if (stage === "submit" || stage === "transaction") {
                  console.log("Apple Pay transaction failed");
                  if (window.windcaveDropIn) {
                    window.windcaveDropIn.close();
                    window.windcaveDropIn = null;
                  }
                }
                
                toast({
                  title: "Apple Pay Failed",
                  description: `Payment failed at ${stage} stage`,
                  variant: "destructive"
                });
              }
            },
            // Google Pay configuration matching sample
            googlePay: {
              merchantId: "NEEDS_WINDCAVE_MERCHANT_ID", // This should come from Windcave
              googleMerchantId: "00000000", // Use 00000000 for test as per sample
              supportPANOnly: true,
              supportTokens: true,
              onSuccess: function(status: any) {
                console.log("=== GOOGLE PAY SUCCESS CALLBACK ===");
                if (status === "done") {
                  console.log("Google Pay transaction finished");
                  if (window.windcaveDropIn) {
                    window.windcaveDropIn.close();
                    window.windcaveDropIn = null;
                  }
                }
              },
              onError: function(stage: any, error: any) {
                console.error("=== GOOGLE PAY ERROR CALLBACK ===");
                console.error("Stage:", stage, "Error:", error);
                
                if (stage === "submit" || stage === "transaction") {
                  console.log("Google Pay transaction failed");
                  if (window.windcaveDropIn) {
                    window.windcaveDropIn.close();
                    window.windcaveDropIn = null;
                  }
                }
              }
            }
          } : undefined,
          // Optional callback triggered when payment starts
          onPaymentStart: (paymentMethod: string, next: () => void) => {
            console.log("=== PAYMENT START CALLBACK ===");
            console.log("Payment method selected:", paymentMethod);
            
            // Perform any pre-payment validation or preparation here
            // For now, just proceed with the payment
            next();
          },
          // General onSuccess callback (for non-Apple Pay payments)
          onSuccess: async (status: string, data?: any) => {
            console.log("=== WINDCAVE SUCCESS CALLBACK ===");
            console.log("Success status:", status);
            console.log("Success data:", data);
            
            // Critical: Handle 3DSecure authentication flow
            if (status == "3DSecure") {
              console.log("3DSecure authentication in progress...");
              return;
            }
            
            console.log("Transaction finished");
            
            // Close the drop-in widget
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            
            // Extract session ID from links for completion
            const sessionId = links[0]?.href?.split('/').pop();
            console.log("=== DEBUG INFO ===");
            console.log("Full link:", links[0]?.href);
            console.log("Extracted sessionId:", sessionId);
            console.log("Event ID:", eventData?.id);
            
            if (sessionId && eventData) {
              toast({
                title: "Payment Successful!",
                description: "Finalizing your order...",
              });
              
              try {
                console.log("=== CALLING WINDCAVE DROPIN SUCCESS ===");
                console.log("About to call function with:", {
                  sessionId: sessionId,
                  eventId: eventData.id
                });
                
                // Call the Drop In success function to finalize the order
                const { data, error } = await anonymousSupabase.functions.invoke('windcave-dropin-success', {
                  body: { 
                    sessionId: sessionId,
                    eventId: eventData.id
                  }
                });

                console.log("=== FUNCTION RESPONSE ===");
                console.log("Data:", data);
                console.log("Error:", error);

                if (error) {
                  console.error("=== WINDCAVE DROPIN SUCCESS ERROR ===");
                  console.error("Full error object:", error);
                  console.error("Error message:", error.message);
                  console.error("Error details:", error.details);
                  throw error;
                }

                console.log("=== WINDCAVE DROPIN SUCCESS DATA ===");
                console.log("Response data:", data);

                toast({
                  title: "Order Complete!",
                  description: `Your tickets have been confirmed. Check your email for details.`,
                });
                
                // Redirect to success page
                setTimeout(() => {
                  window.location.href = '/payment-success';
                }, 1500);
                
               } catch (error: any) {
                console.error("=== COMPLETE ERROR DETAILS ===");
                console.error("Error finalizing order:", error);
                console.error("Error type:", typeof error);
                console.error("Error constructor:", error?.constructor?.name);
                console.error("Error stack:", error?.stack);
                toast({
                  title: "Payment Processed",
                  description: "Payment successful but there was an issue finalizing your order. Please contact support.",
                  variant: "destructive"
                });
              }
            } else {
              toast({
                title: "Payment Complete",
                description: "Your payment has been processed successfully!",
              });
              
              // Redirect to success page
              setTimeout(() => {
                window.location.href = '/payment-success';
              }, 1500);
            }
          },
          // General onError callback (for non-Apple Pay payments)
          onError: (error: any) => {
            console.error("=== WINDCAVE ERROR CALLBACK ===");
            console.error("Transaction failed:", error);
            
            // Close the drop-in widget
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            
            let errorMessage = "Payment failed. Please try again.";
            if (typeof error === 'string') {
              errorMessage = error;
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive"
            });
            
            setShowPaymentForm(false);
          }
        };

        console.log("Initializing Windcave Drop-In with data:", data);
        
        // Create the drop-in using the simpler approach from the example
        window.windcaveDropIn = window.WindcavePayments?.DropIn.create({
          ...data,
          // Additional configuration to ensure proper security
          options: {
            enableAutoComplete: true,
            enableSecureForm: true,
            enableFormValidation: true,
            enableCardValidation: true,
            enableCardFormatting: true
          }
        } as any);
        
      } catch (error: any) {
        console.error("=== DROP-IN INITIALIZATION ERROR ===");
        console.error("Error:", error);
        console.error("Error type:", typeof error);
        console.error("Error message:", error?.message);
        console.error("Error stack:", error?.stack);
        console.error("Links provided:", links);
        console.error("Total amount:", totalAmount);
        console.error("Event data:", eventData);
        console.error("WindcavePayments available:", !!window.WindcavePayments);
        
        toast({
          title: "Payment System Error",
          description: `Failed to initialize payment form: ${error?.message || 'Unknown error'}. Please refresh and try again.`,
          variant: "destructive"
        });
        setShowPaymentForm(false);
      }
    } else {
      console.log("WindcavePayments not available yet, retrying...");
      console.log("Available properties on window:", Object.keys(window).filter(k => k.toLowerCase().includes('wind')));
      const retryCount = (window as any).windcaveRetryCount || 0;
      if (retryCount < 10) {
        (window as any).windcaveRetryCount = retryCount + 1;
        console.log(`Retry attempt ${retryCount + 1}/10 in 1 second...`);
        setTimeout(() => initializeWindcaveDropIn(links, totalAmount), 1000);
      } else {
        console.error("WindcavePayments failed to load after multiple retries");
        console.error("Final check - window.WindcavePayments:", window.WindcavePayments);
        console.error("Scripts in head:", Array.from(document.head.querySelectorAll('script')).map(s => s.src));
        toast({
          title: "Payment System Unavailable",
          description: "Unable to load payment system. Please refresh the page and try again.",
          variant: "destructive"
        });
        setShowPaymentForm(false);
      }
    }
  };


  const handleBackToTickets = () => {
    setShowPaymentForm(false);
    setWindcaveLinks([]);
    if (windcaveDropIn) {
      // Clean up Drop-In instance if needed
      setWindcaveDropIn(null);
    }
  };

  // Optimize checkout mode decision with useMemo
  const shouldRenderMultiStep = useMemo(() => {
    const isMultiStep = checkoutMode === 'multistep' && eventData;
    
    // Debug logging
    console.log("=== CHECKOUT MODE DECISION DEBUG ===");
    console.log("checkoutMode:", checkoutMode);
    console.log("eventData exists:", !!eventData);
    console.log("widget_customization:", eventData?.widget_customization);
    console.log("checkoutMode from widget:", eventData?.widget_customization?.checkoutMode);
    console.log("isMultiStep:", isMultiStep);
    
    // Only log once when the decision changes
    if (isMultiStep) {
      console.log("✅ Rendering MultiStepCheckout component");
    } else {
      console.log("❌ Rendering single-page checkout");
    }
    
    return isMultiStep;
  }, [checkoutMode, eventData]);

  // Render multi-step checkout if enabled
  if (shouldRenderMultiStep && eventData) {
    return (
      <MultiStepCheckout
        eventData={eventData!}
        ticketTypes={ticketTypes}
        customQuestions={customQuestions}
      />
    );
  }

  // Don't render the main content until we have both eventData and theme data
  const isReady = eventData && 
                 eventData.widget_customization?.theme && 
                 // Check if theme customization is enabled, if so require all properties
                 // If disabled, just check that we have the basic theme object
                 (eventData.widget_customization.theme.enabled === false || 
                  (eventData.widget_customization.theme.primaryColor &&
                   eventData.widget_customization.theme.secondaryColor &&
                   eventData.widget_customization.theme.backgroundColor &&
                   (eventData.widget_customization.theme.headerTextColor || eventData.widget_customization.theme.textColor)));
                 
  // Debug logging for theme readiness
  console.log("🎯 Theme readiness check:", {
    hasEventData: !!eventData,
    hasWidgetCustomization: !!eventData?.widget_customization,
    hasTheme: !!eventData?.widget_customization?.theme,
    themeEnabled: eventData?.widget_customization?.theme?.enabled,
    hasPrimaryColor: !!eventData?.widget_customization?.theme?.primaryColor,
    hasSecondaryColor: !!eventData?.widget_customization?.theme?.secondaryColor,
    hasBackgroundColor: !!eventData?.widget_customization?.theme?.backgroundColor,
    hasHeaderTextColor: !!eventData?.widget_customization?.theme?.headerTextColor,
    hasOldTextColor: !!eventData?.widget_customization?.theme?.textColor,
    isReady: isReady
  });
  
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: backgroundColor,
        fontFamily: fontFamily,
        color: headerTextColor
      }}
    >
      {loading || !isReady ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
            <p style={{ color: headerTextColor }}>Loading event...</p>
            {!isReady && eventData && (
              <p className="mt-2 text-sm" style={{ color: headerTextColor }}>Loading theme customization...</p>
            )}
          </div>
        </div>
      ) : !eventData ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
                        <Ticket className="h-12 w-12 mx-auto mb-4" style={{ color: headerTextColor }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: headerTextColor }}>Event Not Found</h1>
            <p style={{ color: headerTextColor }}>The event you're looking for doesn't exist or isn't published.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Section with Logos and Event Title */}
          <div className="relative mb-8">
            {/* Top Right Corner Logos */}
            <div className="absolute top-0 right-0 flex flex-col items-end gap-3">
              {/* Organization Logo */}
              {eventData.widget_customization?.branding?.showOrgLogo && (eventData.organizations as any)?.logo_url && (
                <img 
                  src={(eventData.organizations as any).logo_url} 
                  alt={`${eventData.organizations?.name || 'Organization'} Logo`}
                  className="h-16 object-contain"
                />
              )}
              
              {/* Event Logo */}
              {eventData.widget_customization?.layout?.showEventImage && (eventData as any).logo_url && (
                <img 
                  src={(eventData as any).logo_url} 
                  alt={`${eventData.name} Logo`}
                  className="h-20 object-contain rounded-lg"
                />
              )}
            </div>
            
            {/* Event Title - Left aligned with right padding to avoid logo overlap */}
            <div className="text-left pr-32">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: headerTextColor }}>{eventData.name}</h1>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshWidgetData}
                      className="text-xs h-8 px-2"
                      title="Refresh widget data (use after making changes)"
                    >
                      🔄
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testDatabaseConnection}
                      className="text-xs h-8 px-2"
                    >
                      🧪
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6" style={{ color: bodyTextColor }}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{new Date(eventData.event_date).toLocaleDateString()}</span>
                </div>
                {eventData.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{eventData.venue}</span>
                  </div>
                )}
              </div>
              
              {/* Custom Header Text - Now positioned under the date/location */}
              {eventData.widget_customization?.branding?.customHeaderText && (
                <div className="mt-4">
                  <div 
                    className="text-lg font-medium"
                    style={{ color: eventData.widget_customization?.theme?.headerTextColor }}
                    dangerouslySetInnerHTML={{ __html: eventData.widget_customization.branding.customHeaderText }}
                  />
                </div>
              )}
              

            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6">
              {/* Customer Information - First */}
              <Card className="animate-in fade-in-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: headerTextColor }}>
                    <Ticket className="h-5 w-5" />
                    Your Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" style={{ color: bodyTextColor }}>Full Name *</Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" style={{ color: bodyTextColor }}>Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="phone" style={{ color: bodyTextColor }}>Phone Number</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Questions - Second */}
              {customQuestions.length > 0 && (
                <Card className="animate-in fade-in-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: headerTextColor }}>
                      <HelpCircle className="h-5 w-5" />
                      Required Information
                    </CardTitle>
                    <p className="text-sm" style={{ color: bodyTextColor }}>
                      Please provide the following information before selecting your tickets.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customQuestions.map((q: CustomQuestion) => (
                        <div key={q.id} className="space-y-2">
                          <Label className="font-medium">
                            {q.label} {q.required && <span className="text-destructive">*</span>}
                          </Label>
                          {q.type === 'text' && (
                            <Input
                              value={customAnswers[q.id] || ''}
                              onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                              placeholder={q.label}
                            />
                          )}
                          {q.type === 'textarea' && (
                            <textarea
                              className="w-full border rounded p-2"
                              value={customAnswers[q.id] || ''}
                              onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                              placeholder={q.label}
                              rows={3}
                            />
                          )}
                          {(q.type === 'select' || q.type === 'radio') && (
                            <Select
                              value={customAnswers[q.id] || ''}
                              onValueChange={(value) => setCustomAnswers(a => ({ ...a, [q.id]: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {((q as any).options || '').split('\n').map((opt: string, idx: number) => (
                                  <SelectItem key={idx} value={opt.trim()}>
                                    {opt.trim()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {q.type === 'checkbox' && (
                            <div className="flex flex-col gap-1">
                              {((q as any).options || '').split('\n').map((opt: string, idx: number) => (
                                <label key={idx} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={Array.isArray(customAnswers[q.id]) ? customAnswers[q.id].includes(opt.trim()) : false}
                                    onChange={e => {
                                      setCustomAnswers((a: any) => {
                                        const arr = Array.isArray(a[q.id]) ? a[q.id] : [];
                                        if (e.target.checked) {
                                          return { ...a, [q.id]: [...arr, opt.trim()] };
                                        } else {
                                          return { ...a, [q.id]: (arr as string[]).filter((v: string) => v !== opt.trim()) };
                                        }
                                      });
                                    }}
                                  />
                                  {opt.trim()}
                                </label>
                              ))}
                            </div>
                          )}
                          {q.type === 'email' && (
                            <Input
                              type="email"
                              value={customAnswers[q.id] || ''}
                              onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                              placeholder={q.label}
                            />
                          )}
                          {q.type === 'phone' && (
                            <Input
                              type="tel"
                              value={customAnswers[q.id] || ''}
                              onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                              placeholder={q.label}
                            />
                          )}
                          {customErrors[q.id] && (
                            <p className="text-xs text-destructive">{customErrors[q.id]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ticket Selection */}
              <Card className="animate-in fade-in-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: headerTextColor }}>
                    <Ticket className="h-5 w-5" />
                    Select Your Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ticketTypes.length === 0 ? (
                    <div className="text-center py-8">
                      <Ticket className="h-12 w-12 mx-auto mb-4" style={{ color: headerTextColor }} />
                      <p style={{ color: headerTextColor }}>No ticket types available for this event.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticketTypes.map((ticketType) => (
                        <div key={ticketType.id} className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover-lift animate-in fade-in-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg" style={{ color: headerTextColor }}>{ticketType.name}</h3>
                              {ticketType.description && (
                                <p className="text-sm mt-1" style={{ color: bodyTextColor }}>{ticketType.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-2xl font-bold" style={{ color: headerTextColor }}>${ticketType.price}</span>
                                <span className="text-sm" style={{ color: bodyTextColor }}>
                                  {ticketType.quantity_available - ticketType.quantity_sold} available
                                </span>
                              </div>
                            </div>
                            <Button 
                              onClick={() => addToCart(ticketType)}
                              variant="secondary"
                              className="sm:w-auto w-full hover-scale border-0"
                              disabled={ticketType.quantity_available - ticketType.quantity_sold <= 0}
                              style={{ 
                                backgroundColor: primaryColor,
                                color: buttonTextColor
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Merchandise Selection */}
              <MerchandiseSelector 
                eventId={eventId!} 
                onCartUpdate={setMerchandiseCart}
                theme={theme}
              />

              {/* Seat Selection - Fourth (only if seats are in cart and seat maps are enabled) */}
              {eventData?.widget_customization?.seatMaps?.enabled && cart.some(item => item.selectedSeats) && (
                <Card className="animate-in fade-in-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Selected Seats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cart.filter(item => item.selectedSeats).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.selectedSeats?.length} seat(s) selected
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Cart Summary */}
              <Card className="animate-in fade-in-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: headerTextColor }}>
                    <ShoppingCart className="h-5 w-5" />
                    Order Summary
                    {(cart.length > 0 || merchandiseCart.length > 0) && (
                      <Badge variant="secondary" className="ml-auto">
                        {cart.reduce((sum, item) => sum + item.quantity, 0) + merchandiseCart.reduce((sum, item) => sum + item.quantity, 0)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 && merchandiseCart.length === 0 ? (
                    <div className="text-center py-6">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3" style={{ color: headerTextColor }} />
                      <p style={{ color: headerTextColor }}>Your cart is empty</p>
                      <p className="text-sm mt-1" style={{ color: bodyTextColor }}>Add tickets or merchandise to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ticket Cart Items */}
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: headerTextColor }}>{item.name}</p>
                            <p className="text-sm" style={{ color: bodyTextColor }}>${item.price} each</p>
                            {eventData?.widget_customization?.seatMaps?.enabled && item.selectedSeats && item.selectedSeats.length > 0 && (
                              <p className="text-xs flex items-center gap-1 mt-1" style={{ color: bodyTextColor }}>
                                <MapPin className="h-3 w-3" />
                                Seats selected: {item.selectedSeats.length} seat(s)
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0 hover-scale"
                              style={{ 
                                borderColor: primaryColor,
                                color: primaryColor
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium" style={{ color: headerTextColor }}>{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0 hover-scale"
                              style={{ 
                                borderColor: primaryColor,
                                color: primaryColor
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Merchandise Cart Items */}
                      {merchandiseCart.map((item, index) => (
                        <div key={`merch-${index}`} className="flex justify-between items-start gap-3 p-3 bg-primary/5 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: headerTextColor }}>{item.merchandise.name}</p>
                            <p className="text-sm" style={{ color: bodyTextColor }}>
                              ${item.merchandise.price} each
                              {(item as any).selectedSize && ` • Size: ${(item as any).selectedSize}`}
                              {(item as any).selectedColor && ` • Color: ${(item as any).selectedColor}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-center font-medium" style={{ color: headerTextColor }}>{item.quantity}</span>
                            <span className="text-sm font-medium" style={{ color: headerTextColor }}>
                              ${(item.merchandise.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t pt-3">
                        {/* Subtotal breakdown */}
                        {cart.length > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Tickets:</span>
                            <span className="text-sm">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                          </div>
                        )}
                        {merchandiseCart.length > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Merchandise:</span>
                            <span className="text-sm">${getMerchandiseTotal().toFixed(2)}</span>
                          </div>
                        )}
                         
                        {/* Show subtotal if there's a processing fee */}
                        {creditCardProcessingFee > 0 && (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Subtotal:</span>
                              <span className="text-sm">${(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + getMerchandiseTotal()).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Credit Card Processing Fee ({creditCardProcessingFee}%):</span>
                              <span className="text-sm">${((cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + getMerchandiseTotal()) * creditCardProcessingFee / 100).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                         
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                                                      <span style={{ color: headerTextColor }}>${getTotalAmount().toFixed(2)}</span>
                        </div>
                      </div>
                       
                      <Button 
                        onClick={() => {
                          if (paymentProvider === "windcave") {
                            handleCheckout();
                          } else {
                            setShowPayment(true);
                          }
                        }}
                        variant="secondary"
                        className="w-full mt-4 hover-scale border-0"
                        size="lg"
                        disabled={!customerInfo.name || !customerInfo.email || (cart.length === 0 && merchandiseCart.length === 0)}
                        style={{ 
                          backgroundColor: primaryColor,
                          color: buttonTextColor
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Proceed to Payment
                      </Button>
                       
                      {(!customerInfo.name || !customerInfo.email) && (
                        <p className="text-xs text-muted-foreground text-center">
                          Please fill in your information to continue
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Form - Windcave Integration */}
              {showPaymentForm && paymentProvider === "windcave" && (
                <Card className="animate-in fade-in-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleBackToTickets}
                        className="p-2 hover-scale"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete your payment securely
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Windcave Drop-In Container */}
                    <div 
                      ref={dropInRef}
                      id="windcave-drop-in"
                      className="w-full max-w-none"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-sm text-muted-foreground">Loading secure payment form...</p>
                          <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
                        </div>
                      </div>
                    </div>
                     
                    {/* Payment Status Messages */}
                    <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Secure payment powered by Windcave</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your payment information is encrypted and secure. Do not refresh this page during payment.
                      </p>
                       
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Payment Modal - Only for Stripe */}
          {showPayment && paymentProvider === "stripe" && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Complete Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Order Summary */}
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Order Summary</h3>
                      <div className="space-y-1 text-sm">
                        {cart.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {merchandiseCart.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.merchandise.name} x{item.quantity}</span>
                            <span>${(item.merchandise.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {creditCardProcessingFee > 0 && (
                          <div className="flex justify-between text-muted-foreground border-t pt-2">
                            <span>Processing Fee ({creditCardProcessingFee}%)</span>
                            <span>${((cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + getMerchandiseTotal()) * creditCardProcessingFee / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total</span>
                          <span>${getTotalAmount().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {paymentProvider === 'stripe' && stripePublishableKey ? (
                      <StripePaymentForm
                        publishableKey={stripePublishableKey}
                        eventId={eventId!}
                        cart={cart as any}
                        merchandiseCart={merchandiseCart as any}
                        customerInfo={customerInfo}
                        total={getTotalAmount()}
                        onSuccess={(orderId: string) => {
                          setCart([]);
                          setMerchandiseCart([]);
                          setShowPayment(false);
                          
                          // Redirect to payment success page with order ID
                          window.location.href = `/payment-success?orderId=${orderId}`;
                        }}
                        onCancel={() => setShowPayment(false)}
                      />
                    ) : (
                      <div className="flex gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowPayment(false)} 
                          className="flex-1"
                          style={{ 
                            borderColor: primaryColor,
                            color: primaryColor
                          }}
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={handleCheckout} 
                          disabled={loading} 
                          variant="secondary" 
                          className="flex-1 border-0"
                          style={{ 
                            backgroundColor: primaryColor,
                            color: buttonTextColor
                          }}
                        >
                          {loading ? "Processing..." : "Proceed to Payment"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccess && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md">
                <Card>
                  <CardContent className="text-center p-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
                    <p className="text-muted-foreground mb-6">
                      Your tickets have been purchased successfully. Check your email for confirmation details.
                    </p>
                    <Button 
                      onClick={() => setShowSuccess(false)} 
                      variant="secondary" 
                      className="w-full border-0"
                      style={{ 
                        backgroundColor: primaryColor,
                        color: buttonTextColor
                      }}
                    >
                      Continue
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Seat Selection Modal */}
          {(() => {
            console.log("=== SEAT SELECTION MODAL RENDER CHECK ===");
            console.log("showSeatSelection:", showSeatSelection);
            console.log("pendingSeatSelection:", pendingSeatSelection);
            return null;
          })()}
          {showSeatSelection && pendingSeatSelection && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {(() => {
                  console.log("🎪 Rendering GuestSeatSelector component");
                  return null;
                })()}
                <GuestSeatSelector
                  eventId={eventId!}
                  ticketTypeId={pendingSeatSelection.id}
                  requestedQuantity={pendingSeatSelection.quantity}
                  onSeatsSelected={handleSeatsSelected}
                  onSkip={handleSkipSeatSelection}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketWidget;