/**
 * TicketFloLIVE Attractions - On-site management for attractions
 * Check-in guests, process walk-up sales, manage waivers
 * No lanyard printing (per requirements)
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  CheckCircle,
  Plus,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  DollarSign,
  Menu,
  Search,
  Home,
  Settings,
  FileSignature,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  UserCheck,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  CalendarClock,
  Store,
  Trash2,
} from "lucide-react";
import { AttractionWaiverSigning, AttractionWaiverConfig } from "@/components/attractions/waivers";
import { SignedWaivers } from "@/components/SignedWaivers";
import { formatPrice, AttractionAddon } from "@/types/attraction-v3";
import { Package, Minus, X } from "lucide-react";

interface AttractionBookingStatus {
  booking_id: string;
  booking_reference: string;
  booking_status: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  total_amount: number;
  slot_start_time: string;
  slot_end_time: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  waiver_signed: boolean;
  created_at: string;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  current_bookings: number;
}

interface WindcaveHITConfig {
  windcave_enabled: boolean;
  windcave_hit_username: string | null;
  windcave_hit_key: string | null;
  windcave_station_id: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  inventory_count: number;
  track_inventory: boolean;
  is_active: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = "stripe_terminal" | "windcave_hit" | "cash";

const TicketFloLIVEAttractions = () => {
  const { attractionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Core state
  const [attractionData, setAttractionData] = useState<any>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [bookings, setBookings] = useState<AttractionBookingStatus[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState("checkin");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Check-in state
  const [bookingCode, setBookingCode] = useState("");
  const bookingCodeInputRef = useRef<HTMLInputElement>(null);

  // Waiver state
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverBookingInfo, setWaiverBookingInfo] = useState<{
    bookingId: string;
    bookingReference: string;
    customerName: string;
    customerEmail: string;
  } | null>(null);

  // Refund state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<AttractionBookingStatus | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<AttractionBookingStatus | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>("");
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [rescheduleProcessing, setRescheduleProcessing] = useState(false);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  // Walk-up state
  const [walkupForm, setWalkupForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    partySize: 1,
    slotId: "",
  });
  const [walkupProcessing, setWalkupProcessing] = useState(false);

  // Add-ons/Merchandise state
  const [addons, setAddons] = useState<AttractionAddon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());

  // Products/Retail state
  const [products, setProducts] = useState<Product[]>([]);
  const [productCart, setProductCart] = useState<CartItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [productSaleProcessing, setProductSaleProcessing] = useState(false);
  const [productPaymentMethod, setProductPaymentMethod] = useState<PaymentMethod>("cash");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [organizationConfig, setOrganizationConfig] = useState<WindcaveHITConfig | null>(null);
  const [hitTerminalState, setHitTerminalState] = useState<{
    processing: boolean;
    txnRef: string | null;
    message: string;
  }>({
    processing: false,
    txnRef: null,
    message: ""
  });

  // Analytics state
  const [analytics, setAnalytics] = useState({
    todayBookings: 0,
    todayRevenue: 0,
    checkedIn: 0,
    pendingCheckIn: 0,
  });

  // Force light mode
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    const enforceLightMode = () => {
      root.classList.remove('dark');
      root.classList.add('light');
    };

    enforceLightMode();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && root.classList.contains('dark')) {
          enforceLightMode();
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (savedTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      }
    };
  }, []);

  // Load attraction data and organization config
  useEffect(() => {
    const loadAttractionData = async () => {
      if (!attractionId) return;

      try {
        const { data: attraction, error } = await supabase
          .from('attractions')
          .select('*, organizations(*)')
          .eq('id', attractionId)
          .single();

        if (error) throw error;

        setAttractionData(attraction);
        setOrganizationData(attraction.organizations);

        // Load Windcave configuration from organization
        if (attraction.organization_id) {
          const { data: credentials, error: credError } = await supabase
            .from("organizations")
            .select("windcave_hit_username, windcave_hit_key, windcave_station_id, windcave_enabled")
            .eq("id", attraction.organization_id)
            .single();

          if (credError) {
            console.error("Error loading Windcave config:", credError);
            setOrganizationConfig({
              windcave_enabled: false,
              windcave_hit_username: null,
              windcave_hit_key: null,
              windcave_station_id: null
            });
          } else {
            setOrganizationConfig({
              windcave_enabled: credentials.windcave_enabled || false,
              windcave_hit_username: credentials.windcave_hit_username,
              windcave_hit_key: credentials.windcave_hit_key,
              windcave_station_id: credentials.windcave_station_id
            });
          }
        }
      } catch (error) {
        console.error('Error loading attraction:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attraction data',
          variant: 'destructive',
        });
      }
    };

    loadAttractionData();
  }, [attractionId, toast]);

  // Load bookings for selected date
  useEffect(() => {
    const loadBookings = async () => {
      if (!attractionId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_attraction_bookings_for_date', {
          p_attraction_id: attractionId,
          p_date: selectedDate,
        });

        if (error) throw error;
        setBookings(data || []);

        // Calculate analytics
        const confirmed = (data || []).filter((b: any) => b.booking_status === 'confirmed' || b.booking_status === 'checked_in');
        const checkedIn = (data || []).filter((b: any) => b.checked_in_at);
        const revenue = confirmed.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

        setAnalytics({
          todayBookings: confirmed.length,
          todayRevenue: revenue,
          checkedIn: checkedIn.length,
          pendingCheckIn: confirmed.length - checkedIn.length,
        });
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [attractionId, selectedDate]);

  // Load time slots for walk-up sales
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (!attractionId) return;

      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('booking_slots')
          .select('*')
          .eq('attraction_id', attractionId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time');

        if (error) throw error;
        setTimeSlots(data || []);
      } catch (error) {
        console.error('Error loading time slots:', error);
      }
    };

    loadTimeSlots();
  }, [attractionId, selectedDate]);

  // Load add-ons/merchandise for walk-up sales
  useEffect(() => {
    const loadAddons = async () => {
      if (!attractionId) return;

      try {
        const { data, error } = await supabase
          .from('attraction_addons')
          .select('*')
          .eq('attraction_id', attractionId)
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setAddons(data || []);
      } catch (error) {
        console.error('Error loading add-ons:', error);
      }
    };

    loadAddons();
  }, [attractionId]);

  // Load products for retail sales
  useEffect(() => {
    const loadProducts = async () => {
      if (!attractionId) return;

      try {
        const { data, error } = await supabase
          .from('attraction_products')
          .select('*')
          .eq('attraction_id', attractionId)
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    loadProducts();
  }, [attractionId]);

  // Handle check-in
  const handleCheckIn = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_in_attraction_guest', {
        p_booking_id: bookingId,
        p_checked_in_by: user?.id || null,
      });

      if (error) throw error;

      if (data && data[0]?.success) {
        toast({
          title: 'Checked In',
          description: `${data[0].customer_name} has been checked in.`,
        });

        // Refresh bookings
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId
              ? { ...b, checked_in_at: new Date().toISOString(), booking_status: 'checked_in' }
              : b
          )
        );

        setAnalytics((prev) => ({
          ...prev,
          checkedIn: prev.checkedIn + 1,
          pendingCheckIn: prev.pendingCheckIn - 1,
        }));
      } else {
        toast({
          title: 'Check-in Failed',
          description: data?.[0]?.message || 'Unable to check in guest',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in guest',
        variant: 'destructive',
      });
    }
  };

  // Quick scan check-in
  const handleQuickCheckIn = async () => {
    if (!bookingCode.trim()) return;

    const booking = bookings.find(
      (b) => b.booking_reference.toLowerCase() === bookingCode.toLowerCase()
    );

    if (!booking) {
      toast({
        title: 'Not Found',
        description: 'No booking found with that reference',
        variant: 'destructive',
      });
      return;
    }

    if (booking.checked_in_at) {
      toast({
        title: 'Already Checked In',
        description: `${booking.customer_name} was already checked in.`,
      });
      setBookingCode("");
      return;
    }

    await handleCheckIn(booking.booking_id);
    setBookingCode("");
    bookingCodeInputRef.current?.focus();
  };

  // Filter bookings by search query
  const filteredBookings = bookings.filter(
    (b) =>
      b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add-on helper functions
  const getAddonQuantity = (addonId: string) => selectedAddons.get(addonId) || 0;

  const incrementAddon = (addonId: string) => {
    const addon = addons.find(a => a.id === addonId);
    if (!addon) return;

    const currentQty = getAddonQuantity(addonId);
    const maxQty = addon.max_quantity || 99;

    if (currentQty < maxQty) {
      const newMap = new Map(selectedAddons);
      newMap.set(addonId, currentQty + 1);
      setSelectedAddons(newMap);
    }
  };

  const decrementAddon = (addonId: string) => {
    const currentQty = getAddonQuantity(addonId);
    if (currentQty > 0) {
      const newMap = new Map(selectedAddons);
      if (currentQty === 1) {
        newMap.delete(addonId);
      } else {
        newMap.set(addonId, currentQty - 1);
      }
      setSelectedAddons(newMap);
    }
  };

  const clearAddons = () => {
    setSelectedAddons(new Map());
  };

  // Calculate add-ons total
  const getAddonsTotal = () => {
    let total = 0;
    selectedAddons.forEach((quantity, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        if (addon.pricing_type === 'per_person') {
          total += addon.price * quantity * walkupForm.partySize;
        } else {
          total += addon.price * quantity;
        }
      }
    });
    return total;
  };

  // Get base booking total (before add-ons)
  const getBaseTotal = () => {
    return (attractionData?.base_price || 0) * walkupForm.partySize;
  };

  // Get total for walk-up booking including add-ons
  const getWalkupTotal = () => {
    return getBaseTotal() + getAddonsTotal();
  };

  // Create booking helper
  const createWalkupBooking = async (paymentMethod: string) => {
    const bookingRef = 'PLS-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const totalAmount = getWalkupTotal();

    const { data: booking, error } = await supabase
      .from('attraction_bookings')
      .insert({
        attraction_id: attractionId,
        organization_id: organizationData?.id,
        booking_slot_id: walkupForm.slotId,
        customer_name: walkupForm.customerName,
        customer_email: walkupForm.customerEmail,
        customer_phone: walkupForm.customerPhone || null,
        party_size: walkupForm.partySize,
        total_amount: totalAmount,
        booking_status: 'confirmed',
        payment_status: 'completed',
        payment_method: paymentMethod,
        booking_reference: bookingRef,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Save selected add-ons to booking_add_ons table
    if (booking && selectedAddons.size > 0) {
      const addonRecords: {
        booking_id: string;
        addon_id: string;
        name: string;
        description: string | null;
        quantity: number;
        unit_price: number;
        total_price: number;
      }[] = [];

      selectedAddons.forEach((quantity, addonId) => {
        const addon = addons.find(a => a.id === addonId);
        if (addon) {
          const unitPrice = addon.pricing_type === 'per_person'
            ? addon.price * walkupForm.partySize
            : addon.price;
          addonRecords.push({
            booking_id: booking.id,
            addon_id: addon.id,
            name: addon.name,
            description: addon.description || null,
            quantity,
            unit_price: unitPrice,
            total_price: unitPrice * quantity,
          });
        }
      });

      if (addonRecords.length > 0) {
        const { error: addonsError } = await supabase
          .from('booking_add_ons')
          .insert(addonRecords);

        if (addonsError) {
          console.error('Error saving add-ons:', addonsError);
        }
      }
    }

    return { booking, bookingRef, totalAmount };
  };

  // Reset form and refresh
  const completeWalkupSale = async (bookingId: string, bookingRef: string, totalAmount: number) => {
    // Send confirmation email
    try {
      await supabase.functions.invoke('send-booking-email', {
        body: { bookingId }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    toast({
      title: 'Walk-up Booking Created',
      description: `Booking ${bookingRef} created and checked in.`,
    });

    // Reset form
    setWalkupForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: 1,
      slotId: "",
    });

    // Reset add-ons
    clearAddons();

    const { data: newBookings } = await supabase.rpc('get_attraction_bookings_for_date', {
      p_attraction_id: attractionId,
      p_date: selectedDate,
    });
    setBookings(newBookings || []);

    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      todayBookings: prev.todayBookings + 1,
      checkedIn: prev.checkedIn + 1,
      todayRevenue: prev.todayRevenue + totalAmount,
    }));
  };

  // Open refund modal
  const openRefundModal = (booking: AttractionBookingStatus) => {
    setRefundBooking(booking);
    setRefundAmount(String(booking.total_amount));
    setRefundReason("");
    setRefundModalOpen(true);
  };

  // Process refund
  const handleRefund = async () => {
    if (!refundBooking) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > refundBooking.total_amount) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid refund amount",
        variant: "destructive",
      });
      return;
    }

    setRefundProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-refund-attraction', {
        body: {
          bookingId: refundBooking.booking_id,
          refundAmount: amount,
          reason: refundReason || 'requested_by_customer',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Refund Processed",
          description: data.isFullRefund
            ? `Full refund of ${formatPrice(amount, attractionData?.currency || 'USD')} processed successfully`
            : `Partial refund of ${formatPrice(amount, attractionData?.currency || 'USD')} processed successfully`,
        });

        // Refresh bookings
        const { data: newBookings } = await supabase.rpc('get_attraction_bookings_for_date', {
          p_attraction_id: attractionId,
          p_date: selectedDate,
        });
        setBookings(newBookings || []);

        // Update analytics
        if (data.isFullRefund) {
          setAnalytics(prev => ({
            ...prev,
            todayRevenue: Math.max(0, prev.todayRevenue - refundBooking.total_amount),
            todayBookings: prev.todayBookings - 1,
          }));
        }

        setRefundModalOpen(false);
        setRefundBooking(null);
      } else {
        throw new Error(data.error || 'Refund failed');
      }
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setRefundProcessing(false);
    }
  };

  // Open reschedule modal
  const openRescheduleModal = (booking: AttractionBookingStatus) => {
    setRescheduleBooking(booking);
    setRescheduleDate("");
    setRescheduleSlotId("");
    setRescheduleSlots([]);
    setRescheduleModalOpen(true);
  };

  // Load available slots for reschedule date
  const loadRescheduleSlots = async (date: string) => {
    if (!attractionId || !date) return;

    setLoadingRescheduleSlots(true);
    try {
      const { data: slots, error } = await supabase
        .from("booking_slots")
        .select("id, start_time, end_time, max_capacity, current_bookings")
        .eq("attraction_id", attractionId)
        .gte("start_time", `${date}T00:00:00`)
        .lt("start_time", `${date}T23:59:59`)
        .eq("status", "available")
        .order("start_time");

      if (error) throw error;

      // Filter slots with capacity
      const availableSlots = (slots || []).filter(slot => {
        const partySize = rescheduleBooking?.party_size || 1;
        return (slot.max_capacity - slot.current_bookings) >= partySize;
      }).map(slot => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity: slot.max_capacity,
        current_bookings: slot.current_bookings,
      }));

      setRescheduleSlots(availableSlots);
    } catch (error) {
      console.error("Error loading reschedule slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive",
      });
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  // Process reschedule
  const handleReschedule = async () => {
    if (!rescheduleBooking || !rescheduleSlotId) {
      toast({
        title: "Missing Information",
        description: "Please select a new time slot",
        variant: "destructive",
      });
      return;
    }

    setRescheduleProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('modify-attraction-booking', {
        body: {
          bookingId: rescheduleBooking.booking_id,
          action: 'reschedule',
          newSlotId: rescheduleSlotId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Booking Rescheduled",
          description: "The booking has been moved to the new time slot. A confirmation email has been sent.",
        });

        // Refresh bookings
        const { data: newBookings } = await supabase.rpc('get_attraction_bookings_for_date', {
          p_attraction_id: attractionId,
          p_date: selectedDate,
        });
        setBookings(newBookings || []);

        setRescheduleModalOpen(false);
        setRescheduleBooking(null);
      } else {
        throw new Error(data.error || 'Reschedule failed');
      }
    } catch (error: any) {
      console.error('Reschedule error:', error);
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to reschedule booking",
        variant: "destructive",
      });
    } finally {
      setRescheduleProcessing(false);
    }
  };

  // Handle cash payment
  const handleCashPayment = async () => {
    if (!walkupForm.customerName || !walkupForm.customerEmail || !walkupForm.slotId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setWalkupProcessing(true);
    try {
      const { booking, bookingRef, totalAmount } = await createWalkupBooking('cash');
      await completeWalkupSale(booking.id, bookingRef, totalAmount);
    } catch (error) {
      console.error('Cash payment error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create walk-up booking',
        variant: 'destructive',
      });
    } finally {
      setWalkupProcessing(false);
    }
  };

  // Handle Stripe Terminal payment
  const handleStripeTerminalPayment = async () => {
    if (!walkupForm.customerName || !walkupForm.customerEmail || !walkupForm.slotId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setWalkupProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("stripe-terminal", {
        body: {
          attractionId,
          amount: getWalkupTotal(),
          customerInfo: {
            name: walkupForm.customerName,
            email: walkupForm.customerEmail,
          }
        },
      });

      if (error) throw error;

      toast({
        title: "Connect Terminal",
        description: "Connect to Stripe Terminal to complete payment"
      });

      // For now, fall back to creating booking (actual terminal integration would poll for completion)
      const { booking, bookingRef, totalAmount } = await createWalkupBooking('stripe_terminal');
      await completeWalkupSale(booking.id, bookingRef, totalAmount);
    } catch (error) {
      console.error('Stripe Terminal error:', error);
      toast({ title: "Payment failed", variant: "destructive" });
    } finally {
      setWalkupProcessing(false);
    }
  };

  // Handle Windcave HIT payment
  const handleWindcaveHITPayment = async () => {
    if (!walkupForm.customerName || !walkupForm.customerEmail || !walkupForm.slotId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!organizationConfig?.windcave_enabled || !organizationConfig?.windcave_station_id) {
      toast({
        title: "Windcave Configuration Missing",
        description: "Please configure Windcave HIT terminal in organization settings",
        variant: "destructive"
      });
      return;
    }

    setWalkupProcessing(true);
    setHitTerminalState(prev => ({ ...prev, processing: true, message: "Initiating payment..." }));

    try {
      const { data, error } = await supabase.functions.invoke("windcave-hit-terminal", {
        body: {
          attractionId,
          action: "purchase",
          amount: getWalkupTotal(),
          customerInfo: {
            name: walkupForm.customerName,
            email: walkupForm.customerEmail,
          }
        },
      });

      if (error) throw error;

      if (data.success) {
        setHitTerminalState(prev => ({
          ...prev,
          txnRef: data.txnRef,
          message: "Transaction initiated - Present card to terminal"
        }));

        toast({
          title: "Payment Initiated",
          description: data.message || "Present card to the terminal to complete payment"
        });

        // Poll for payment status
        const pollPaymentStatus = async () => {
          try {
            const statusCheck = await supabase.functions.invoke("windcave-hit-terminal", {
              body: {
                action: "status",
                txnRef: data.txnRef
              }
            });

            if (statusCheck.data?.success) {
              if (statusCheck.data.displayLine1 || statusCheck.data.displayLine2) {
                const displayMessage = `${statusCheck.data.displayLine1} ${statusCheck.data.displayLine2}`.trim();
                setHitTerminalState(prev => ({
                  ...prev,
                  message: displayMessage || "Processing..."
                }));
              }

              if (statusCheck.data.complete) {
                if (statusCheck.data.transactionSuccess) {
                  setHitTerminalState(prev => ({
                    ...prev,
                    processing: false,
                    message: "Payment completed successfully!"
                  }));

                  toast({
                    title: "Payment Successful!",
                    description: statusCheck.data.message || 'Transaction completed successfully'
                  });

                  // Create booking
                  const { booking, bookingRef, totalAmount } = await createWalkupBooking('windcave_hit');
                  await completeWalkupSale(booking.id, bookingRef, totalAmount);
                  setWalkupProcessing(false);
                  return;
                } else {
                  setHitTerminalState(prev => ({
                    ...prev,
                    processing: false,
                    message: "Payment failed"
                  }));

                  toast({
                    title: "Payment Failed",
                    description: statusCheck.data.message || "Payment was declined",
                    variant: "destructive"
                  });
                  setWalkupProcessing(false);
                  return;
                }
              } else {
                setHitTerminalState(prev => ({
                  ...prev,
                  message: statusCheck.data.message || "Processing payment..."
                }));
              }
            }
          } catch (pollError) {
            console.error("Status polling error:", pollError);
          }

          // Continue polling if payment not completed
          setTimeout(pollPaymentStatus, 3000);
        };

        // Start polling after 2 seconds
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      console.error("Windcave HIT payment error:", error);
      setHitTerminalState(prev => ({
        ...prev,
        processing: false,
        message: "Payment failed"
      }));
      toast({
        title: "Payment Failed",
        description: (error as any)?.message || "Unable to process payment",
        variant: "destructive"
      });
      setWalkupProcessing(false);
    }
  };

  // Cancel HIT payment
  const cancelHITPayment = async () => {
    if (!hitTerminalState.txnRef) return;

    try {
      await supabase.functions.invoke("windcave-hit-terminal", {
        body: {
          attractionId,
          sessionId: hitTerminalState.txnRef,
          action: "cancel"
        }
      });

      setHitTerminalState({
        processing: false,
        txnRef: null,
        message: ""
      });
      setWalkupProcessing(false);

      toast({ title: "Payment Cancelled" });
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  // Handle walk-up purchase based on payment method
  const handleWalkupPurchase = async () => {
    switch (paymentMethod) {
      case 'cash':
        await handleCashPayment();
        break;
      case 'stripe_terminal':
        await handleStripeTerminalPayment();
        break;
      case 'windcave_hit':
        await handleWindcaveHITPayment();
        break;
    }
  };

  // Product cart helper functions
  const addToProductCart = (product: Product) => {
    setProductCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromProductCart = (productId: string) => {
    setProductCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateProductCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromProductCart(productId);
      return;
    }
    setProductCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const getProductCartTotal = () => {
    return productCart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  };

  const clearProductCart = () => {
    setProductCart([]);
  };

  // Get unique product categories
  const productCategories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !productSearchQuery ||
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesCategory =
      selectedProductCategory === "all" || product.category === selectedProductCategory;
    return matchesSearch && matchesCategory;
  });

  // Process product sale
  const handleProductSale = async () => {
    if (productCart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add products to the cart before processing sale",
        variant: "destructive",
      });
      return;
    }

    setProductSaleProcessing(true);
    try {
      // Create product sales records
      const salesRecords = productCart.map((item) => ({
        attraction_id: attractionId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        payment_status: "paid",
        fulfillment_status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        sold_by: user?.id,
        sale_channel: "pos",
      }));

      const { error } = await supabase.from("product_sales").insert(salesRecords);

      if (error) throw error;

      // Update inventory for tracked products
      for (const item of productCart) {
        if (item.product.track_inventory) {
          await supabase
            .from("attraction_products")
            .update({
              inventory_count: item.product.inventory_count - item.quantity,
            })
            .eq("id", item.product.id);
        }
      }

      toast({
        title: "Sale Complete",
        description: `${productCart.length} item(s) sold for ${formatPrice(
          getProductCartTotal(),
          attractionData?.currency || "USD"
        )}`,
      });

      // Refresh products and clear cart
      const { data: updatedProducts } = await supabase
        .from("attraction_products")
        .select("*")
        .eq("attraction_id", attractionId)
        .eq("is_active", true)
        .order("display_order");

      setProducts(updatedProducts || []);
      clearProductCart();

      // Update analytics
      setAnalytics((prev) => ({
        ...prev,
        todayRevenue: prev.todayRevenue + getProductCartTotal(),
      }));
    } catch (error) {
      console.error("Product sale error:", error);
      toast({
        title: "Sale Failed",
        description: "Failed to process product sale",
        variant: "destructive",
      });
    } finally {
      setProductSaleProcessing(false);
    }
  };

  // Sidebar navigation items
  const navItems = [
    { id: 'checkin', label: 'Check-In', icon: UserCheck },
    { id: 'walkup', label: 'Walk-Up Sales', icon: ShoppingCart },
    { id: 'products', label: 'Pro Shop', icon: Store },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'waivers', label: 'Waivers', icon: FileSignature },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (authLoading || !attractionData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div>
              <h1 className="font-bold text-lg">TicketFlo LIVE</h1>
              <p className="text-xs text-gray-400 truncate">{attractionData.name}</p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Back to Dashboard */}
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Back to Dashboard</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{attractionData.name}</h2>
            <p className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* Check-In Tab */}
          {activeTab === 'checkin' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Bookings</p>
                        <p className="text-2xl font-bold">{analytics.todayBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Checked In</p>
                        <p className="text-2xl font-bold">{analytics.checkedIn}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-2xl font-bold">{analytics.pendingCheckIn}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Revenue</p>
                        <p className="text-2xl font-bold">
                          {formatPrice(analytics.todayRevenue, attractionData.currency || 'USD')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Scan */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Check-In</CardTitle>
                  <CardDescription>Scan or enter booking reference</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      ref={bookingCodeInputRef}
                      placeholder="Enter booking reference..."
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickCheckIn()}
                      className="flex-1"
                    />
                    <Button onClick={handleQuickCheckIn}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Check In
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Guest List */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Bookings</CardTitle>
                  <CardDescription>{filteredBookings.length} bookings found</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : filteredBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No bookings for this date
                      </div>
                    ) : (
                      filteredBookings.map((booking) => (
                        <div
                          key={booking.booking_id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                booking.checked_in_at ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            >
                              {booking.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{booking.customer_name}</p>
                              <p className="text-sm text-gray-500">{booking.customer_email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{booking.booking_reference}</Badge>
                                <Badge variant="secondary">
                                  {new Date(booking.slot_start_time).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </Badge>
                                <Badge variant="secondary">{booking.party_size} guests</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {booking.waiver_signed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <FileSignature className="w-3 h-3 mr-1" />
                                Waiver
                              </Badge>
                            )}
                            {booking.checked_in_at ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Checked In
                              </Badge>
                            ) : (
                              <Button size="sm" onClick={() => handleCheckIn(booking.booking_id)}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Check In
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Walk-Up Sales Tab - POS Style */}
          {activeTab === 'walkup' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Booking Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Walk-Up Booking</CardTitle>
                    <CardDescription>Select time slot and enter customer details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Time Slots Grid */}
                    <div className="space-y-2">
                      <Label>Available Time Slots</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((slot) => {
                          const available = (slot.capacity || 10) - (slot.current_bookings || 0);
                          const isSelected = walkupForm.slotId === slot.id;
                          const isDisabled = available < walkupForm.partySize;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => !isDisabled && setWalkupForm({ ...walkupForm, slotId: slot.id })}
                              disabled={isDisabled}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : isDisabled
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="font-medium">
                                {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className={`text-xs ${available <= 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {available} spots
                              </div>
                            </button>
                          );
                        })}
                        {timeSlots.length === 0 && (
                          <div className="col-span-full text-center py-4 text-gray-500">
                            No available time slots for today
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label>Customer Name *</Label>
                        <Input
                          value={walkupForm.customerName}
                          onChange={(e) => setWalkupForm({ ...walkupForm, customerName: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={walkupForm.customerEmail}
                          onChange={(e) => setWalkupForm({ ...walkupForm, customerEmail: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone (optional)</Label>
                        <Input
                          value={walkupForm.customerPhone}
                          onChange={(e) => setWalkupForm({ ...walkupForm, customerPhone: e.target.value })}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Party Size</Label>
                        <Select
                          value={walkupForm.partySize.toString()}
                          onValueChange={(v) => setWalkupForm({ ...walkupForm, partySize: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} {n === 1 ? 'guest' : 'guests'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons / Merchandise Section */}
                {addons.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-500" />
                        Add-ons & Merchandise
                      </CardTitle>
                      <CardDescription>Enhance the experience with extras</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addons.map((addon) => {
                          const quantity = getAddonQuantity(addon.id);
                          const isSelected = quantity > 0;
                          const priceLabel = addon.pricing_type === 'per_person'
                            ? `${formatPrice(addon.price, attractionData?.currency || 'USD')}/person`
                            : formatPrice(addon.price, attractionData?.currency || 'USD');

                          return (
                            <div
                              key={addon.id}
                              className={`relative p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {addon.image_url ? (
                                  <img
                                    src={addon.image_url}
                                    alt={addon.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{addon.name}</div>
                                  {addon.description && (
                                    <div className="text-xs text-gray-500 truncate">{addon.description}</div>
                                  )}
                                  <div className="text-sm font-semibold text-orange-600 mt-1">
                                    {priceLabel}
                                  </div>
                                </div>
                              </div>

                              {/* Quantity Controls */}
                              <div className="flex items-center justify-end gap-2 mt-2">
                                {isSelected ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => decrementAddon(addon.id)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">{quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => incrementAddon(addon.id)}
                                      disabled={addon.max_quantity ? quantity >= addon.max_quantity : false}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => incrementAddon(addon.id)}
                                    className="h-8"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>

                              {/* Selected indicator */}
                              {isSelected && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle className="h-5 w-5 text-orange-500 fill-orange-100" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Selected Add-ons Summary */}
                      {selectedAddons.size > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              {selectedAddons.size} add-on{selectedAddons.size > 1 ? 's' : ''} selected
                            </span>
                            <button
                              onClick={clearAddons}
                              className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Clear all
                            </button>
                          </div>
                          <div className="text-right text-sm font-semibold text-orange-600 mt-1">
                            + {formatPrice(getAddonsTotal(), attractionData?.currency || 'USD')}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Payment Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Summary */}
                  <div className="space-y-2 pb-4 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{attractionData?.name}</span>
                      <span>{formatPrice(attractionData?.base_price || 0, attractionData?.currency || 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Guests</span>
                      <span>x {walkupForm.partySize}</span>
                    </div>
                    {walkupForm.slotId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Time</span>
                        <span>
                          {timeSlots.find(s => s.id === walkupForm.slotId) &&
                            new Date(timeSlots.find(s => s.id === walkupForm.slotId)!.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium pt-1">
                      <span>Subtotal</span>
                      <span>{formatPrice(getBaseTotal(), attractionData?.currency || 'USD')}</span>
                    </div>
                  </div>

                  {/* Selected Add-ons */}
                  {selectedAddons.size > 0 && (
                    <div className="space-y-2 pb-4 border-b">
                      <div className="text-sm font-medium text-gray-700">Add-ons</div>
                      {Array.from(selectedAddons.entries()).map(([addonId, quantity]) => {
                        const addon = addons.find(a => a.id === addonId);
                        if (!addon) return null;
                        const unitPrice = addon.pricing_type === 'per_person'
                          ? addon.price * walkupForm.partySize
                          : addon.price;
                        const lineTotal = unitPrice * quantity;
                        return (
                          <div key={addonId} className="flex justify-between text-sm">
                            <span className="text-gray-500">
                              {addon.name}
                              {quantity > 1 && ` x${quantity}`}
                              {addon.pricing_type === 'per_person' && ` (x${walkupForm.partySize})`}
                            </span>
                            <span>{formatPrice(lineTotal, attractionData?.currency || 'USD')}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-sm font-medium pt-1">
                        <span>Add-ons Total</span>
                        <span className="text-orange-600">{formatPrice(getAddonsTotal(), attractionData?.currency || 'USD')}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-xl">
                    <span>Total:</span>
                    <span>{formatPrice(getWalkupTotal(), attractionData?.currency || 'USD')}</span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="stripe_terminal">Stripe Terminal (Card)</SelectItem>
                        <SelectItem value="windcave_hit">Windcave HIT Terminal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Actions */}
                  {paymentMethod === "cash" && (
                    <Button onClick={handleWalkupPurchase} disabled={walkupProcessing} className="w-full">
                      {walkupProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Record Cash Payment
                    </Button>
                  )}

                  {paymentMethod === "stripe_terminal" && (
                    <Button onClick={handleWalkupPurchase} disabled={walkupProcessing} className="w-full">
                      {walkupProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Process Card Payment
                    </Button>
                  )}

                  {paymentMethod === "windcave_hit" && (
                    <div className="space-y-3">
                      {!organizationConfig ? (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-yellow-800">Loading Windcave configuration...</p>
                        </div>
                      ) : !organizationConfig.windcave_enabled ? (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Windcave HIT terminal is not configured. Configure it in organization settings.
                          </p>
                        </div>
                      ) : !organizationConfig.windcave_station_id ? (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Windcave station ID is missing. Configure it in organization settings.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm text-green-800">
                            Terminal: <strong>{organizationConfig.windcave_station_id}</strong>
                          </p>
                        </div>
                      )}

                      {hitTerminalState.processing ? (
                        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="font-medium">Processing Payment...</span>
                          </div>
                          <p className="text-sm text-gray-600">{hitTerminalState.message}</p>
                          <Button variant="outline" size="sm" onClick={cancelHITPayment} disabled={walkupProcessing}>
                            Cancel Payment
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleWalkupPurchase}
                          disabled={walkupProcessing || !organizationConfig?.windcave_enabled || !organizationConfig?.windcave_station_id}
                          className="w-full"
                        >
                          {walkupProcessing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          Process HIT Terminal Payment
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pro Shop / Products Tab */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Grid */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={selectedProductCategory}
                    onValueChange={setSelectedProductCategory}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {productCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Grid */}
                {products.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Store className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No products available</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Add products in the attraction admin panel
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => {
                      const isLowStock =
                        product.track_inventory && product.inventory_count <= 5;
                      const isOutOfStock =
                        product.track_inventory && product.inventory_count <= 0;

                      return (
                        <button
                          key={product.id}
                          onClick={() => !isOutOfStock && addToProductCart(product)}
                          disabled={isOutOfStock}
                          className={`p-3 border rounded-lg text-left transition-all ${
                            isOutOfStock
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : "hover:border-blue-500 hover:shadow-md cursor-pointer"
                          }`}
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-20 object-cover rounded-md mb-2"
                            />
                          ) : (
                            <div className="w-full h-20 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {formatPrice(product.price, attractionData?.currency || "USD")}
                          </p>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Out of Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge variant="outline" className="mt-1 text-xs text-orange-600">
                              Low Stock ({product.inventory_count})
                            </Badge>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                    {productCart.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {productCart.reduce((sum, item) => sum + item.quantity, 0)} items
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {productCart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Cart is empty</p>
                      <p className="text-sm">Tap products to add</p>
                    </div>
                  ) : (
                    <>
                      {/* Cart Items */}
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {productCart.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatPrice(item.product.price, attractionData?.currency || "USD")} each
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateProductCartQuantity(
                                    item.product.id,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateProductCartQuantity(
                                    item.product.id,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700"
                                onClick={() => removeFromProductCart(item.product.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cart Total */}
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-bold text-lg mb-4">
                          <span>Total:</span>
                          <span>
                            {formatPrice(getProductCartTotal(), attractionData?.currency || "USD")}
                          </span>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2 mb-4">
                          <Label>Payment Method</Label>
                          <Select
                            value={productPaymentMethod}
                            onValueChange={(v: PaymentMethod) => setProductPaymentMethod(v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="stripe_terminal">Card (Stripe)</SelectItem>
                              <SelectItem value="windcave_hit">Card (Windcave)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={handleProductSale}
                            disabled={productSaleProcessing}
                          >
                            {productSaleProcessing ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4 mr-2" />
                            )}
                            Complete Sale
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={clearProductCart}
                            disabled={productSaleProcessing}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear Cart
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  Manage all bookings for {new Date(selectedDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No bookings for this date</div>
                  ) : (
                    bookings.map((booking) => (
                      <div
                        key={booking.booking_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{booking.customer_name}</p>
                          <p className="text-sm text-gray-500">{booking.customer_email}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline">{booking.booking_reference}</Badge>
                            <Badge
                              variant={
                                booking.booking_status === 'confirmed' ? 'default' :
                                booking.booking_status === 'cancelled' ? 'destructive' : 'secondary'
                              }
                            >
                              {booking.booking_status}
                            </Badge>
                            <Badge
                              variant={
                                booking.payment_status === 'completed' ? 'default' :
                                booking.payment_status === 'refunded' ? 'destructive' :
                                booking.payment_status === 'partial_refund' ? 'outline' : 'secondary'
                              }
                            >
                              {booking.payment_status}
                            </Badge>
                            <Badge variant="secondary">
                              {formatPrice(booking.total_amount, attractionData?.currency || 'USD')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {new Date(booking.slot_start_time).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-sm text-gray-500">{booking.party_size} guests</p>
                          </div>
                          {booking.booking_status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRescheduleModal(booking)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <CalendarClock className="w-4 h-4 mr-1" />
                              Reschedule
                            </Button>
                          )}
                          {booking.payment_status === 'completed' && booking.booking_status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRefundModal(booking)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waivers Tab */}
          {activeTab === 'waivers' && organizationData && (
            <div className="space-y-6">
              <AttractionWaiverConfig
                attractionId={attractionId!}
                organizationId={organizationData.id}
              />
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Today's Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Bookings</span>
                        <span className="font-bold">{analytics.todayBookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Checked In</span>
                        <span className="font-bold">{analytics.checkedIn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pending Check-In</span>
                        <span className="font-bold">{analytics.pendingCheckIn}</span>
                      </div>
                      <div className="flex justify-between border-t pt-4">
                        <span className="text-gray-500">Total Revenue</span>
                        <span className="font-bold text-lg">
                          {formatPrice(analytics.todayRevenue, attractionData?.currency || 'USD')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Check-In Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <div className="text-5xl font-bold text-blue-600">
                        {analytics.todayBookings > 0
                          ? Math.round((analytics.checkedIn / analytics.todayBookings) * 100)
                          : 0}
                        %
                      </div>
                      <p className="text-gray-500 mt-2">
                        {analytics.checkedIn} of {analytics.todayBookings} guests checked in
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Configure your attraction settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setActiveTab('waivers')}>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Manage Waivers
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Waiver Signing Modal */}
      {waiverBookingInfo && organizationData && (
        <AttractionWaiverSigning
          open={waiverModalOpen}
          onOpenChange={setWaiverModalOpen}
          attractionId={attractionId!}
          organizationId={organizationData.id}
          bookingId={waiverBookingInfo.bookingId}
          bookingReference={waiverBookingInfo.bookingReference}
          customerName={waiverBookingInfo.customerName}
          customerEmail={waiverBookingInfo.customerEmail}
          waiverTiming="at_checkin"
          onWaiverSigned={() => {
            setWaiverModalOpen(false);
            setWaiverBookingInfo(null);
            toast({
              title: 'Waiver Signed',
              description: 'The waiver has been recorded.',
            });
          }}
        />
      )}

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-500" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Move booking {rescheduleBooking?.booking_reference} to a new time slot
            </DialogDescription>
          </DialogHeader>

          {rescheduleBooking && (
            <div className="space-y-4 py-4">
              {/* Current Booking Info */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="font-medium text-sm">{rescheduleBooking.customer_name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current Time</span>
                  <span>
                    {new Date(rescheduleBooking.slot_start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Party Size</span>
                  <span>{rescheduleBooking.party_size} guests</span>
                </div>
              </div>

              {/* Select New Date */}
              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlotId("");
                    loadRescheduleSlots(e.target.value);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Select New Time Slot */}
              {rescheduleDate && (
                <div className="space-y-2">
                  <Label>New Time Slot</Label>
                  {loadingRescheduleSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No available slots for this date with enough capacity
                    </p>
                  ) : (
                    <Select value={rescheduleSlotId} onValueChange={setRescheduleSlotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {rescheduleSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id}>
                            {new Date(slot.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })} - {new Date(slot.end_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })} ({slot.capacity - slot.current_bookings} spots left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleModalOpen(false)}
              disabled={rescheduleProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleProcessing || !rescheduleSlotId}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {rescheduleProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Confirm Reschedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Refund booking {refundBooking?.booking_reference} for {refundBooking?.customer_name}
            </DialogDescription>
          </DialogHeader>

          {refundBooking && (
            <div className="space-y-4 py-4">
              {/* Booking Summary */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Original Amount</span>
                  <span className="font-medium">
                    {formatPrice(refundBooking.total_amount, attractionData?.currency || 'USD')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Party Size</span>
                  <span>{refundBooking.party_size} guests</span>
                </div>
              </div>

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundBooking.total_amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setRefundAmount(String(refundBooking.total_amount))}
                  >
                    Full
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Max refundable: {formatPrice(refundBooking.total_amount, attractionData?.currency || 'USD')}
                </p>
              </div>

              {/* Refund Reason */}
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason (Optional)</Label>
                <Select value={refundReason} onValueChange={setRefundReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested_by_customer">Customer Request</SelectItem>
                    <SelectItem value="duplicate">Duplicate Booking</SelectItem>
                    <SelectItem value="fraudulent">Fraudulent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-orange-700">
                  This action cannot be undone. The refund will be processed through Stripe and
                  the customer will be notified.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundModalOpen(false)}
              disabled={refundProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundProcessing}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {refundProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketFloLIVEAttractions;
