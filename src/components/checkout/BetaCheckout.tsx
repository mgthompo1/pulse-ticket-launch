import React, { useState, useEffect, useMemo } from 'react';
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
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketType, CartItem, MerchandiseCartItem, CustomerInfo, EventData, CustomQuestion } from '@/types/widget';
import { Theme } from '@/types/theme';
import { StripePaymentModal } from './StripePaymentModal';

interface BetaCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  onClose?: () => void;
}

// Improvement #1: Above-the-fold optimization - inspired by mockup header card
const EventHero: React.FC<{
  eventData: EventData;
  theme: Theme;
  onScrollToTickets: () => void;
  isLoading: boolean;
}> = ({ eventData, theme, onScrollToTickets, isLoading }) => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-7xl mx-auto">
      <Card className="overflow-hidden" style={{ backgroundColor: theme.cardBackgroundColor }}>
      {/* Hero Image */}
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
              
              {eventData.venue && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                  <MapPin className="h-4 w-4" style={{ color: theme.primaryColor }} />
                  {eventData.venue}
                </span>
              )}
              
              <span className="px-3 py-1 rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}>
                Instant mobile tickets
              </span>
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
              onClick={() => setShowEventInfoModal(true)}
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
);

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
  
  // Payment state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Event info modal state
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // Extract theme colors from event data
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
  }, [eventData.widget_customization?.theme]);

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
    const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
    
    const feePercentage = eventData.organizations?.credit_card_processing_fee_percentage || 3;
    const fees = discountedSubtotal * (feePercentage / 100);
    const total = discountedSubtotal + fees;
    
    return {
      subtotal,
      discountedSubtotal,
      fees,
      total,
      discount: promoDiscount,
      feePercentage,
      currency: eventData.organizations?.currency || 'USD'
    };
  }, [cartItems, merchandiseCart, promoDiscount, eventData.organizations]);

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePromoCode = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'SAVE10' && cartTotals.subtotal >= 50) {
      setPromoDiscount(10);
      setPromoMessage('Promo applied: SAVE10 – $10 off');
    } else if (code === 'WELCOME20' && cartTotals.subtotal >= 100) {
      setPromoDiscount(20);
      setPromoMessage('Promo applied: WELCOME20 – $20 off');
    } else {
      setPromoDiscount(0);
      setPromoMessage('Invalid code or minimum not met');
    }
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

    // For Stripe payment
    if (eventData.organizations?.payment_provider === 'stripe') {
      setShowStripeModal(true);
    } else {
      // Handle other payment providers
      setIsProcessing(true);
    }
  };

  const scrollToTickets = () => {
    const ticketsSection = document.getElementById('beta-tickets-section');
    ticketsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left Column - Customer Details and Ticket Selection */}
              <div className="lg:col-span-8 space-y-6">
                {/* Customer Details Section - Show first if tickets are selected */}
                {hasTicketsInCart && (
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <CardTitle style={{ color: theme.headerTextColor }}>
                        Your Details
                      </CardTitle>
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
                          style={{ backgroundColor: theme.inputBackgroundColor }}
                        />
                      </div>

                      {/* Custom Questions */}
                      {safeCustomQuestions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <Label style={{ color: theme.headerTextColor }}>
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            value={customerInfo.customAnswers[question.id] || ''}
                            onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                            style={{ backgroundColor: theme.inputBackgroundColor }}
                            className={errors[question.id] ? 'border-red-500' : ''}
                          />
                          {errors[question.id] && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors[question.id]}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Ticket Selection Section */}
                <div id="beta-tickets-section">
                  <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle style={{ color: theme.headerTextColor }}>
                          Select Tickets
                        </CardTitle>
                        {/* Improvement #6: Smart state indicators */}
                        {hasTicketsInCart && (
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            {totalTickets} ticket{totalTickets === 1 ? '' : 's'} selected
                          </Badge>
                        )}
                      </div>
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

              </div>

              {/* Right Column - Order Summary (Sticky) */}
              <div className="lg:col-span-4">
                {/* Improvement #4: Sticky mobile selector for better UX */}
                <div className="lg:sticky lg:top-6">
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
                          <div className="border-t pt-4" style={{ borderColor: theme.borderColor }}>
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="Promo code"
                                  value={promoCode}
                                  onChange={(e) => setPromoCode(e.target.value)}
                                  className="flex-1 text-sm"
                                  style={{ backgroundColor: theme.inputBackgroundColor }}
                                />
                                <Button
                                  onClick={handlePromoCode}
                                  variant="outline"
                                  size="sm"
                                >
                                  Apply
                                </Button>
                              </div>
                              {promoMessage && (
                                <p className="text-xs" style={{ 
                                  color: promoDiscount > 0 ? theme.primaryColor : theme.bodyTextColor 
                                }}>
                                  {promoMessage}
                                </p>
                              )}
                            </div>
                          </div>

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
                              {promoDiscount > 0 && (
                                <div className="flex justify-between" style={{ color: theme.primaryColor }}>
                                  <span>Discount:</span>
                                  <span>-{new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: cartTotals.currency,
                                  }).format(promoDiscount)}</span>
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

                          {/* Trust indicators */}
                          <div className="flex items-center justify-center gap-4 pt-4 text-xs" style={{ color: theme.bodyTextColor }}>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              SSL Secure
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Trusted Platform
                            </div>
                          </div>
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
      <Dialog open={showEventInfoModal} onOpenChange={setShowEventInfoModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: theme.headerTextColor }}>
              Event Information
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
            {eventData.description && (
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
                Get Tickets
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
          theme={theme}
        />
      )}
    </div>
  );
};