import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingCart, ArrowLeft, Calendar, Globe, Ticket, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
            windcave_endpoint,
            apple_pay_merchant_id,
            currency,
            logo_url
          )
        `)
        .eq("id", eventId)
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

  // Helper function to extract session ID from various sources
  const extractSessionId = (source?: any) => {
    if (source?.sessionId || source?.session_id || source?.id) {
      return source.sessionId || source.session_id || source.id;
    }
    // Fallback to extracting from links
    return windcaveLinks.find(link => link.sessionId)?.sessionId || 
           windcaveLinks[0]?.href?.split('/').pop();
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
            isTest: true,
            // Apple Pay configuration
            applePay: eventData?.organizations?.apple_pay_merchant_id ? {
              merchantId: eventData.organizations.apple_pay_merchant_id,
              countryCode: "NZ",
              currencyCode: "NZD",
              supportedNetworks: ["visa", "mastercard", "amex", "discover"],
              merchantCapabilities: ["supports3DS", "supportsEMV", "supportsCredit", "supportsDebit"]
            } : undefined
          },
          card: {
            supportedCards: ["visa", "mastercard", "amex"],
            sideIcons: ["visa", "mastercard", "amex"]
          },
          // Enhanced callback handling
          onSuccess: async (result: any) => {
            console.log("=== WINDCAVE SUCCESS CALLBACK ===");
            console.log("Success result:", result);
            console.log("Result type:", typeof result);
            
            // Extract session ID from result or fallback to links
            let sessionId = result?.sessionId || result?.session_id || result?.id;
            
            if (!sessionId) {
              // Fallback to extracting from links
              sessionId = windcaveLinks.find(link => link.sessionId)?.sessionId || 
                         windcaveLinks[0]?.href?.split('/').pop();
            }
            
            console.log("Using session ID for verification:", sessionId);
            
            if (!sessionId) {
              console.error("No session ID found for verification");
              toast({
                title: "Payment Error",
                description: "Unable to verify payment. Please contact support.",
                variant: "destructive"
              });
              return;
            }
            
            // Show immediate success feedback
            toast({
              title: "Payment Processing",
              description: "Verifying your payment...",
            });

            // Start verification process
            await verifyPaymentStatus(sessionId);
          },
          onError: (error: any) => {
            console.error("=== WINDCAVE ERROR CALLBACK ===");
            console.error("Error:", error);
            
            let errorMessage = "Payment failed. Please try again.";
            
            if (typeof error === 'string') {
              errorMessage = error;
            } else if (error?.message) {
              errorMessage = error.message;
            } else if (error?.reason) {
              errorMessage = error.reason;
            }
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive"
            });
            
            setShowPaymentForm(false);
          },
          onCancel: () => {
            console.log("=== WINDCAVE CANCEL CALLBACK ===");
            toast({
              title: "Payment Cancelled",
              description: "You can try again when ready.",
            });
            setShowPaymentForm(false);
          },
          // Add polling callback for status updates
          onStatusUpdate: (status: any) => {
            console.log("=== WINDCAVE STATUS UPDATE ===");
            console.log("Status update:", status);
            
            if (status?.state === 'completed' || status?.status === 'approved') {
              // Extract session ID from status or fallback to links
              let sessionId = status?.sessionId || status?.session_id || status?.id;
              
              if (!sessionId) {
                sessionId = windcaveLinks.find(link => link.sessionId)?.sessionId || 
                           windcaveLinks[0]?.href?.split('/').pop();
              }
              
              if (sessionId) {
                verifyPaymentStatus(sessionId);
              }
            }
          }
        };

        console.log("Initializing Windcave Drop-In with options:", dropInOptions);

        const dropIn = window.WindcavePayments.DropIn.create(
          dropInOptions,
          (controller: any) => {
            console.log("=== DROP-IN CREATED ===");
            console.log("Controller:", controller);
            setWindcaveDropIn(controller);
            
            // Set up aggressive polling for payment status
            let pollCount = 0;
            const maxPolls = 60; // Poll for 5 minutes (5 second intervals)
            
            const statusInterval = setInterval(async () => {
              pollCount++;
              console.log(`=== STATUS POLL ${pollCount}/${maxPolls} ===`);
              
              try {
                // Extract session ID for polling
                const sessionId = extractSessionId();
                
                if (!sessionId) {
                  console.warn("No session ID available for polling");
                  return;
                }
                
                // Check with our backend first
                const statusCheck = await verifyPaymentStatus(sessionId, false); // Silent check
                
                if (statusCheck?.success) {
                  console.log("Payment verified through polling!");
                  clearInterval(statusInterval);
                  return;
                }
                
                // If controller has status method, use it
                if (controller && typeof controller.getStatus === 'function') {
                  const dropInStatus = controller.getStatus();
                  console.log("Drop-In status:", dropInStatus);
                  
                  if (dropInStatus === 'completed' || dropInStatus === 'success' || dropInStatus === 'approved') {
                    console.log("Drop-In reports success, verifying...");
                    await verifyPaymentStatus(sessionId);
                    clearInterval(statusInterval);
                    return;
                  }
                }
                
                // Stop polling after max attempts
                if (pollCount >= maxPolls) {
                  console.log("Max polling attempts reached");
                  clearInterval(statusInterval);
                  
                  // Final verification attempt
                  toast({
                    title: "Checking Payment Status",
                    description: "Performing final verification...",
                  });
                  
                  setTimeout(async () => {
                    const finalSessionId = extractSessionId();
                    if (finalSessionId) {
                      await verifyPaymentStatus(finalSessionId);
                    }
                  }, 2000);
                }
                
              } catch (pollError) {
                console.log("Polling error:", pollError);
              }
            }, 5000); // Poll every 5 seconds
            
            // Store interval for cleanup
            (window as any).windcaveStatusInterval = statusInterval;
          },
          (error: any) => {
            console.error("=== DROP-IN CREATION FAILED ===");
            console.error("Error:", error);
            toast({
              title: "Payment System Error",
              description: "Unable to load payment form. Please refresh and try again.",
              variant: "destructive"
            });
            setShowPaymentForm(false);
          }
        );
      } catch (error) {
        console.error("=== DROP-IN INITIALIZATION ERROR ===");
        console.error("Error:", error);
        toast({
          title: "Payment System Error",
          description: "Failed to initialize payment form. Please refresh and try again.",
          variant: "destructive"
        });
        setShowPaymentForm(false);
      }
    } else {
      console.log("WindcavePayments not available yet, retrying...");
      const retryCount = (window as any).windcaveRetryCount || 0;
      if (retryCount < 10) {
        (window as any).windcaveRetryCount = retryCount + 1;
        setTimeout(() => initializeWindcaveDropIn(links, totalAmount), 1000);
      } else {
        console.error("WindcavePayments failed to load after multiple retries");
        toast({
          title: "Payment System Unavailable",
          description: "Unable to load payment system. Please refresh the page.",
          variant: "destructive"
        });
        setShowPaymentForm(false);
      }
    }
  };

  // Separate verification function for reusability
  const verifyPaymentStatus = async (sessionId: string, showToasts: boolean = true) => {
    try {
      console.log("=== VERIFYING PAYMENT STATUS ===");
      console.log("Session ID:", sessionId);
      
      const { data, error } = await supabase.functions.invoke("verify-windcave-payment", {
        body: { 
          sessionId: sessionId,
          eventId,
          customerInfo
        }
      });

      console.log("Verification response:", { data, error });

      if (error) {
        console.error("Payment verification error:", error);
        if (showToasts) {
          toast({
            title: "Payment Verification Failed",
            description: "Please contact support if payment was deducted.",
            variant: "destructive"
          });
        }
        return { success: false, error };
      }

      if (data?.success) {
        console.log("=== PAYMENT VERIFIED SUCCESSFULLY ===");
        
        // Clear any existing polling
        if ((window as any).windcaveStatusInterval) {
          clearInterval((window as any).windcaveStatusInterval);
        }
        
        if (showToasts) {
          toast({
            title: "Payment Successful!",
            description: `Your ${data.ticketCount} ticket(s) have been purchased successfully!`
          });
        }
        
        // Redirect to success page with order details
        setTimeout(() => {
          window.location.href = `/payment-success?orderId=${data.orderId}`;
        }, 1500);
        
        return { success: true, data };
      } else {
        console.log("Payment not yet successful:", data);
        if (showToasts && data?.status) {
          toast({
            title: "Payment Status",
            description: `Payment status: ${data.status}`,
            variant: data.status === 'failed' ? 'destructive' : 'default'
          });
        }
        return { success: false, data };
      }
    } catch (verificationError) {
      console.error("Payment verification error:", verificationError);
      if (showToasts) {
        toast({
          title: "Verification Error",
          description: "Unable to verify payment status. Please contact support.",
          variant: "destructive"
        });
      }
      return { success: false, error: verificationError };
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold mb-4">Event Not Found</h1>
          <p className="text-muted-foreground">The event you're looking for doesn't exist or is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      <div className="container mx-auto px-4 py-8">
        {/* Event Header */}
        <div className="mb-8 animate-fade-in">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  {/* Logo and Event Title */}
                  <div className="flex items-center gap-4 mb-4">
                    {eventData.logo_url && (
                      <img 
                        src={eventData.logo_url} 
                        alt={`${eventData.name} logo`}
                        className="w-16 h-16 object-contain rounded-lg bg-background/50 p-2"
                      />
                    )}
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold">{eventData.name}</h1>
                      <p className="text-muted-foreground text-sm">
                        by {eventData.organizations?.name}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-lg mb-4">{eventData.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(eventData.event_date).toLocaleDateString()}</span>
                    </div>
                    {eventData.venue && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{eventData.venue}</span>
                      </div>
                    )}
                  </div>
                </div>
                {eventData.featured_image_url && (
                  <div className="w-full lg:w-48 h-32 rounded-lg overflow-hidden">
                    <img 
                      src={eventData.featured_image_url} 
                      alt={eventData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Ticket Selection */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Select Your Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No ticket types available for this event.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketTypes.map((ticketType) => (
                      <div key={ticketType.id} className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover-scale">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{ticketType.name}</h3>
                            {ticketType.description && (
                              <p className="text-sm text-muted-foreground mt-1">{ticketType.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-2xl font-bold text-primary">${ticketType.price}</span>
                              <span className="text-sm text-muted-foreground">
                                {ticketType.quantity_available - ticketType.quantity_sold} available
                              </span>
                            </div>
                          </div>
                          <Button 
                            onClick={() => addToCart(ticketType)}
                            className="sm:w-auto w-full"
                            disabled={ticketType.quantity_available - ticketType.quantity_sold <= 0}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information - Only show if cart has items */}
            {cart.length > 0 && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1"
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
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cart Summary */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground mt-1">Add some tickets to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-3 p-3 bg-accent/10 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">${item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">${getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCheckout}
                      className="w-full mt-4"
                      size="lg"
                      disabled={!customerInfo.name || !customerInfo.email}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>
                    
                    {(!customerInfo.name || !customerInfo.email) && (
                      <p className="text-xs text-muted-foreground text-center">
                        Please fill in your information to continue
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Form - Windcave Integration */}
            {showPaymentForm && paymentProvider === "windcave" && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleBackToTickets}
                      className="p-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete your payment securely
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Windcave Drop-In Container */}
                  <div 
                    ref={dropInRef}
                    id="windcave-drop-in"
                    className="border rounded-lg p-4 min-h-[300px] bg-background relative"
                  >
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Loading secure payment form...</p>
                        <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Status Messages */}
                  <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Secure payment powered by Windcave</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your payment information is encrypted and secure. Do not refresh this page during payment.
                    </p>
                    
                    {/* Manual verification button for testing */}
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sessionId = windcaveLinks.find(link => link.sessionId)?.sessionId || 
                                          windcaveLinks[0]?.href?.split('/').pop();
                          if (sessionId) {
                            toast({
                              title: "Manual Verification",
                              description: "Checking payment status...",
                            });
                            await verifyPaymentStatus(sessionId);
                          }
                        }}
                        className="w-full"
                      >
                        Check Payment Status
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Click if payment was completed but not detected
                      </p>
                    </div>
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