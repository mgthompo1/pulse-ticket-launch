import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { CreditCard, Users, CheckCircle, Printer, Plus, ShoppingCart, BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";

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

const Ticket2LIVE = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestStatus[]>([]);
  const [concessionItems, setConcessionItems] = useState<ConcessionItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "" });
  
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
  const [organizationConfig, setOrganizationConfig] = useState<any>(null);

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
    }
  }, [eventId]);

const loadOrganizationConfig = async () => {
  if (!eventId) return;
  try {
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        organizations!inner(
          windcave_hit_username,
          windcave_hit_key,
          windcave_station_id,
          windcave_enabled
        )
      `)
      .eq("id", eventId)
      .single();

    if (error) throw error;
    console.log("Organization config loaded:", event?.organizations);
    setOrganizationConfig(event?.organizations);
  } catch (error) {
    console.error("Error loading organization config:", error);
    toast({
      title: "Configuration Error",
      description: "Failed to load Windcave configuration",
      variant: "destructive"
    });
  }
};

const loadGuests = async () => {
  if (!eventId) return;
  try {
    const { data, error } = await supabase
      .from("guest_status_view")
      .select("*")
      .eq("event_id", eventId);

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

  const handlePrintLanyard = async (guest: GuestStatus) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("print-lanyard", {
        body: {
          ticketId: guest.ticket_id,
          guestInfo: guest,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Open print dialog with the generated HTML
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(data.printHTML);
          printWindow.document.close();
          printWindow.print();
        }
        
        toast({ title: "Lanyard printed successfully!" });
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Ticket2LIVE - Event Management</h1>
      
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

      <Tabs defaultValue="checkin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          <TabsTrigger value="guests">Guest Status</TabsTrigger>
          <TabsTrigger value="concessions">Manage Items</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Check-In Tab */}
        <TabsContent value="checkin">
          <Card>
            <CardHeader>
              <CardTitle>Guest Check-In</CardTitle>
              <CardDescription>Scan or enter ticket codes to check in guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketCode">Ticket Code</Label>
                <Input
                  id="ticketCode"
                  placeholder="Enter or scan ticket code"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                />
              </div>
              
              <Button onClick={handleCheckIn} disabled={loading} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Check In Guest
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Point of Sale Tab */}
        <TabsContent value="pos">
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
        </TabsContent>

        {/* Guest Status Tab */}
        <TabsContent value="guests">
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
        </TabsContent>

        {/* Concessions Management Tab */}
        <TabsContent value="concessions">
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ticket2LIVE;