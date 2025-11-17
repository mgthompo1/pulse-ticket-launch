import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  MapPin,
  Ticket,
  Plus,
  Minus,
  CreditCard,
  Shield,
  Clock,
  Users,
  Star,
  Info,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Lock,
  Heart
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { TicketType, CartItem, MerchandiseCartItem, CustomerInfo, EventData, CustomQuestion } from '@/types/widget';
import { Theme } from '@/types/theme';
import { StripePaymentModal } from './StripePaymentModal';
import { AttendeeDetailsForm, AttendeeInfo } from './AttendeeDetailsForm';
import { useTaxCalculation, formatTaxForOrder } from '@/hooks/useTaxCalculation';

// Helper function to get button text based on branding configuration
const getButtonText = (branding?: { buttonTextType?: string; buttonText?: string }): string => {
  if (!branding) return 'Get Tickets';

  if (branding.buttonTextType === 'custom' && branding.buttonText) {
    return branding.buttonText;
  }

  switch (branding.buttonTextType) {
    case 'register':
      return 'Register';
    case 'buy':
      return 'Buy Tickets';
    case 'donate':
      return 'Donate';
    case 'buynow':
      return 'Buy Now';
    case 'rsvp':
      return 'RSVP';
    case 'default':
    default:
      return 'Get Tickets';
  }
};

interface PromoCodeHooks {
  promoCode: string;
  setPromoCode: (code: string) => void;
  promoCodeId: string | null;
  promoDiscount: number;
  promoError: string | null;
  isValidating: boolean;
  groupDiscount: number;
  groupDiscountTier: number | null;
  applyPromoCode: () => void;
  clearPromoCode: () => void;
  getTotalDiscount: () => number;
  calculateFinalTotal: (subtotal: number) => number;
}

interface ReservationHooks {
  reservations: any[];
  timeRemaining: number;
  reserveTickets: (ticketTypeId: string, quantity: number) => Promise<void>;
  reserveMultipleTickets: (tickets: Array<{ ticketTypeId: string; quantity: number }>) => Promise<void>;
  completeAllReservations: (orderId: string) => Promise<void>;
  cancelAllReservations: () => Promise<void>;
  extendReservation: () => boolean;
  formatTimeRemaining: () => string;
  hasActiveReservations: () => boolean;
}

interface BetaCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  onClose?: () => void;
  promoCodeHooks?: PromoCodeHooks;
  reservationHooks?: ReservationHooks;
}

// Improvement #1: Above-the-fold optimization - inspired by mockup header card
const EventHero: React.FC<{
  eventData: EventData;
  theme: Theme;
  onScrollToTickets: () => void;
  onShowEventInfo: () => void;
  isLoading: boolean;
}> = React.memo(({ eventData, theme, onScrollToTickets, onShowEventInfo, isLoading }) => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-7xl mx-auto">
      <Card className="overflow-hidden" style={{ backgroundColor: theme.cardBackgroundColor }}>
      {/* Hero Image */}
      {eventData.widget_customization?.layout?.showEventImage !== false && (
        <div className="h-48 md:h-64 relative overflow-hidden bg-white">
          {(eventData as any).logo_url || (eventData as any).featured_image_url ? (
            <div className="w-full h-full relative">
              <img
                src={(eventData as any).logo_url || (eventData as any).featured_image_url}
                alt={eventData.name}
                className="w-full h-full object-contain object-center"
                onError={(e) => {
                  // Hide broken image and show fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLDivElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div
                className="w-full h-full bg-white items-center justify-center absolute inset-0"
                style={{ display: 'none' }}
              >
                <Ticket className="h-16 w-16" style={{ color: theme.primaryColor }} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-white flex items-center justify-center">
              <Ticket className="h-16 w-16" style={{ color: theme.primaryColor }} />
            </div>
          )}
        </div>
      )}
      
      {/* Event Details */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl lg:text-3xl font-bold leading-tight" style={{ color: theme.headerTextColor }}>
              {eventData.name}
            </h1>
            
            <div className="flex flex-wrap gap-3 text-sm" style={{ color: theme.bodyTextColor }}>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                <Calendar className="h-4 w-4" style={{ color: theme.primaryColor }} />
                {new Date(eventData.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>

              {eventData.widget_customization?.layout?.showVenue !== false && eventData.venue && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                  <MapPin className="h-4 w-4" style={{ color: theme.primaryColor }} />
                  {eventData.venue}
                </span>
              )}
            </div>
            
            {(eventData.organizations as any)?.name && (
              <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                Hosted by <span className="font-medium">{(eventData.organizations as any).name}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                // Create calendar event
                const startDate = new Date(eventData.event_date);
                const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours
                
                const title = encodeURIComponent(eventData.name);
                const details = encodeURIComponent(eventData.description?.replace(/<[^>]*>/g, '') || '');
                const location = encodeURIComponent(eventData.venue || '');
                const startTime = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
                const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
                
                const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
                window.open(googleUrl, '_blank');
              }}
              className="text-sm"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Add to calendar
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={onShowEventInfo}
              className="text-sm"
            >
              Event info
            </Button>
            {!isLoading && (
              <Button 
                onClick={onScrollToTickets}
                size="sm"
                className="px-4 font-semibold"
                style={{ 
                  backgroundColor: theme.primaryColor, 
                  color: theme.buttonTextColor 
                }}
              >
                Get tickets
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
    </div>
  </div>
));

// Improvement #2: Progressive loading with skeleton states
const TicketSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

// Improvement #3: Price clarity with fee breakdown
const PriceDisplay: React.FC<{
  price: number;
  currency?: string;
  showFees?: boolean;
  feePercentage?: number;
  theme: Theme;
}> = ({ price, currency = 'USD', showFees = true, feePercentage = 3, theme }) => {
  const fees = showFees ? price * (feePercentage / 100) : 0;
  const total = price + fees;
  
  return (
    <div className="space-y-1">
      <div className="text-2xl font-bold" style={{ color: theme.headerTextColor }}>
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(total)}
      </div>
      {showFees && fees > 0 && (
        <div className="text-xs space-y-1" style={{ color: theme.bodyTextColor }}>
          <div className="flex justify-between">
            <span>Ticket price:</span>
            <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee:</span>
            <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(fees)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const BetaCheckout: React.FC<BetaCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions = [],
  promoCodeHooks,
  reservationHooks,
}) => {
  const { toast } = useToast();
  
  // Ensure customQuestions is always an array
  const safeCustomQuestions = Array.isArray(customQuestions) ? customQuestions : [];
  
  // Loading states - Improvement #2
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(100);
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<MerchandiseCartItem[]>([]);
  
  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    customAnswers: {} as Record<string, string>
  });
  const [errors, setErrors] = useState({} as Record<string, string>);

  // Attendee details state (for multiple tickets)
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  
  // Payment state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Event info modal state
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);

  // Donation state
  const [selectedDonationAmount, setSelectedDonationAmount] = useState<number | null>(null);
  const [customDonationAmount, setCustomDonationAmount] = useState<string>('');

  // Extract theme colors from event data with proper memoization
  const theme: Theme = useMemo(() => {
    const themeData = eventData.widget_customization?.theme;
    const isEnabled = themeData?.enabled === true;
    
    return {
      enabled: isEnabled,
      primaryColor: isEnabled ? (themeData?.primaryColor || '#ff4d00') : '#000000',
      buttonTextColor: isEnabled ? (themeData?.buttonTextColor || '#ffffff') : '#ffffff',
      secondaryColor: isEnabled ? (themeData?.secondaryColor || '#ffffff') : '#ffffff',
      backgroundColor: isEnabled ? (themeData?.backgroundColor || '#ffffff') : '#ffffff',
      cardBackgroundColor: isEnabled ? (themeData?.cardBackgroundColor || themeData?.backgroundColor || '#ffffff') : '#ffffff',
      inputBackgroundColor: isEnabled ? (themeData?.inputBackgroundColor || '#ffffff') : '#ffffff',
      borderEnabled: isEnabled ? (themeData?.borderEnabled ?? false) : false,
      borderColor: isEnabled ? (themeData?.borderColor || '#e5e7eb') : '#e5e7eb',
      headerTextColor: isEnabled ? (themeData?.headerTextColor || '#111827') : '#111827',
      bodyTextColor: isEnabled ? (themeData?.bodyTextColor || '#6b7280') : '#6b7280',
      fontFamily: isEnabled ? (themeData?.fontFamily || 'Manrope') : 'Manrope'
    };
  }, [
    eventData.widget_customization?.theme?.enabled,
    eventData.widget_customization?.theme?.primaryColor,
    eventData.widget_customization?.theme?.buttonTextColor,
    eventData.widget_customization?.theme?.secondaryColor,
    eventData.widget_customization?.theme?.backgroundColor,
    eventData.widget_customization?.theme?.cardBackgroundColor,
    eventData.widget_customization?.theme?.inputBackgroundColor,
    eventData.widget_customization?.theme?.borderEnabled,
    eventData.widget_customization?.theme?.borderColor,
    eventData.widget_customization?.theme?.headerTextColor,
    eventData.widget_customization?.theme?.bodyTextColor,
    eventData.widget_customization?.theme?.fontFamily
  ]);

  // Donation configuration
  const crmEnabled = eventData?.organizations?.crm_enabled ?? (eventData as any)?.crm_enabled;
  const isDonationsEnabled = eventData?.donations_enabled && crmEnabled;
  const donationSuggestedAmounts = (eventData?.donation_suggested_amounts || [5, 10, 25, 50, 100]).map(amount =>
    typeof amount === 'string' ? parseFloat(amount) : amount
  );
  const donationTitle = eventData?.donation_title || 'Support Our Cause';
  const donationDescription = eventData?.donation_description;

  // Improvement #2: Progressive loading simulation (disabled for now to avoid setState warnings)
  // useEffect(() => {
  //   const loadingSteps = [
  //     { progress: 20, delay: 200, message: 'Loading event details...' },
  //     { progress: 50, delay: 400, message: 'Loading ticket information...' },
  //     { progress: 80, delay: 600, message: 'Preparing checkout...' },
  //     { progress: 100, delay: 800, message: 'Ready!' }
  //   ];

  //   let timeoutId: NodeJS.Timeout;
  //   let currentStep = 0;

  //   const executeStep = () => {
  //     if (currentStep < loadingSteps.length) {
  //       const step = loadingSteps[currentStep];
  //       setLoadingProgress(step.progress);
        
  //       if (step.progress === 100) {
  //         setIsLoading(false);
  //       }
        
  //       currentStep++;
  //       timeoutId = setTimeout(executeStep, step.delay);
  //     }
  //   };

  //   executeStep();

  //   return () => {
  //     if (timeoutId) clearTimeout(timeoutId);
  //   };
  // }, []);

  // Cart management
  const addToCart = (ticketType: TicketType) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === ticketType.id);
      
      if (existingItem) {
        toast({
          title: "Ticket added",
          description: `${ticketType.name} added to cart`,
        });
        return prev.map(item =>
          item.id === ticketType.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      toast({
        title: "Ticket added",
        description: `${ticketType.name} added to cart`,
      });
      
      return [...prev, {
        ...ticketType,
        quantity: 1,
        type: 'ticket' as const,
        selectedSeats: []
      }];
    });
  };

  const updateQuantity = (ticketTypeId: string, quantity: number) => {
    setCartItems(prev => {
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketTypeId);
      }
      
      return prev.map(item =>
        item.id === ticketTypeId ? { ...item, quantity } : item
      );
    });
  };

  // Calculate totals with fee breakdown and promo discount
  const cartTotals = useMemo(() => {
    const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    const subtotal = ticketSubtotal + merchandiseSubtotal;
    const discount = promoCodeHooks?.getTotalDiscount() || 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);

    const feePercentage = eventData.organizations?.credit_card_processing_fee_percentage || 3;
    const fees = discountedSubtotal * (feePercentage / 100);
    const total = discountedSubtotal + fees;

    return {
      subtotal,
      discountedSubtotal,
      fees,
      total,
      discount,
      feePercentage,
      currency: eventData.organizations?.currency || 'USD',
      ticketCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cartItems, merchandiseCart, promoCodeHooks, eventData.organizations?.credit_card_processing_fee_percentage, eventData.organizations?.currency]);

  // Calculate total number of attendee forms needed (accounting for attendees_per_ticket multiplier)
  const totalAttendees = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity * (item.attendees_per_ticket || 1)), 0);
  }, [cartItems]);

  // Get booking fees setting
  const bookingFeesEnabled = eventData.organizations?.stripe_booking_fee_enabled || false;

  // Apply discount to amounts BEFORE tax calculation
  const ticketSubtotal = cartTotals.subtotal - (merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0));
  const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);

  // Calculate discounted amounts (apply discount proportionally)
  let discountedTicketAmount = ticketSubtotal;
  let discountedMerchandiseAmount = merchandiseSubtotal;

  if (cartTotals.discount > 0 && cartTotals.subtotal > 0) {
    const discountRatio = 1 - (cartTotals.discount / cartTotals.subtotal);
    discountedTicketAmount = ticketSubtotal * discountRatio;
    discountedMerchandiseAmount = merchandiseSubtotal * discountRatio;
  }

  // Calculate tax using DISCOUNTED amounts
  const { taxBreakdown, taxCalculator } = useTaxCalculation({
    eventId: eventData.id,
    ticketAmount: discountedTicketAmount,
    addonAmount: discountedMerchandiseAmount,
    donationAmount: selectedDonationAmount || 0,
    bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
    enabled: true,
  });

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomAnswerChange = (questionId: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      customAnswers: {
        ...prev.customAnswers,
        [questionId]: value
      }
    }));
  };

  const handleDonationAmountSelect = (amount: number) => {
    setSelectedDonationAmount(amount);
    setCustomDonationAmount('');
  };

  const handleCustomDonationChange = (value: string) => {
    setCustomDonationAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setSelectedDonationAmount(amount);
    } else {
      setSelectedDonationAmount(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) newErrors.name = 'Name is required';
    if (!customerInfo.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(customerInfo.email)) newErrors.email = 'Please enter a valid email';

    // Validate custom questions
    safeCustomQuestions.forEach(question => {
      if (question.required && !customerInfo.customAnswers[question.id]?.trim()) {
        newErrors[question.id] = `${question.label} is required`;
      }
    });

    // Validate attendee details (if multiple tickets)
    const ticketCount = cartTotals.ticketCount;
    if (ticketCount > 1) {
      attendees.forEach((attendee, index) => {
        if (!attendee.attendee_name?.trim()) {
          newErrors[`attendee_name_${index}`] = `Attendee ${index + 1} name is required`;
        }
        if (!attendee.attendee_email?.trim()) {
          newErrors[`attendee_email_${index}`] = `Attendee ${index + 1} email is required`;
        } else if (!/\S+@\S+\.\S+/.test(attendee.attendee_email)) {
          newErrors[`attendee_email_${index}`] = `Please enter a valid email for attendee ${index + 1}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = () => {
    if (!validateForm()) {
      toast({
        title: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Please select at least one ticket",
        variant: "destructive"
      });
      return;
    }

    // Include donation amount in customer info
    if (selectedDonationAmount && selectedDonationAmount > 0) {
      setCustomerInfo(prev => ({
        ...prev,
        donationAmount: selectedDonationAmount
      }));
    }

    // For Stripe payment
    if (eventData.organizations?.payment_provider === 'stripe') {
      setShowStripeModal(true);
    } else {
      // Handle other payment providers
      setIsProcessing(true);
    }
  };

  const scrollToTickets = useCallback(() => {
    const ticketsSection = document.getElementById('beta-tickets-section');
    ticketsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleShowEventInfo = useCallback(() => {
    console.log('Event info button clicked');
    setShowEventInfoModal(true);
  }, []);

  const isStripePayment = eventData.organizations?.payment_provider === 'stripe';
  const hasTicketsInCart = cartItems.length > 0;
  const totalTickets = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      className="min-h-screen"
      style={{ 
        fontFamily: theme.fontFamily,
        backgroundColor: theme.backgroundColor || '#fafafa'
      }}
    >
      {/* Improvement #1: Above-the-fold hero with single CTA */}
      <EventHero 
        eventData={eventData}
        theme={theme}
        onScrollToTickets={scrollToTickets}
        onShowEventInfo={handleShowEventInfo}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8" style={{ overflow: 'visible' }}>
        {isLoading ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Loading Progress */}
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Ticket className="h-8 w-8" style={{ color: theme.primaryColor }} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold" style={{ color: theme.headerTextColor }}>
                      Loading your tickets...
                    </h3>
                    <Progress value={loadingProgress} className="max-w-xs mx-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skeleton tickets */}
            <div className="space-y-4">
              <TicketSkeleton />
              <TicketSkeleton />
              <TicketSkeleton />
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto" style={{ overflow: 'visible' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start" style={{ overflow: 'visible' }}>
              {/* Left Column - Ticket Selection and Customer Details */}
              <div className="lg:col-span-8 space-y-6">
                {/* Ticket Selection Section */}
                <div id="beta-tickets-section">
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle style={{ color: theme.headerTextColor }}>
                          {eventData?.widget_customization?.textCustomization?.ticketSelectionTitle ?? 'Select Tickets'}
                        </CardTitle>
                        {/* Improvement #6: Smart state indicators */}
                        {hasTicketsInCart && (
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            {totalTickets} ticket{totalTickets === 1 ? '' : 's'} selected
                          </Badge>
                        )}
                      </div>
                      {eventData?.widget_customization?.textCustomization?.ticketSelectionSubtitle && (
                        <p className="text-sm mt-1" style={{ color: theme.bodyTextColor }}>
                          {eventData?.widget_customization?.textCustomization?.ticketSelectionSubtitle}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>

                      <div className="space-y-3">
                        {ticketTypes.map((ticketType) => {
                      const cartItem = cartItems.find(item => item.id === ticketType.id);
                      const remainingQuantity = ticketType.quantity_available - ticketType.quantity_sold;
                      const isSoldOut = remainingQuantity <= 0;

                      return (
                        <div
                          key={ticketType.id}
                          className="p-4 border rounded-xl transition-all duration-200 hover:shadow-sm"
                          style={{
                            backgroundColor: theme.backgroundColor,
                            borderColor: theme.borderColor
                          }}
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                            {/* Left: Ticket Info */}
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold" style={{ color: theme.headerTextColor }}>
                                {ticketType.name}
                              </h3>
                              {ticketType.description && (
                                <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                                  {ticketType.description}
                                </p>
                              )}
                              {eventData.widget_customization?.layout?.showCapacity !== false && (
                                <div className="flex items-center gap-3 text-xs" style={{ color: theme.bodyTextColor }}>
                                  <span>{remainingQuantity} available</span>
                                  {isSoldOut ? (
                                    <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                                  ) : remainingQuantity <= 10 && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Only {remainingQuantity} left
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: Price & Quantity */}
                            <div className="flex items-center justify-between lg:justify-end lg:gap-6">
                              <div className="text-right">
                                <div className="font-bold text-lg" style={{ color: theme.headerTextColor }}>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(ticketType.price)}
                                </div>
                                <div className="text-xs" style={{ color: theme.bodyTextColor }}>
                                  + fees
                                </div>
                              </div>

                              {isSoldOut ? (
                                <Button disabled variant="outline" className="text-sm">
                                  Sold Out
                                </Button>
                              ) : cartItem ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-8 h-8 p-0 rounded-lg"
                                    onClick={() => updateQuantity(ticketType.id, cartItem.quantity - 1)}
                                    disabled={cartItem.quantity <= 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-bold text-sm" style={{ color: theme.headerTextColor }}>
                                    {cartItem.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-8 h-8 p-0 rounded-lg"
                                    onClick={() => updateQuantity(ticketType.id, cartItem.quantity + 1)}
                                    disabled={cartItem.quantity >= remainingQuantity}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => addToCart(ticketType)}
                                  size="sm"
                                  className="px-4 font-semibold"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    color: theme.buttonTextColor
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Customer Details Section - Show only if tickets are selected */}
                {hasTicketsInCart && (
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <CardTitle style={{ color: theme.headerTextColor }}>
                        {totalAttendees > 1 ? 'Primary Contact Information' : 'Your Details'}
                      </CardTitle>
                      {totalAttendees > 1 && (
                        <p className="text-sm mt-1" style={{ color: theme.bodyTextColor }}>
                          This information will be used for order confirmation and communication.
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" style={{ color: theme.headerTextColor }}>
                            Name *
                          </Label>
                          <Input
                            id="name"
                            value={customerInfo.name}
                            onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                            placeholder="Enter your name"
                            style={{ backgroundColor: theme.inputBackgroundColor }}
                            className={errors.name ? 'border-red-500' : ''}
                          />
                          {errors.name && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" style={{ color: theme.headerTextColor }}>
                            Email *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                            placeholder="Enter your email"
                            style={{ backgroundColor: theme.inputBackgroundColor }}
                            className={errors.email ? 'border-red-500' : ''}
                          />
                          {errors.email && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" style={{ color: theme.headerTextColor }}>
                          Phone (optional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerInfo.phone}
                          onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                          placeholder="Enter your phone number"
                          style={{ backgroundColor: theme.inputBackgroundColor }}
                        />
                      </div>

                      {/* Custom Questions - Only show if single attendee */}
                      {totalAttendees <= 1 && safeCustomQuestions.map((question) => {
                        const questionOptions = Array.isArray(question.options)
                          ? question.options
                          : typeof question.options === 'string'
                            ? question.options.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0)
                            : [];

                        return (
                          <div key={question.id} className="space-y-2">
                            <Label style={{ color: theme.headerTextColor }}>
                              {question.label}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>

                            {question.type === 'select' ? (
                              <Select
                                value={customerInfo.customAnswers[question.id] || ''}
                                onValueChange={(value) => handleCustomAnswerChange(question.id, value)}
                              >
                                <SelectTrigger
                                  style={{ backgroundColor: theme.inputBackgroundColor }}
                                  className={errors[question.id] ? 'border-red-500' : ''}
                                >
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {questionOptions.map((option, index) => (
                                    <SelectItem key={index} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : question.type === 'textarea' ? (
                              <textarea
                                className={`w-full min-h-[80px] px-3 py-2 border rounded-md resize-y ${errors[question.id] ? 'border-red-500' : 'border-input'}`}
                                style={{ backgroundColor: theme.inputBackgroundColor }}
                                value={customerInfo.customAnswers[question.id] || ''}
                                onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                placeholder="Type your response..."
                              />
                            ) : question.type === 'radio' ? (
                              <RadioGroup
                                value={customerInfo.customAnswers[question.id] || ''}
                                onValueChange={(value) => handleCustomAnswerChange(question.id, value)}
                              >
                                {questionOptions.map((option, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                    <Label htmlFor={`${question.id}-${index}`} className="font-normal cursor-pointer" style={{ color: theme.bodyTextColor }}>
                                      {option}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            ) : question.type === 'checkbox' ? (
                              <div className="space-y-2">
                                {questionOptions.map((option, index) => {
                                  const selectedOptions = customerInfo.customAnswers[question.id]
                                    ? String(customerInfo.customAnswers[question.id]).split(',').map((v: string) => v.trim())
                                    : [];
                                  const isChecked = selectedOptions.includes(option);

                                  return (
                                    <div key={index} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${question.id}-${index}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          let newSelectedOptions;
                                          if (checked) {
                                            newSelectedOptions = [...selectedOptions, option];
                                          } else {
                                            newSelectedOptions = selectedOptions.filter((v: string) => v !== option);
                                          }
                                          handleCustomAnswerChange(question.id, newSelectedOptions.join(', '));
                                        }}
                                      />
                                      <Label htmlFor={`${question.id}-${index}`} className="font-normal cursor-pointer" style={{ color: theme.bodyTextColor }}>
                                        {option}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <Input
                                type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
                                value={customerInfo.customAnswers[question.id] || ''}
                                onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                style={{ backgroundColor: theme.inputBackgroundColor }}
                                className={errors[question.id] ? 'border-red-500' : ''}
                                placeholder="Type your response..."
                              />
                            )}

                            {errors[question.id] && (
                              <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors[question.id]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Donation Card */}
                {isDonationsEnabled && (
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
                        <Heart className="h-5 w-5" style={{ color: theme.primaryColor }} />
                        {donationTitle}
                      </CardTitle>
                      {donationDescription && (
                        <p className="text-sm mt-2" style={{ color: theme.bodyTextColor }}>
                          {donationDescription}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Suggested Amounts */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {donationSuggestedAmounts.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            onClick={() => handleDonationAmountSelect(amount)}
                            className={`font-semibold ${selectedDonationAmount === amount && !customDonationAmount ? 'ring-2' : ''}`}
                            style={{
                              borderColor: selectedDonationAmount === amount && !customDonationAmount ? theme.primaryColor : theme.borderColor,
                              color: selectedDonationAmount === amount && !customDonationAmount ? theme.primaryColor : theme.bodyTextColor,
                              backgroundColor: selectedDonationAmount === amount && !customDonationAmount ? `${theme.primaryColor}10` : theme.cardBackgroundColor
                            }}
                          >
                            ${amount}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Amount */}
                      <div className="space-y-2">
                        <Label style={{ color: theme.bodyTextColor }}>Or enter a custom amount</Label>
                        <div className="flex items-center gap-2">
                          <span style={{ color: theme.bodyTextColor }}>$</span>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="0.00"
                            value={customDonationAmount}
                            onChange={(e) => handleCustomDonationChange(e.target.value)}
                            style={{ backgroundColor: theme.inputBackgroundColor }}
                          />
                        </div>
                      </div>

                      {/* No donation option */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDonationAmount(null);
                          setCustomDonationAmount('');
                        }}
                        className="text-sm"
                        style={{ color: theme.bodyTextColor }}
                      >
                        Continue without donating
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Attendee Details Section */}
                {totalAttendees > 0 && (
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }} className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
                        <Users className="h-5 w-5" />
                        {eventData?.widget_customization?.textCustomization?.attendeeInfoTitle ?? 'Attendee Information'}
                      </CardTitle>
                      <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                        {eventData?.widget_customization?.textCustomization?.attendeeInfoDescription ?? `Please provide information for ${totalAttendees} attendee${totalAttendees === 1 ? '' : 's'}`}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <AttendeeDetailsForm
                        ticketCount={totalAttendees}
                        buyerName={customerInfo.name}
                        buyerEmail={customerInfo.email}
                        customQuestions={safeCustomQuestions}
                        textCustomization={eventData?.widget_customization?.textCustomization}
                        attendees={attendees}
                        onChange={setAttendees}
                      />
                    </CardContent>
                  </Card>
                )}

              </div>

              {/* Right Column - Order Summary (Sticky) */}
              <div className="lg:col-span-4 relative">
                <div className="lg:sticky lg:top-6" style={{
                  position: 'sticky',
                  top: '1.5rem'
                }}>
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
                        <Ticket className="h-5 w-5" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8" style={{ color: theme.bodyTextColor }}>
                          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No tickets selected</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium" style={{ color: theme.headerTextColor }}>
                                  {item.name}
                                </h4>
                                <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                                  Quantity: {item.quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold" style={{ color: theme.headerTextColor }}>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(item.price * item.quantity)}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Promo Code Section */}
                          {promoCodeHooks && (
                            <div className="border-t pt-4" style={{ borderColor: theme.borderColor }}>
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    type="text"
                                    placeholder="Promo code"
                                    value={promoCodeHooks.promoCode}
                                    onChange={(e) => promoCodeHooks.setPromoCode(e.target.value)}
                                    className="flex-1 text-sm"
                                    style={{ backgroundColor: theme.inputBackgroundColor }}
                                    disabled={promoCodeHooks.isValidating}
                                  />
                                  {promoCodeHooks.promoDiscount > 0 ? (
                                    <Button
                                      onClick={promoCodeHooks.clearPromoCode}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Clear
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={promoCodeHooks.applyPromoCode}
                                      variant="outline"
                                      size="sm"
                                      disabled={promoCodeHooks.isValidating || !promoCodeHooks.promoCode.trim()}
                                    >
                                      {promoCodeHooks.isValidating ? 'Validating...' : 'Apply'}
                                    </Button>
                                  )}
                                </div>
                                {promoCodeHooks.promoError && (
                                  <p className="text-xs" style={{ color: theme.bodyTextColor }}>
                                    {promoCodeHooks.promoError}
                                  </p>
                                )}
                                {promoCodeHooks.promoDiscount > 0 && (
                                  <p className="text-xs" style={{ color: theme.primaryColor }}>
                                    Promo code applied: ${promoCodeHooks.promoDiscount.toFixed(2)} off
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="border-t pt-4" style={{ borderColor: theme.borderColor }}>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between" style={{ color: theme.bodyTextColor }}>
                                <span>Subtotal:</span>
                                <span>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(cartTotals.subtotal)}
                                </span>
                              </div>
                              {cartTotals.discount > 0 && (
                                <div className="flex justify-between" style={{ color: theme.primaryColor }}>
                                  <span>Discount:</span>
                                  <span>-{new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(cartTotals.discount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center" style={{ color: theme.bodyTextColor }}>
                                <span className="flex items-center gap-1">
                                  Service fee:
                                  <Info className="h-3 w-3" />
                                </span>
                                <span>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(cartTotals.fees)}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ 
                                color: theme.headerTextColor,
                                borderColor: theme.borderColor 
                              }}>
                                <span>Total:</span>
                                <span>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(cartTotals.total)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Checkout button */}
                          <Button
                            onClick={handleCheckout}
                            disabled={isProcessing}
                            className="w-full h-12 text-lg font-semibold mt-6"
                            style={{ 
                              backgroundColor: theme.primaryColor, 
                              color: theme.buttonTextColor 
                            }}
                          >
                            {isProcessing ? (
                              <>Loading...</>
                            ) : (
                              <>
                                <CreditCard className="h-5 w-5 mr-2" />
                                Proceed to payment
                              </>
                            )}
                          </Button>

                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Info Modal */}
      <Dialog open={showEventInfoModal} onOpenChange={(open) => {
        console.log('Modal state changing to:', open);
        setShowEventInfoModal(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: theme.headerTextColor }}>
              {eventData?.widget_customization?.textCustomization?.eventDescriptionTitle ?? 'Event Information'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold" style={{ color: theme.headerTextColor }}>
                {eventData.name}
              </h3>
              
              {/* Event Image */}
              {((eventData as any).logo_url || (eventData as any).featured_image_url) && (
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={(eventData as any).logo_url || (eventData as any).featured_image_url}
                    alt={eventData.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <span style={{ color: theme.bodyTextColor }}>
                      {new Date(eventData.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {(eventData as any).event_time && `, ${(eventData as any).event_time}`}
                    </span>
                  </div>
                  
                  {eventData.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: theme.primaryColor }} />
                      <span style={{ color: theme.bodyTextColor }}>{eventData.venue}</span>
                    </div>
                  )}
                  
                  {(eventData.organizations as any)?.name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: theme.primaryColor }} />
                      <span style={{ color: theme.bodyTextColor }}>
                        Hosted by {(eventData.organizations as any).name}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {/* Additional metadata could go here */}
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <span style={{ color: theme.bodyTextColor }}>
                      {ticketTypes.length} ticket type{ticketTypes.length === 1 ? '' : 's'} available
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <span style={{ color: theme.bodyTextColor }}>Secure checkout</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Event Description */}
            {eventData.widget_customization?.layout?.showDescription !== false && eventData.description && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold" style={{ color: theme.headerTextColor }}>
                  About This Event
                </h4>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: theme.bodyTextColor }}
                  dangerouslySetInnerHTML={{ __html: eventData.description }}
                />
              </div>
            )}
            
            {/* Ticket Types Preview */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold" style={{ color: theme.headerTextColor }}>
                Available Tickets
              </h4>
              <div className="space-y-2">
                {ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="flex justify-between items-center p-3 border rounded-lg" style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                    <div>
                      <h5 className="font-medium" style={{ color: theme.headerTextColor }}>
                        {ticket.name}
                      </h5>
                      {ticket.description && (
                        <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                          {ticket.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: theme.headerTextColor }}>
                        ${ticket.price.toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: theme.bodyTextColor }}>
                        {ticket.quantity_available - ticket.quantity_sold} available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowEventInfoModal(false);
                  const ticketsSection = document.getElementById('beta-tickets-section');
                  ticketsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex-1"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: theme.buttonTextColor
                }}
              >
                {getButtonText(eventData?.widget_customization?.branding)}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEventInfoModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Modal */}
      {customerInfo && (
        <StripePaymentModal
          isOpen={showStripeModal}
          onClose={() => setShowStripeModal(false)}
          eventData={eventData}
          cartItems={cartItems}
          merchandiseCart={merchandiseCart}
          customerInfo={customerInfo as CustomerInfo}
          attendees={attendees}
          theme={theme}
        />
      )}
    </div>
  );
};