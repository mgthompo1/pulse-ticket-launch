import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, ShoppingCart } from "lucide-react";

const TicketWidget = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "windcave">("stripe");
  const [cart, setCart] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          organizations!inner(payment_provider, windcave_enabled)
        `)
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
      setPaymentProvider((eventData.organizations.payment_provider as "stripe" | "windcave") || "stripe");

      const { data: ticketTypesData, error: ticketTypesError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId);

      if (ticketTypesError) throw ticketTypesError;
      setTicketTypes(ticketTypesData || []);
      
    } catch (error) {
      console.error("Error loading event data:", error);
      toast({
        title: "Error",
        description: "Could not load event information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (ticketType: any) => {
    const existingItem = cart.find(item => item.id === ticketType.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === ticketType.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...ticketType, quantity: 1 }]);
    }
  };

  const removeFromCart = (ticketTypeId: string) => {
    setCart(cart.filter(item => item.id !== ticketTypeId));
  };

  const updateCartQuantity = (ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(ticketTypeId);
      return;
    }
    setCart(cart.map(item => 
      item.id === ticketTypeId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Please add tickets to your cart first",
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

    try {
      if (paymentProvider === "windcave") {
        // Handle Windcave payment
        const { data, error } = await supabase.functions.invoke("windcave-session", {
          body: { 
            eventId, 
            items: cart,
            customerInfo 
          }
        });

        if (error) throw error;

        console.log("Windcave response received:", data);

        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          console.error("No redirect URL found. Full response:", data);
          throw new Error(`No redirect URL received from Windcave. Debug info: ${JSON.stringify(data.debug || {})}`);
        }
      } else {
        // Handle Stripe payment (existing logic)
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { 
            eventId, 
            items: cart,
            customerInfo 
          }
        });

        if (error) throw error;

        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          throw new Error("No payment URL received");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground">This event may not exist or is not published.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTotalTickets = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{event.name}</CardTitle>
            <CardDescription>{event.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.event_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Venue</p>
                  <p className="text-sm text-muted-foreground">{event.venue}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Capacity</p>
                  <p className="text-sm text-muted-foreground">{event.capacity}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ticket Selection */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Available Tickets
                </h3>
                
                {ticketTypes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No ticket types available yet.
                  </p>
                ) : (
                  ticketTypes.map((ticketType) => (
                    <div key={ticketType.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{ticketType.name}</h4>
                        {ticketType.description && (
                          <p className="text-sm text-muted-foreground">{ticketType.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-lg font-bold text-primary">
                            ${ticketType.price}
                          </span>
                          <Badge variant="outline">
                            {ticketType.quantity_available - ticketType.quantity_sold} available
                          </Badge>
                        </div>
                      </div>
                      <Button onClick={() => addToCart(ticketType)}>
                        Add to Cart
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Cart & Checkout */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Cart</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No tickets in cart</p>
                    ) : (
                      <>
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">${item.price} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-4">
                          <div className="flex justify-between font-bold">
                            <span>Total: {getTotalTickets()} tickets</span>
                            <span>${getTotalAmount().toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {cart.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name *</label>
                        <Input
                          placeholder="Enter your full name"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address *</label>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number</label>
                        <Input
                          type="tel"
                          placeholder="Enter your phone number"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <Button onClick={handleCheckout} className="w-full gradient-primary">
                        {paymentProvider === "windcave" ? "Pay with Windcave" : "Pay with Stripe"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Secure payment processing via {paymentProvider === "windcave" ? "Windcave" : "Stripe"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketWidget;