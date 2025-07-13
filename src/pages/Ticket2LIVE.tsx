import React, { useState, useEffect } from "react";
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
import { CreditCard, Users, CheckCircle, Printer, Plus, Search, ShoppingCart } from "lucide-react";

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
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
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

  // Load event data
  useEffect(() => {
    if (eventId) {
      loadGuests();
      loadConcessionItems();
    }
  }, [eventId]);

  const loadGuests = async () => {
    try {
      const { data, error } = await supabase
        .from("guest_status_view")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error("Error loading guests:", error);
      toast({ title: "Error loading guests", variant: "destructive" });
    }
  };

  const loadConcessionItems = async () => {
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
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleStripeTerminalPayment = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-terminal", {
        body: {
          action: "create_payment_intent",
          amount: getCartTotal(),
          eventId,
          items: cart,
          customerInfo,
        },
      });

      if (error) throw error;

      // In a real implementation, you would use Stripe Terminal JS SDK here
      toast({ 
        title: "Payment Intent Created", 
        description: "Connect to Stripe Terminal to complete payment" 
      });
      
      // Clear cart after successful payment initiation
      setCart([]);
      setCustomerInfo({ name: "", email: "" });
    } catch (error) {
      console.error("Payment error:", error);
      toast({ title: "Payment failed", variant: "destructive" });
    } finally {
      setLoading(false);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          <TabsTrigger value="guests">Guest Status</TabsTrigger>
          <TabsTrigger value="concessions">Concessions</TabsTrigger>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Concession Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {concessionItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold">${item.price.toFixed(2)}</span>
                        <Button size="sm" onClick={() => addToCart(item)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cart & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground">Cart is empty</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ${item.price.toFixed(2)} each
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="px-2">{item.quantity}</span>
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
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Customer Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      />
                      <Input
                        placeholder="Customer Email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      />
                    </div>

                    <Button onClick={handleStripeTerminalPayment} disabled={loading} className="w-full">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Process Payment (Stripe Terminal)
                    </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Manage Concession Items</CardTitle>
              <CardDescription>Add and manage items available for sale</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Concession management interface would go here. 
                This would allow adding new items, updating prices, and managing inventory.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ticket2LIVE;