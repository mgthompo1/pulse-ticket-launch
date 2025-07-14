import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingCart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

// Extend the global Window interface to include WindcavePayments
declare global {
  interface Window {
    WindcavePayments?: any;
  }
}

const TicketWidget = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [loading, setLoading] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<string>("stripe");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [windcaveDropIn, setWindcaveDropIn] = useState<any>(null);
  const [windcaveLinks, setWindcaveLinks] = useState<any[]>([]);
  const dropInRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      // Load event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          organizations (
            name,
            payment_provider,
            stripe_account_id,
            windcave_enabled,
            windcave_username,
            windcave_api_key,
            windcave_endpoint
          )
        `)
        .eq("id", eventId)
        .eq("status", "published")
        .single();

      if (eventError) {
        console.error("Event error:", eventError);
        throw eventError;
      }

      if (!event) {
        throw new Error("Event not found or not published");
      }

      setEventData(event);
      setPaymentProvider(event.organizations?.payment_provider || "stripe");

      // Load ticket types
      const { data: types, error: typesError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("price", { ascending: true });

      if (typesError) {
        console.error("Ticket types error:", typesError);
        throw typesError;
      }

      setTicketTypes(types || []);
      
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
  };

  const addToCart = (ticketType: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === ticketType.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === ticketType.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...ticketType, quantity: 1 }];
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
        // Create Windcave session and initialize Drop-In
        const { data, error } = await supabase.functions.invoke("windcave-session", {
          body: { 
            eventId, 
            items: cart,
            customerInfo 
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
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { 
            eventId, 
            items: cart,
            customerInfo 
          }
        });

        if (error) throw error;

        const stripe = await loadStripe("pk_test_your_stripe_publishable_key");
        if (!stripe) throw new Error("Failed to load Stripe");

        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });

        if (stripeError) throw stripeError;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during checkout",
        variant: "destructive"
      });
    }
  };

  const initializeWindcaveDropIn = (links: any[], totalAmount: number) => {
    // Check if WindcavePayments is available
    if (typeof window !== 'undefined' && window.WindcavePayments) {
      const dropInContainer = dropInRef.current;
      if (!dropInContainer) {
        console.error("Drop-in container not found");
        return;
      }

      try {
        const dropInOptions = {
          container: "windcave-drop-in",
          links: links,
          totalValue: totalAmount.toFixed(2),
          mobilePayments: {
            merchantName: eventData?.organizations?.name || "Event Tickets",
            countryCode: "NZ",
            currencyCode: "NZD",
            supportedNetworks: ["visa", "mastercard", "amex"],
            isTest: true
          },
          card: {
            supportedCards: ["visa", "mastercard", "amex"],
            sideIcons: ["visa", "mastercard", "amex"]
          },
          onSuccess: (status: string) => {
            console.log("Payment success:", status);
            if (status === "Done") {
              toast({
                title: "Payment Successful",
                description: "Your payment has been processed successfully!"
              });
              // Redirect to success page or handle success
              window.location.href = "/payment-success";
            }
          },
          onError: (stage: string, error: any) => {
            console.error("Payment error:", { stage, error });
            toast({
              title: "Payment Error",
              description: `Payment failed at ${stage}: ${error.message || error}`,
              variant: "destructive"
            });
          }
        };

        console.log("Initializing Windcave Drop-In with options:", dropInOptions);

        const dropIn = window.WindcavePayments.DropIn.create(
          dropInOptions,
          (controller: any) => {
            console.log("Drop-In successfully created:", controller);
            setWindcaveDropIn(controller);
          },
          (error: any) => {
            console.error("Failed to create Drop-In:", error);
            toast({
              title: "Payment Error",
              description: "Failed to initialize payment form",
              variant: "destructive"
            });
          }
        );
      } catch (error) {
        console.error("Error initializing Windcave Drop-In:", error);
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment form",
          variant: "destructive"
        });
      }
    } else {
      console.log("WindcavePayments not available yet, retrying...");
      // Retry after a short delay
      setTimeout(() => initializeWindcaveDropIn(links, totalAmount), 500);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p>The event you're looking for doesn't exist or is not available.</p>
        </div>
      </div>
    );
  }

  if (showPaymentForm && paymentProvider === "windcave") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToTickets}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>Complete Your Payment</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Total: ${getTotalAmount().toFixed(2)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Order Summary</h3>
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {customerInfo.name}</p>
                    <p><strong>Email:</strong> {customerInfo.email}</p>
                    {customerInfo.phone && <p><strong>Phone:</strong> {customerInfo.phone}</p>}
                  </div>
                </div>

                {/* Windcave Drop-In Container */}
                <div 
                  ref={dropInRef}
                  id="windcave-drop-in"
                  className="border rounded-lg p-4 min-h-[300px]"
                >
                  <div className="text-center text-muted-foreground">
                    Loading payment form...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Event Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{eventData.name}</CardTitle>
            <p className="text-muted-foreground">{eventData.description}</p>
            <div className="flex gap-4 text-sm">
              <span><strong>Date:</strong> {new Date(eventData.event_date).toLocaleDateString()}</span>
              <span><strong>Venue:</strong> {eventData.venue}</span>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ticketTypes.map((ticketType) => (
                    <div key={ticketType.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{ticketType.name}</h3>
                          <p className="text-sm text-muted-foreground">{ticketType.description}</p>
                        </div>
                        <span className="font-bold">${ticketType.price}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {ticketType.quantity_available - ticketType.quantity_sold} available
                        </span>
                        <Button onClick={() => addToCart(ticketType)}>
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart and Checkout */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground">Your cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">${item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>${getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+64 21 123 4567"
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleCheckout}
                      disabled={!customerInfo.name || !customerInfo.email}
                    >
                      Proceed to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketWidget;