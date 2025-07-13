import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Clock, Users, Ticket, CreditCard, ShoppingCart, Minus, Plus, Loader2 } from "lucide-react";

const stripePromise = loadStripe("pk_test_51QX4c8L8rGzBRPl8KE6yOJCjvqFgBYcYIvFiO8LlvQhYHV8vKbNvVN1eR4mDcaOFQHdgJQoWZhEaKmCOhGgSFGzD00fZ9aWyOT");

const PaymentForm = ({ eventId, tickets, customerInfo, total, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          eventId,
          tickets,
          customerInfo
        }
      });

      if (error) throw error;

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
          },
        }
      });

      if (result.error) {
        toast({
          title: "Payment failed",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        // Update order status to trigger email
        await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", data.orderId);

        // Send confirmation email
        await supabase.functions.invoke("send-ticket-email", {
          body: { orderId: data.orderId }
        });

        toast({
          title: "Payment successful!",
          description: "Your tickets have been confirmed and sent to your email."
        });
        onSuccess(data.orderId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement />
      </div>
      <Button 
        type="submit" 
        className="w-full gradient-primary hover-scale" 
        size="lg"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${total}
          </>
        )}
      </Button>
    </form>
  );
};

const TicketWidget = () => {
  const { orgId } = useParams();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadEventData = async () => {
      console.log("orgId from params:", orgId);
      
      if (!orgId || orgId === ":orgId") {
        console.error("Invalid orgId:", orgId);
        setLoading(false);
        return;
      }

      try {
        // Get organization
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        console.log("Organization query result:", { org, orgError });

        if (orgError) {
          console.error("Organization error:", orgError);
          throw orgError;
        }
        setOrganization(org);

        // Get published events for this organization
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("organization_id", orgId)
          .eq("status", "published")
          .order("event_date", { ascending: true })
          .limit(1);

        if (eventsError) throw eventsError;
        
        if (events && events.length > 0) {
          const eventData = events[0];
          setEvent(eventData);

          // Get ticket types for this event  
          const { data: tickets, error: ticketsError } = await supabase
            .from("ticket_types")
            .select("*")
            .eq("event_id", eventData.id)
            .order("price", { ascending: true });

          if (ticketsError) throw ticketsError;
          setTicketTypes(tickets || []);

          // Initialize quantities
          const initialQuantities: Record<string, number> = {};
          tickets?.forEach(ticket => {
            initialQuantities[ticket.id] = 0;
          });
          setTicketQuantities(initialQuantities);
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
    };

    loadEventData();
  }, [orgId]);

  const updateQuantity = (ticketId, change) => {
    setTicketQuantities(prev => ({
      ...prev,
      [ticketId]: Math.max(0, Math.min(10, prev[ticketId] + change))
    }));
  };

  const getTotalPrice = () => {
    return ticketTypes.reduce((total, ticket) => {
      return total + (ticket.price * (ticketQuantities[ticket.id] || 0));
    }, 0);
  };

  const getTotalTickets = (): number => {
    return Object.values(ticketQuantities).reduce((sum: number, qty: number) => sum + qty, 0);
  };

  const getPlatformFee = (): number => {
    const subtotal = getTotalPrice();
    const totalTickets = getTotalTickets();
    return Math.round(subtotal * 0.01) + (totalTickets * 0.5); // 1% + $0.50 per ticket
  };

  const getTotal = (): number => {
    return getTotalPrice() + getPlatformFee();
  };

  const handleProceedToPayment = () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and email",
        variant: "destructive"
      });
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = (orderId) => {
    toast({
      title: "Success!",
      description: `Order ${orderId} confirmed. Check your email for tickets.`
    });
    // Reset form
    const initialQuantities: Record<string, number> = {};
    ticketTypes.forEach(ticket => {
      initialQuantities[ticket.id] = 0;
    });
    setTicketQuantities(initialQuantities);
    setCustomerInfo({ name: "", email: "", phone: "" });
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            {!orgId || orgId === ":orgId" ? (
              <>
                <h2 className="text-xl font-semibold mb-2">Invalid URL</h2>
                <p className="text-muted-foreground">
                  Please access this widget with a valid organization ID in the URL.
                </p>
                <p className="text-xs text-muted-foreground">
                  Expected format: /widget/[organization-id]
                </p>
                <p className="text-xs text-muted-foreground">
                  Current URL: {window.location.pathname}
                </p>
              </>
            ) : organization ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No Events Available</h2>
                <p className="text-muted-foreground">
                  {organization.name} doesn't have any published events at the moment.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
                <p className="text-muted-foreground">
                  The organization with ID "{orgId}" could not be found.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Event Header */}
        <Card className="mb-8 gradient-card">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {event.name}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {event.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{new Date(event.event_date).toLocaleDateString()}</span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{event.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{event.capacity} Capacity</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Select Your Tickets
                </CardTitle>
                <CardDescription>Choose your ticket type and quantity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{ticket.name}</h3>
                          <Badge variant={(ticket.quantity_available - ticket.quantity_sold) > 10 ? "default" : "destructive"}>
                            {ticket.quantity_available - ticket.quantity_sold} left
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{ticket.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">${ticket.price}</span>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ticket.id, -1)}
                              disabled={(ticketQuantities[ticket.id] || 0) === 0}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {ticketQuantities[ticket.id] || 0}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ticket.id, 1)}
                              disabled={(ticketQuantities[ticket.id] || 0) >= 10 || (ticket.quantity_available - ticket.quantity_sold) === 0}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Seat Selection (if applicable) */}
            {getTotalTickets() > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Seats</CardTitle>
                  <CardDescription>Select your preferred seating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/20 p-6 rounded-lg text-center">
                    <div className="mb-4">
                      <div className="bg-primary/20 text-primary px-4 py-2 rounded inline-block text-sm font-medium">
                        STAGE
                      </div>
                    </div>
                    <div className="grid grid-cols-8 gap-1 max-w-md mx-auto">
                      {Array.from({ length: 64 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${
                            Math.random() > 0.3
                              ? "bg-muted hover:bg-primary/20"
                              : "bg-destructive/20 cursor-not-allowed"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-muted rounded"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-primary rounded"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-destructive/20 rounded"></div>
                        <span>Unavailable</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.map((ticket) => 
                  (ticketQuantities[ticket.id] || 0) > 0 && (
                    <div key={ticket.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${ticket.price} × {ticketQuantities[ticket.id] || 0}
                        </p>
                      </div>
                      <span className="font-medium">
                        ${ticket.price * (ticketQuantities[ticket.id] || 0)}
                      </span>
                    </div>
                  )
                )}
                
                {getTotalTickets() > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${getTotalPrice()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Platform Fee (1% + $0.50/ticket)</span>
                        <span>${getPlatformFee()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${getTotal()}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {getTotalTickets() > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Attendee Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter your name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="(555) 123-4567"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  
                  {!showPayment ? (
                    <Button 
                      className="w-full gradient-primary hover-scale" 
                      size="lg"
                      onClick={handleProceedToPayment}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </Button>
                  ) : (
                    <Elements stripe={stripePromise}>
                      <PaymentForm
                        eventId={event.id}
                        tickets={ticketTypes
                          .filter(ticket => (ticketQuantities[ticket.id] || 0) > 0)
                          .map(ticket => ({
                            ticketTypeId: ticket.id,
                            quantity: ticketQuantities[ticket.id] || 0
                          }))
                        }
                        customerInfo={customerInfo}
                        total={getTotal()}
                        onSuccess={handlePaymentSuccess}
                      />
                    </Elements>
                  )}
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