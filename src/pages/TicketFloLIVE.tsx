import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Users, CheckCircle, Printer, Plus, ShoppingCart, BarChart3, TrendingUp, DollarSign, Package, Menu, Search, Home, Tag, Eye, UserCheck } from "lucide-react";
import { LanyardPreviewData, LanyardTemplate, createDefaultLanyardTemplate, getAllLanyardTemplates } from "@/types/lanyard-template";
import { LanyardPreviewSimple } from "@/components/LanyardPreviewSimple";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface GuestStatus {
  ticket_id: string;
  ticket_code: string;
  ticket_status: string;
  checked_in: boolean;
  customer_name: string;
  customer_email: string;
  ticket_type: string;
  order_date: string;
  checked_in_at?: string;
  lanyard_printed?: boolean;
}

interface ConcessionItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  stock_quantity: number | null;
}

interface CartItem extends ConcessionItem {
  quantity: number;
}

interface WindcaveHITConfig {
  windcave_enabled: boolean;
  windcave_hit_username: string | null;
  windcave_hit_key: string | null;
  windcave_station_id: string | null;
}

const TicketFloLIVE = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestStatus[]>([]);
  const [concessionItems, setConcessionItems] = useState<ConcessionItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "" });

  // Modern UI state
  const [activeTab, setActiveTab] = useState("checkin");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lanyard state
  const [currentLanyardTemplate, setCurrentLanyardTemplate] = useState<LanyardTemplate | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  
  // Concession management state
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "food",
    stock_quantity: ""
  });
  // Ticket sales state
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [ticketCart, setTicketCart] = useState<any[]>([]);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"stripe_terminal" | "windcave_hit" | "cash">("stripe_terminal");
  const [hitTerminalState, setHitTerminalState] = useState<{
    processing: boolean;
    txnRef: string | null;
    message: string;
  }>({
    processing: false,
    txnRef: null,
    message: ""
  });
  
  // Organization configuration
  const [organizationConfig, setOrganizationConfig] = useState<WindcaveHITConfig | null>(null);

  // Analytics state
const [analytics, setAnalytics] = useState<{
  totalRevenue: number;
  totalTransactions: number;
  popularItems: { name: string; count: number; revenue: number }[];
  dailySales: { date: string; amount: number }[];
  categoryBreakdown: { category: string; revenue: number }[];
  recentTransactions: any[];
}>({
  totalRevenue: 0,
  totalTransactions: 0,
  popularItems: [],
  dailySales: [],
  categoryBreakdown: [],
  recentTransactions: []
});

  // Load event data
  useEffect(() => {
    if (eventId) {
      loadGuests();
      loadConcessionItems();
      loadTicketTypes();
      loadAnalytics();
      loadOrganizationConfig();
      loadEventData();
      loadCurrentLanyardTemplate();
    }
  }, [eventId]);

  const loadEventData = async () => {
    if (!eventId) return;
    try {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          organizations (*)
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        console.error("Error loading event data:", eventError);
        return;
      }

      setEventData(event);
      setOrganizationData(event.organizations);
    } catch (error) {
      console.error("Error loading event data:", error);
    }
  };

  const loadCurrentLanyardTemplate = async () => {
    if (!eventId) return;
    try {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("organization_id")
        .eq("id", eventId)
        .single();

      if (eventError || !event) return;

      // Try to load existing template for this organization
      const { data: templates, error: templateError } = await supabase
        .from("lanyard_templates")
        .select("*")
        .eq("organization_id", event.organization_id)
        .eq("is_default", true);

      const template = templates && templates.length > 0 ? templates[0] : null;

      if (template && !templateError) {
        setCurrentLanyardTemplate(template);
      } else {
        // If no template exists, RLS policy blocks access, or table doesn't exist, create a default one
        if (templateError) {
          console.log("Template loading failed:", templateError);
        } else {
          console.log("No default template found for organization, creating default");
        }
        const defaultTemplate = createDefaultLanyardTemplate();
        const newTemplate = {
          id: `template-${defaultTemplate.name?.toLowerCase().replace(/\s+/g, '-')}`,
          organization_id: event.organization_id,
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...defaultTemplate,
        } as LanyardTemplate;

        setCurrentLanyardTemplate(newTemplate);

        // Auto-save the default template
        await saveTemplateToDatabase(newTemplate);
      }
    } catch (error) {
      console.error("Error loading lanyard template:", error);
    }
  };

  // Generate real preview data for lanyard
  const getRealPreviewData = (guestName?: string): LanyardPreviewData => {
    const sampleGuest = guests.length > 0 ? guests[0] : null;

    return {
      attendeeName: guestName || sampleGuest?.customer_name || "Sample Attendee",
      eventTitle: eventData?.name || "Sample Event",
      eventDate: eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString() : new Date().toLocaleDateString(),
      eventTime: eventData?.event_date ? new Date(eventData.event_date).toLocaleTimeString() : new Date().toLocaleTimeString(),
      ticketType: sampleGuest?.ticket_type || "General Admission",
      ticketCode: sampleGuest?.ticket_code || "SAMPLE-001",
      organizationLogo: organizationData?.logo_url,
      eventLogo: eventData?.logo_url,
      specialAccess: sampleGuest?.ticket_type?.includes('VIP') ? 'VIP Access' : undefined
    };
  };

  const loadOrganizationConfig = async () => {
    if (!eventId) return;
    try {
      // Get event to find organization_id
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, organization_id")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      // Get payment credentials from the correct table
      const { data: credentials, error: credError } = await supabase
        .from("payment_credentials")
        .select("windcave_hit_username, windcave_hit_key, windcave_station_id, windcave_enabled")
        .eq("organization_id", event.organization_id)
        .single();

      if (credError) {
        console.error("Error loading payment credentials:", credError);
        // Set empty config if no credentials found
        setOrganizationConfig({ 
          windcave_enabled: false,
          windcave_hit_username: null,
          windcave_hit_key: null,
          windcave_station_id: null
        });
        return;
      }

      console.log("Windcave HIT config loaded:", credentials);
      setOrganizationConfig({
        windcave_enabled: credentials.windcave_enabled || false,
        windcave_hit_username: credentials.windcave_hit_username,
        windcave_hit_key: credentials.windcave_hit_key,
        windcave_station_id: credentials.windcave_station_id
      });
    } catch (error) {
      console.error("Error loading organization config:", error);
      toast({
        title: "Configuration Error",
        description: "Failed to load Windcave HIT configuration",
        variant: "destructive"
      });
    }
  };

const loadGuests = async () => {
  if (!eventId) return;
  try {
    const { data, error } = await supabase
      .rpc("get_guest_status_for_event", { p_event_id: eventId });

      if (error) throw error;
      setGuests((data || []).map((g: any) => ({
        ticket_id: g.ticket_id || "",
        ticket_code: g.ticket_code || "",
        ticket_status: g.ticket_status || "",
        checked_in: !!g.checked_in,
        customer_name: g.customer_name || "",
        customer_email: g.customer_email || "",
        ticket_type: g.ticket_type || "",
        order_date: g.order_date || "",
        checked_in_at: g.checked_in_at || undefined,
        lanyard_printed: Boolean(g.lanyard_printed),
      })) as GuestStatus[]);
    } catch (error) {
      console.error("Error loading guests:", error);
      toast({ title: "Error loading guests", variant: "destructive" });
    }
  };

const loadConcessionItems = async () => {
  if (!eventId) return;
  try {
    const { data, error } = await supabase
      .from("concession_items")
      .select("*")
      .eq("event_id", eventId);

      if (error) throw error;
      setConcessionItems(data || []);
    } catch (error) {
      console.error("Error loading concession items:", error);
    }
  };

const loadTicketTypes = async () => {
  if (!eventId) return;
  try {
    const { data, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId);

      if (error) throw error;
      setTicketTypes(data || []);
    } catch (error) {
      console.error("Error loading ticket types:", error);
    }
  };

const loadAnalytics = async () => {
  if (!eventId) return;
  try {
    const { data: transactions, error } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "completed");

      if (error) throw error;

      const transactionsData = transactions || [];
      
      // Calculate total revenue
      const totalRevenue = transactionsData.reduce((sum, t) => sum + (typeof t.total_amount === 'string' ? parseFloat(t.total_amount) : t.total_amount), 0);
      
      // Get popular items from transaction items
      const itemCounts: { [key: string]: { name: string; count: number; revenue: number } } = {};
      
      transactionsData.forEach(transaction => {
        const items = Array.isArray(transaction.items) ? transaction.items : [];
        items.forEach((item: any) => {
          const key = item.name;
          if (!itemCounts[key]) {
            itemCounts[key] = { name: item.name, count: 0, revenue: 0 };
          }
          itemCounts[key].count += item.quantity || 1;
          itemCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
        });
      });

      const popularItems = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Group transactions by date for daily sales chart
      const dailySales: { [key: string]: number } = {};
      transactionsData.forEach(transaction => {
        const date = new Date(transaction.created_at).toLocaleDateString();
        const amount = typeof transaction.total_amount === 'string' ? parseFloat(transaction.total_amount) : transaction.total_amount;
        dailySales[date] = (dailySales[date] || 0) + amount;
      });

      const dailySalesArray = Object.entries(dailySales).map(([date, amount]) => ({
        date,
        amount
      }));

      // Category breakdown
      const categoryBreakdown: { [key: string]: number } = {};
      transactionsData.forEach(transaction => {
        const items = Array.isArray(transaction.items) ? transaction.items : [];
        items.forEach((item: any) => {
          const category = item.category || item.type || 'other';
          const revenue = (item.price || 0) * (item.quantity || 1);
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + revenue;
        });
      });

      const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, revenue]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        revenue
      }));

      setAnalytics({
        totalRevenue,
        totalTransactions: transactionsData.length,
        popularItems,
        dailySales: dailySalesArray,
        categoryBreakdown: categoryBreakdownArray,
        recentTransactions: transactionsData.slice(0, 5)
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

const handleCreateConcessionItem = async () => {
  if (!newItem.name || !newItem.price) {
    toast({ title: "Please fill in required fields", variant: "destructive" });
    return;
  }
  if (!eventId) {
    toast({ title: "Missing event context", variant: "destructive" });
    return;
  }

  try {
    const { error } = await supabase
      .from("concession_items")
      .insert([
        {
          event_id: eventId,
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
          category: newItem.category,
          stock_quantity: parseInt(newItem.stock_quantity) || 0
        }
      ]);

    if (error) throw error;

    toast({ title: "Item created successfully!" });
    setNewItem({ name: "", description: "", price: "", category: "food", stock_quantity: "" });
    loadConcessionItems();
  } catch (error) {
    console.error("Error creating item:", error);
    toast({ title: "Failed to create item", variant: "destructive" });
  }
};

  const handleDeleteConcessionItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("concession_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({ title: "Item deleted successfully!" });
      loadConcessionItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Failed to delete item", variant: "destructive" });
    }
  };

  const handleCheckIn = async () => {
    if (!ticketCode.trim()) {
      toast({ title: "Please enter a ticket code", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-in-guest", {
        body: {
          ticketCode: ticketCode.trim(),
          notes: checkInNotes,
          staffId: "current-user-id", // Would get from auth context
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "Guest checked in successfully!" });
        setTicketCode("");
        setCheckInNotes("");
        loadGuests();
      } else {
        toast({ title: data.error || "Check-in failed", variant: "destructive" });
      }
    } catch (error) {
      console.error("Check-in error:", error);
      toast({ title: "Check-in failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Save template to database
  const saveTemplateToDatabase = async (template: LanyardTemplate) => {
    try {
      const { error } = await supabase
        .from('lanyard_templates')
        .upsert({
          id: template.id,
          name: template.name,
          organization_id: template.organization_id,
          dimensions: template.dimensions,
          background: template.background,
          blocks: template.blocks,
          is_default: true, // Mark as default for this organization
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log("✅ Template saved:", template.name);
      toast({
        title: "Template saved",
        description: `${template.name} template saved successfully`
      });
    } catch (error) {
      console.error("❌ Error saving template:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error saving template",
        description: "Failed to save template to database",
        variant: "destructive"
      });
    }
  };

  const handlePrintLanyard = async (guest: GuestStatus) => {
    setLoading(true);
    try {
      console.log("🖨️ Printing lanyard with template:", currentLanyardTemplate?.name);
      console.log("📋 Template data:", currentLanyardTemplate);

      const { data, error } = await supabase.functions.invoke("print-lanyard", {
        body: {
          ticketId: guest.ticket_id,
          guestInfo: guest,
          template: currentLanyardTemplate,
          eventData: eventData,
          organizationData: organizationData,
        },
      });

      if (error) throw error;

      if (data.success) {
        console.log("📄 Received HTML length:", data.printHTML?.length);
        console.log("🔍 First 500 chars:", data.printHTML?.substring(0, 500));

        // Open print dialog with the generated HTML that matches preview exactly
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(data.printHTML);
          printWindow.document.close();

          // Wait for content to load, then print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }

        toast({
          title: "Lanyard printed successfully!",
          description: `Lanyard for ${guest.customer_name} opened in print dialog`
        });
        loadGuests();
      }
    } catch (error) {
      console.error("Print error:", error);
      toast({ title: "Print failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: ConcessionItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const addTicketToCart = (ticketType: any) => {
    const existingTicket = ticketCart.find(ticket => ticket.id === ticketType.id);
    if (existingTicket) {
      setTicketCart(ticketCart.map(ticket => 
        ticket.id === ticketType.id 
          ? { ...ticket, quantity: ticket.quantity + 1 }
          : ticket
      ));
    } else {
      setTicketCart([...ticketCart, { ...ticketType, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const getCartTotal = () => {
    const concessionTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const ticketTotal = ticketCart.reduce((total, ticket) => total + (ticket.price * ticket.quantity), 0);
    return concessionTotal + ticketTotal;
  };

  const handleCashPayment = async () => {
    if (cart.length === 0 && ticketCart.length === 0) return;

    setLoading(true);
    try {
      const allItems = [
        ...cart.map(item => ({ type: 'concession', ...item })),
        ...ticketCart.map(ticket => ({ type: 'ticket', ...ticket }))
      ];

      if (!eventId) throw new Error("Missing event ID");
      const { error } = await supabase
        .from("pos_transactions")
        .insert([
          {
            event_id: eventId as string,
            payment_method: "cash",
            total_amount: getCartTotal(),
            items: allItems,
            customer_name: customerInfo.name || null,
            customer_email: customerInfo.email || null,
            status: "completed"
          }
        ]);

      if (error) throw error;

      toast({ 
        title: "Cash Payment Recorded", 
        description: `Total: $${getCartTotal().toFixed(2)}` 
      });
      
      // Clear carts
      setCart([]);
      setTicketCart([]);
      setCustomerInfo({ name: "", email: "" });
    } catch (error) {
      console.error("Cash payment error:", error);
      toast({ title: "Failed to record cash payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStripeTerminalPayment = async () => {
    if (cart.length === 0 && ticketCart.length === 0) return;

    setLoading(true);
    try {
      const allItems = [
        ...cart.map(item => ({ type: 'concession', ...item })),
        ...ticketCart.map(ticket => ({ type: 'ticket', ...ticket }))
      ];

      const { error } = await supabase.functions.invoke("stripe-terminal", {
        body: {
          action: "create_payment_intent",
          amount: getCartTotal(),
          eventId,
          items: allItems,
          customerInfo,
        },
      });

      if (error) throw error;

      // In a real implementation, you would use Stripe Terminal JS SDK here
      toast({ 
        title: "Payment Intent Created", 
        description: "Connect to Stripe Terminal to complete payment" 
      });
      
      // Clear carts after successful payment initiation
      setCart([]);
      setTicketCart([]);
      setCustomerInfo({ name: "", email: "" });
    } catch (error) {
      console.error("Payment error:", error);
      toast({ title: "Payment failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWindcaveHITPayment = async () => {
    if (cart.length === 0 && ticketCart.length === 0) return;
    if (!organizationConfig?.windcave_enabled || !organizationConfig?.windcave_station_id) {
      toast({ 
        title: "Windcave Configuration Missing", 
        description: "Please configure Windcave HIT terminal in organization settings",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    setHitTerminalState(prev => ({ ...prev, processing: true, message: "Initiating payment..." }));
    
    try {
      const allItems = [
        ...cart.map(item => ({ type: 'concession', ...item })),
        ...ticketCart.map(ticket => ({ type: 'ticket', ...ticket }))
      ];

      const { data, error } = await supabase.functions.invoke("windcave-hit-terminal", {
        body: {
          eventId,
          action: "purchase",
          items: allItems.map(item => ({
            id: item.id,
            ticketTypeId: item.id,
            quantity: item.quantity,
            price: item.price,
            type: item.type
          })),
          customerInfo
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
              // Update display with terminal messages
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
                  
                  // Clear carts
                  setCart([]);
                  setTicketCart([]);
                  setCustomerInfo({ name: "", email: "" });
                  loadAnalytics();
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
                  return;
                }
              } else {
                // Update terminal display message
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
    } finally {
      setLoading(false);
    }
  };

  const cancelHITPayment = async () => {
    if (!hitTerminalState.txnRef) return;

    try {
      await supabase.functions.invoke("windcave-hit-terminal", {
        body: {
          eventId,
          sessionId: hitTerminalState.txnRef,
          action: "cancel"
        }
      });

      setHitTerminalState({
        processing: false,
        txnRef: null,
        message: ""
      });

      toast({ title: "Payment Cancelled" });
    } catch (error) {
      console.error("Cancel payment error:", error);
    }
  };

  const stats = {
    totalGuests: guests.length,
    checkedIn: guests.filter(g => g.checked_in).length,
    lanyardsPrinted: guests.filter(g => g.lanyard_printed).length,
  };

  // Filter guests based on search query
  const getFilteredGuests = (checkedIn?: boolean) => {
    let filteredGuests = guests;

    if (checkedIn !== undefined) {
      filteredGuests = guests.filter(g => g.checked_in === checkedIn);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredGuests = filteredGuests.filter(g =>
        g.customer_name.toLowerCase().includes(query) ||
        g.customer_email.toLowerCase().includes(query) ||
        g.ticket_code.toLowerCase().includes(query)
      );
    }

    return filteredGuests;
  };

  // Sidebar navigation items
  const sidebarItems = [
    { id: "checkin", icon: CheckCircle, label: "Check-In" },
    { id: "pos", icon: CreditCard, label: "Point of Sale" },
    { id: "guests", icon: Users, label: "Guest Status" },
    { id: "concessions", icon: Package, label: "Manage Items" },
    { id: "lanyards", icon: Tag, label: "Lanyard Config" },
    { id: "analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Vertical Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-gray-900 text-white flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold">TicketFloLIVE</h1>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {!isSidebarCollapsed && <span className="ml-3">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Dashboard Button */}
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Home className="h-5 w-5" />
            {!isSidebarCollapsed && <span className="ml-3">Dashboard</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Event Management</h1>
              <p className="text-sm text-gray-500">Real-time event operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search guests, tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedIn}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lanyards Printed</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lanyardsPrinted}</div>
          </CardContent>
        </Card>
          </div>

          {/* Tab Content */}
          {activeTab === "checkin" && (
            <div className="space-y-6">
              {/* Search and Quick Actions Bar */}
              <Card>
                <CardHeader>
                  <CardTitle>Guest Check-In</CardTitle>
                  <CardDescription>Search guests by email or scan ticket codes to check in</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Search by Email/Name */}
                    <div className="space-y-2">
                      <Label htmlFor="guestSearch">Search Guests</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="guestSearch"
                          placeholder="Search by name, email, or ticket code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Quick Scan Check-In */}
                    <div className="space-y-2">
                      <Label htmlFor="ticketCode">Quick Scan/Check-In</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="ticketCode"
                          placeholder="Scan or enter ticket code"
                          value={ticketCode}
                          onChange={(e) => setTicketCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={handleCheckIn} disabled={loading}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section (only show when ticket code is entered) */}
                  {ticketCode && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="notes">Check-In Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional notes for this check-in..."
                        value={checkInNotes}
                        onChange={(e) => setCheckInNotes(e.target.value)}
                        className="h-20"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guest List Card */}
              <Card>
                <CardHeader>
                  <CardTitle>All Guests ({getFilteredGuests().length})</CardTitle>
                  <CardDescription>
                    {searchQuery ? `Showing results for "${searchQuery}"` : 'All event guests - click to check in or print lanyards'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getFilteredGuests().length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">
                          {searchQuery ? 'No guests found matching your search.' : 'No guests found.'}
                        </p>
                        {searchQuery && (
                          <p className="text-sm mt-2">
                            Try searching by name, email, or ticket code
                          </p>
                        )}
                      </div>
                    ) : (
                      getFilteredGuests().map((guest) => (
                        <div
                          key={guest.ticket_id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{guest.customer_name}</h3>
                                <p className="text-sm text-gray-500">{guest.customer_email}</p>
                                <div className="flex items-center space-x-3 mt-1">
                                  <p className="text-xs text-gray-400">Ticket: {guest.ticket_code}</p>
                                  {guest.ticket_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {guest.ticket_type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={guest.checked_in ? "default" : "secondary"}>
                                  {guest.checked_in ? "✓ Checked In" : "Pending"}
                                </Badge>
                                {guest.checked_in && guest.lanyard_printed && (
                                  <p className="text-xs text-green-600 mt-1">Lanyard Printed</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {!guest.checked_in ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setTicketCode(guest.ticket_code);
                                  handleCheckIn();
                                }}
                                disabled={loading}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Check In
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintLanyard(guest)}
                                disabled={loading}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Print Lanyard
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

          {/* Point of Sale Tab */}
          {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Tickets</CardTitle>
                  <CardDescription>Sell tickets directly at the event</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticketTypes.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4 bg-blue-50/50">
                        <h3 className="font-semibold">{ticket.name}</h3>
                        <p className="text-sm text-muted-foreground">{ticket.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-blue-600">${ticket.price}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {ticket.quantity_available - ticket.quantity_sold} left
                            </Badge>
                            <Button size="sm" onClick={() => addTicketToCart(ticket)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Concession Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Concession Items</CardTitle>
                  <CardDescription>Food, drinks, and merchandise</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {concessionItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-green-50/50">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.stock_quantity ?? 0} in stock</Badge>
                            <Button size="sm" onClick={() => addToCart(item)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle>Cart & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ticket Cart */}
                {ticketCart.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">Tickets</h4>
                    {ticketCart.map((ticket) => (
                      <div key={`ticket-${ticket.id}`} className="flex justify-between items-center py-2 border-b">
                        <div className="flex-1">
                          <span className="font-medium">{ticket.name}</span>
                          <div className="text-sm text-muted-foreground">
                            ${ticket.price} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTicketCart(ticketCart.map(t => 
                              t.id === ticket.id 
                                ? { ...t, quantity: Math.max(0, t.quantity - 1) }
                                : t
                            ).filter(t => t.quantity > 0))}
                          >
                            -
                          </Button>
                          <span className="px-2 min-w-[2rem] text-center">{ticket.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTicketCart(ticketCart.map(t => 
                              t.id === ticket.id ? { ...t, quantity: t.quantity + 1 } : t
                            ))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Concession Cart */}
                {cart.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Concessions</h4>
                    {cart.map((item) => (
                      <div key={`concession-${item.id}`} className="flex justify-between items-center py-2 border-b">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="px-2 min-w-[2rem] text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {cart.length === 0 && ticketCart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Customer Name (Optional)"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      />
                      <Input
                        placeholder="Customer Email (Optional)"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stripe_terminal">Stripe Terminal (Card)</SelectItem>
                          <SelectItem value="windcave_hit">Windcave HIT Terminal</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentMethod === "stripe_terminal" ? (
                      <Button onClick={handleStripeTerminalPayment} disabled={loading} className="w-full">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Process Card Payment
                      </Button>
                    ) : paymentMethod === "windcave_hit" ? (
                      <div className="space-y-3">
                        {!organizationConfig ? (
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              Loading Windcave configuration...
                            </p>
                          </div>
                        ) : !organizationConfig.windcave_enabled ? (
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              Windcave HIT terminal is not configured for this organization. 
                              Please configure it in the organization settings.
                            </p>
                          </div>
                        ) : !organizationConfig.windcave_station_id ? (
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              Windcave station ID is missing. Please configure it in organization settings.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm text-green-800">
                              Terminal Station ID: <strong>{organizationConfig.windcave_station_id}</strong>
                            </p>
                          </div>
                        )}
                        
                        {hitTerminalState.processing ? (
                          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="font-medium">Processing Payment...</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{hitTerminalState.message}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={cancelHITPayment}
                              disabled={loading}
                            >
                              Cancel Payment
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={handleWindcaveHITPayment} 
                            disabled={loading || !organizationConfig?.windcave_enabled || !organizationConfig?.windcave_station_id} 
                            className="w-full"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Process HIT Terminal Payment
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button onClick={handleCashPayment} disabled={loading} className="w-full" variant="outline">
                        💵 Record Cash Payment
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {/* Guest Status Tab */}
          {activeTab === "guests" && (
          <Card>
            <CardHeader>
              <CardTitle>Guest Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {guests.map((guest) => (
                  <div key={guest.ticket_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold">{guest.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{guest.customer_email}</p>
                          <p className="text-sm">Ticket: {guest.ticket_code}</p>
                        </div>
                        <Badge variant={guest.checked_in ? "default" : "secondary"}>
                          {guest.checked_in ? "Checked In" : "Not Checked In"}
                        </Badge>
                        {guest.lanyard_printed && (
                          <Badge variant="outline">Lanyard Printed</Badge>
                        )}
                      </div>
                    </div>
                    
                    {guest.checked_in && !guest.lanyard_printed && (
                      <Button
                        size="sm"
                        onClick={() => handlePrintLanyard(guest)}
                        disabled={loading}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Lanyard
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Concessions Management Tab */}
          {activeTab === "concessions" && (
          <div className="space-y-6">
            {/* Add New Item */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Concession Item</CardTitle>
                <CardDescription>Create new items for sale at your event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      placeholder="e.g., Hot Dog, Soda, T-Shirt"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (USD) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.99"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="drinks">Drinks</SelectItem>
                        <SelectItem value="merchandise">Merchandise</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={newItem.stock_quantity}
                      onChange={(e) => setNewItem({...newItem, stock_quantity: e.target.value})}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional description of the item"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  />
                </div>
                <Button onClick={handleCreateConcessionItem} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            {/* Existing Items */}
            <Card>
              <CardHeader>
                <CardTitle>Current Concession Items</CardTitle>
                <CardDescription>Manage your existing inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {concessionItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No concession items yet. Add your first item above!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {concessionItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1">
                                <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                                <Badge variant="outline">{item.category}</Badge>
                                <Badge variant={(item.stock_quantity ?? 0) > 10 ? "default" : "destructive"}>
                                  {(item.stock_quantity ?? 0)} in stock
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteConcessionItem(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {/* Lanyard Configuration Tab */}
          {activeTab === "lanyards" && (
            <div className="space-y-6">
              {/* Lanyard Template Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Lanyard Template Preview</CardTitle>
                  <CardDescription>
                    Preview how lanyards will look for your event guests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
                    {currentLanyardTemplate ? (
                      <div className="space-y-4">
                        <LanyardPreviewSimple
                          template={currentLanyardTemplate}
                          previewData={getRealPreviewData()}
                        />
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Sample Lanyard Preview</p>
                          <p className="text-xs text-gray-500">Template: {currentLanyardTemplate.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Loading lanyard template...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Eye className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                    <h3 className="font-medium mb-2">Preview Lanyards</h3>
                    <p className="text-sm text-gray-600 mb-4">See how lanyards look with real guest data</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Live Lanyard Preview</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center p-4">
                          {currentLanyardTemplate && (
                            <LanyardPreviewSimple
                              template={currentLanyardTemplate}
                              previewData={getRealPreviewData()}
                            />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Printer className="h-8 w-8 mx-auto mb-3 text-green-500" />
                    <h3 className="font-medium mb-2">Test Print</h3>
                    <p className="text-sm text-gray-600 mb-4">Print a sample lanyard to test layout</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (guests.length > 0) {
                          handlePrintLanyard(guests[0]);
                        } else {
                          toast({ title: "No guests available for test print" });
                        }
                      }}
                      disabled={loading || guests.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Test Print
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Tag className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                    <h3 className="font-medium mb-2">Template Selection</h3>
                    <p className="text-sm text-gray-600 mb-4">Choose from professional templates</p>
                    <div className="space-y-3">
                      <Select
                        value={currentLanyardTemplate?.name || ''}
                        onValueChange={async (templateName) => {
                          const templates = getAllLanyardTemplates();
                          const selectedTemplate = templates.find(t => t.name === templateName);
                          if (selectedTemplate) {
                            const newTemplate = {
                              id: `template-${templateName.toLowerCase().replace(/\s+/g, '-')}`,
                              organization_id: eventData?.organization_id || 'default',
                              isDefault: false,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              ...selectedTemplate,
                            } as LanyardTemplate;

                            setCurrentLanyardTemplate(newTemplate);

                            // Auto-save template to database
                            await saveTemplateToDatabase(newTemplate);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllLanyardTemplates().map((template) => (
                            <SelectItem key={template.name} value={template.name || 'default'}>
                              <div className="flex items-center gap-2">
                                <Tag className="h-3 w-3" />
                                {template.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Custom Text Configuration */}
                      {currentLanyardTemplate && currentLanyardTemplate.blocks?.some(block => block.type === 'custom_text' && (block as any).text) && (
                        <div className="pt-2 border-t space-y-2">
                          <Label className="text-xs font-medium">Custom Text</Label>
                          {currentLanyardTemplate.blocks
                            .filter(block => block.type === 'custom_text' && (block as any).text)
                            .map((block, index) => (
                              <div key={block.id} className="space-y-1">
                                <Label className="text-xs text-gray-600">
                                  {(block as any).text === 'VIP ACCESS' ? 'VIP Badge Text' : `Custom Text ${index + 1}`}
                                </Label>
                                <Input
                                  value={(block as any).text || ''}
                                  onChange={async (e) => {
                                    const updatedTemplate = {
                                      ...currentLanyardTemplate!,
                                      blocks: currentLanyardTemplate!.blocks?.map(b =>
                                        b.id === block.id
                                          ? { ...b, text: e.target.value }
                                          : b
                                      ) || []
                                    };

                                    setCurrentLanyardTemplate(updatedTemplate);

                                    // Auto-save custom text changes with debounce
                                    clearTimeout((window as any).customTextSaveTimeout);
                                    (window as any).customTextSaveTimeout = setTimeout(async () => {
                                      await saveTemplateToDatabase(updatedTemplate);
                                    }, 1000); // Save 1 second after user stops typing
                                  }}
                                  placeholder="Enter custom text..."
                                  className="text-xs"
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bulk Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Lanyard Actions</CardTitle>
                  <CardDescription>
                    Print lanyards for multiple guests at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => {
                        const checkedInGuests = guests.filter(g => g.checked_in && !g.lanyard_printed);
                        checkedInGuests.forEach(guest => handlePrintLanyard(guest));
                        toast({
                          title: `Printing ${checkedInGuests.length} lanyards`,
                          description: "Lanyards will open in separate print dialogs"
                        });
                      }}
                      disabled={loading || guests.filter(g => g.checked_in && !g.lanyard_printed).length === 0}
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Checked-In ({guests.filter(g => g.checked_in && !g.lanyard_printed).length})
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        const allGuests = guests.filter(g => !g.lanyard_printed);
                        allGuests.forEach(guest => handlePrintLanyard(guest));
                        toast({
                          title: `Printing ${allGuests.length} lanyards`,
                          description: "Lanyards will open in separate print dialogs"
                        });
                      }}
                      disabled={loading || guests.filter(g => !g.lanyard_printed).length === 0}
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Guests ({guests.filter(g => !g.lanyard_printed).length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">From all POS sales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">Completed sales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics.totalTransactions > 0 ? (analytics.totalRevenue / analytics.totalTransactions).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Per transaction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.popularItems.reduce((sum, item) => sum + item.count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total items</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>Most popular items by quantity sold</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.popularItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No sales data yet</p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.popularItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.count} sold</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${item.revenue.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                  <CardDescription>Sales breakdown by item categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.categoryBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No category data yet</p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.categoryBreakdown.map((category, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{category.category}</span>
                            <span className="font-bold">${category.revenue.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ 
                                width: `${analytics.totalRevenue > 0 ? (category.revenue / analytics.totalRevenue) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {analytics.totalRevenue > 0 ? ((category.revenue / analytics.totalRevenue) * 100).toFixed(1) : 0}% of total revenue
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trend</CardTitle>
                <CardDescription>Revenue performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.dailySales.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No daily sales data yet</p>
                ) : (
                  <div className="space-y-4">
                    {analytics.dailySales.map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{day.date}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.max(10, (day.amount / Math.max(...analytics.dailySales.map(d => d.amount))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="font-bold min-w-[80px] text-right">${day.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest POS sales activity</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.recentTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent transactions</p>
                ) : (
                  <div className="space-y-4">
                    {analytics.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {transaction.customer_name || 'Anonymous Customer'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(transaction.items || []).length} items • {transaction.payment_method}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${parseFloat(transaction.total_amount).toFixed(2)}</p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refresh Analytics */}
            <div className="flex justify-center">
              <Button onClick={loadAnalytics} variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Refresh Analytics
              </Button>
            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TicketFloLIVE;