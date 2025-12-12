import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePromoCodeAndDiscounts } from '@/hooks/usePromoCodeAndDiscounts';
import { useTaxCalculation } from '@/hooks/useTaxCalculation';
import { Theme } from '@/types/theme';
import {
  CartItem,
  CustomerInfo,
  EventData,
  MerchandiseCartItem,
  TicketType,
  CustomQuestion,
} from '@/types/widget';

// Kept local to avoid a circular import on the form component
export interface AttendeeInfo {
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  attendee_custom_answers?: Record<string, string>;
}

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

interface UseCheckoutEngineOptions {
  eventData: EventData | null;
  ticketTypes: TicketType[] | null;
  customQuestions?: CustomQuestion[];
  promoCodeHooks?: PromoCodeHooks;
  // Group purchase context for promo code validation
  groupId?: string | null;
  allocationId?: string | null;
  // Pre-populated customer info (from URL params, etc.)
  initialCustomerInfo?: Partial<CustomerInfo>;
  initialCustomAnswers?: Record<string, string>;
  initialPromoCode?: string | null;
  enableAbandonedCart?: {
    supabaseClient: any;
    eventId: string | null;
    organizationId: string | null;
    enabled: boolean;
    getDeviceType?: () => string;
    getSessionId?: () => string;
  };
}

export const useCheckoutEngine = ({
  eventData,
  ticketTypes,
  customQuestions,
  promoCodeHooks,
  groupId,
  allocationId,
  initialCustomerInfo,
  initialCustomAnswers,
  initialPromoCode,
  enableAbandonedCart,
}: UseCheckoutEngineOptions) => {
  // Note: ticketTypes is available for future cart validation if needed
  void ticketTypes;

  // Core state shared across checkout templates
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<MerchandiseCartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: initialCustomerInfo?.name || '',
    email: initialCustomerInfo?.email || '',
    phone: initialCustomerInfo?.phone || '',
    customAnswers: { ...initialCustomAnswers, ...initialCustomerInfo?.customAnswers },
  });
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [selectedDonationAmount, setSelectedDonationAmount] = useState<number | null>(null);
  const [customDonationAmount, setCustomDonationAmount] = useState<string>('');
  const [pendingSeatSelection, setPendingSeatSelection] = useState<CartItem | null>(null);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const abandonedCartSaved = useRef(false);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Theme / branding
  const theme: Theme = useMemo(() => {
    const themeData = eventData?.widget_customization?.theme;
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
      fontFamily: isEnabled ? (themeData?.fontFamily || 'Manrope') : 'Manrope',
    };
  }, [
    eventData?.widget_customization?.theme?.enabled,
    eventData?.widget_customization?.theme?.primaryColor,
    eventData?.widget_customization?.theme?.buttonTextColor,
    eventData?.widget_customization?.theme?.secondaryColor,
    eventData?.widget_customization?.theme?.backgroundColor,
    eventData?.widget_customization?.theme?.cardBackgroundColor,
    eventData?.widget_customization?.theme?.inputBackgroundColor,
    eventData?.widget_customization?.theme?.borderEnabled,
    eventData?.widget_customization?.theme?.borderColor,
    eventData?.widget_customization?.theme?.headerTextColor,
    eventData?.widget_customization?.theme?.bodyTextColor,
    eventData?.widget_customization?.theme?.fontFamily,
  ]);

  // Promo handling (fall back to a local instance if none was provided)
  const localPromoHooks = usePromoCodeAndDiscounts({
    eventId: eventData?.id || '',
    customerEmail: customerInfo.email || '',
    ticketCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) +
      merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0),
    groupId: groupId || undefined,
    allocationId: allocationId || undefined,
  });

  // Use provided promo hooks if available, otherwise use internal hooks
  // Note: Internal hooks are preferred as they're synced with engine's cart state
  const promoHooks = promoCodeHooks || localPromoHooks;

  // Totals / fees / discount
  const cartTotals = useMemo(() => {
    const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
    const subtotal = ticketSubtotal + merchandiseSubtotal;
    const discount = promoHooks?.getTotalDiscount() || 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);

    const feePercentage = eventData?.organizations?.credit_card_processing_fee_percentage || 3;
    const fees = discountedSubtotal * (feePercentage / 100);
    const total = discountedSubtotal + fees;

    return {
      subtotal,
      discountedSubtotal,
      fees,
      total,
      discount,
      feePercentage,
      currency: eventData?.organizations?.currency || 'USD',
      ticketCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [
    cartItems,
    merchandiseCart,
    promoHooks,
    eventData?.organizations?.credit_card_processing_fee_percentage,
    eventData?.organizations?.currency,
  ]);

  // Calculate discounted splits for tax
  const ticketSubtotal = useMemo(
    () => cartTotals.subtotal - merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0),
    [cartTotals.subtotal, merchandiseCart],
  );
  const merchandiseSubtotal = useMemo(
    () => merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0),
    [merchandiseCart],
  );

  let discountedTicketAmount = ticketSubtotal;
  let discountedMerchandiseAmount = merchandiseSubtotal;

  if (cartTotals.discount > 0 && cartTotals.subtotal > 0) {
    const discountRatio = 1 - (cartTotals.discount / cartTotals.subtotal);
    discountedTicketAmount = ticketSubtotal * discountRatio;
    discountedMerchandiseAmount = merchandiseSubtotal * discountRatio;
  }

  const bookingFeesEnabled = eventData?.organizations?.stripe_booking_fee_enabled || false;

  const { taxBreakdown, taxCalculator } = useTaxCalculation({
    eventId: eventData?.id || '',
    ticketAmount: discountedTicketAmount,
    addonAmount: discountedMerchandiseAmount,
    donationAmount: selectedDonationAmount || 0,
    bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
    enabled: true,
  });

  const totalAttendees = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.quantity * (item.attendees_per_ticket || 1)), 0),
    [cartItems],
  );

  // Cart operations
  const addToCart = useCallback((ticketType: TicketType & { selectedSeats?: string[] }) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === ticketType.id);

      if (existingItem) {
        return prev.map(item =>
          item.id === ticketType.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...prev, {
        ...ticketType,
        quantity: 1,
        type: 'ticket' as const,
        selectedSeats: ticketType.selectedSeats || [],
      }];
    });
  }, []);

  const updateQuantity = useCallback((ticketTypeId: string, quantity: number) => {
    setCartItems(prev => {
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketTypeId);
      }

      return prev.map(item =>
        item.id === ticketTypeId ? { ...item, quantity } : item
      );
    });
  }, []);

  const saveAbandonedCart = useCallback(async () => {
    if (!enableAbandonedCart?.enabled) return;
    if (!enableAbandonedCart.eventId || !enableAbandonedCart.organizationId) return;
    if (!customerInfo.email || cartItems.length === 0) return;
    if (abandonedCartSaved.current) return;

    const supabase = enableAbandonedCart.supabaseClient;
    if (!supabase) return;

    try {
      const cartPayload = cartItems.map(item => ({
        ticket_type_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
      const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const deviceType = enableAbandonedCart.getDeviceType?.() || 'desktop';
      const sessionId = enableAbandonedCart.getSessionId?.() || sessionIdRef.current;

      const { error } = await supabase
        .from("abandoned_carts")
        .upsert({
          event_id: enableAbandonedCart.eventId,
          organization_id: enableAbandonedCart.organizationId,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          cart_items: cartPayload,
          cart_total: cartTotal,
          session_id: sessionId,
          source_url: typeof window !== 'undefined' ? window.location.href : null,
          device_type: deviceType,
          status: 'pending',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,customer_email,session_id'
        });

      if (!error) {
        abandonedCartSaved.current = true;
      } else {
        console.error("Error saving abandoned cart:", error);
      }
    } catch (err) {
      console.error("Error in saveAbandonedCart:", err);
    }
  }, [cartItems, customerInfo, enableAbandonedCart]);

  useEffect(() => {
    if (!enableAbandonedCart?.enabled) return;
    if (!customerInfo.email || cartItems.length === 0) return;
    if (abandonedCartSaved.current) return;

    const timer = setTimeout(() => {
      saveAbandonedCart();
    }, 2000);

    return () => clearTimeout(timer);
  }, [saveAbandonedCart, customerInfo.email, cartItems, enableAbandonedCart?.enabled]);

  // Auto-apply initial promo code from URL params
  const initialPromoApplied = useRef(false);
  useEffect(() => {
    if (initialPromoCode && !initialPromoApplied.current && promoHooks?.setPromoCode) {
      promoHooks.setPromoCode(initialPromoCode);
      initialPromoApplied.current = true;
      // Auto-validate after a short delay to allow state to settle
      setTimeout(() => {
        promoHooks.applyPromoCode?.();
      }, 100);
    }
  }, [initialPromoCode, promoHooks]);

  return {
    // state
    cartItems,
    setCartItems,
    merchandiseCart,
    setMerchandiseCart,
    customerInfo,
    setCustomerInfo,
    attendees,
    setAttendees,
    selectedDonationAmount,
    setSelectedDonationAmount,
    customDonationAmount,
    setCustomDonationAmount,
    pendingSeatSelection,
    setPendingSeatSelection,
    showSeatSelection,
    setShowSeatSelection,
    theme,
    promoHooks,

    // derived
    cartTotals,
    ticketSubtotal,
    merchandiseSubtotal,
    discountedTicketAmount,
    discountedMerchandiseAmount,
    taxBreakdown,
    taxCalculator,
    totalAttendees,
    bookingFeesEnabled,
    paymentProvider: eventData?.organizations?.payment_provider || 'stripe',
    currency: eventData?.organizations?.currency || 'USD',

    // actions
    addToCart,
    updateQuantity,
    customQuestions,
    saveAbandonedCart,
    sessionIdRef,
  };
};
