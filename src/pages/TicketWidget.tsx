import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ShoppingCart, ArrowLeft, Calendar, Globe, Ticket, CreditCard, MapPin } from "lucide-react";
import { GuestSeatSelector } from "@/components/GuestSeatSelector";
import MerchandiseSelector from "@/components/MerchandiseSelector";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

// Extend the global Window interface to include WindcavePayments
declare global {
  interface Window {
    WindcavePayments?: any;
    windcaveDropIn?: any;
  }
}

const TicketWidget = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<any[]>([]);
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
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [pendingSeatSelection, setPendingSeatSelection] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({});

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

  const addToCart = async (ticketType: any) => {
    // Check if event has seat maps
    const { data: seatMaps } = await supabase
      .from('seat_maps')
      .select('id')
      .eq('event_id', eventId)
      .limit(1);

    if (seatMaps && seatMaps.length > 0) {
      // Event has seating - show seat selector
      setPendingSeatSelection({
        ticketType,
        quantity: 1
      });
      setShowSeatSelection(true);
      return;
    }

    // No seating - add directly to cart
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

  const handleSeatsSelected = (seats: string[]) => {
    if (pendingSeatSelection) {
      const newCartItem = {
        ...pendingSeatSelection.ticketType,
        quantity: pendingSeatSelection.quantity,
        selectedSeats: seats
      };

      setCart(prevCart => [...prevCart, newCartItem]);
      setSelectedSeats(prev => ({
        ...prev,
        [pendingSeatSelection.ticketType.id]: seats
      }));
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  const handleSkipSeatSelection = () => {
    if (pendingSeatSelection) {
      const newCartItem = {
        ...pendingSeatSelection.ticketType,
        quantity: pendingSeatSelection.quantity
      };
      setCart(prevCart => [...prevCart, newCartItem]);
    }
    
    setShowSeatSelection(false);
    setPendingSeatSelection(null);
  };

  const getMerchandiseTotal = () => {
    return merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);
  };

  const getTotalAmount = () => {
    const ticketTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const merchandiseTotal = getMerchandiseTotal();
    return ticketTotal + merchandiseTotal;
  };

  const handleCheckout = async () => {
    if (cart.length === 0 && merchandiseCart.length === 0) {
      toast({
        title: "Error",
        description: "Please add tickets or merchandise to your cart first",
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
      // Prepare items for checkout (both tickets and merchandise)
      const allItems = [
        ...cart.map(item => ({ ...item, type: 'ticket' })),
        ...merchandiseCart.map(item => ({ 
          ...item.merchandise, 
          quantity: item.quantity,
          type: 'merchandise',
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor
        }))
      ];

      if (paymentProvider === "windcave") {
        // Create Windcave session and initialize Drop-In
        const { data, error } = await supabase.functions.invoke("windcave-session", {
          body: { 
            eventId, 
            items: allItems,
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
            items: allItems,
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
        const data = {
          container: "windcave-drop-in",
          links: links,
          totalValue: totalAmount, // Required for Apple Pay and Google Pay
          card: {
            supportedCards: ["visa", "mastercard", "amex"],
            sideIcons: ["visa", "mastercard", "amex"]
          },
          // Mobile Payments configuration for Apple Pay and Google Pay
          mobilePayments: eventData?.organizations?.apple_pay_merchant_id ? {
            merchantName: eventData.organizations.name || "Event Tickets",
            countryCode: "NZ", // Merchant's two-letter ISO 3166 country code
            currencyCode: eventData.organizations.currency?.toUpperCase() || "NZD", // Three-letter ISO 4217 currency code
            buttonStyle: "black", // Options: black, white, white-outline
            buttonType: "buy", // Options: book, buy, checkout, donate, order, pay, plain, subscribe
            buttonLocale: "en-US", // ISO-639-1 language code + ISO-3166-1 region code
            supportedNetworks: ["visa", "masterCard", "amex"], // Note: masterCard not mastercard
            requiredContactDetails: ["billing"], // Options: billing, shipping
            isTest: eventData.organizations.windcave_endpoint !== "SEC", // true for UAT, false for SEC/production
            // Apple Pay specific configuration
            applePay: {
              merchantId: eventData.organizations.apple_pay_merchant_id,
              requiredContactDetails: ["billing"], // Override mobilePayments setting if needed
              // Apple Pay specific onSuccess callback
              onSuccess: async (state: string, finalURL?: string, outcomeNotificationFunction?: (success: boolean) => void) => {
                console.log("=== APPLE PAY SUCCESS CALLBACK ===");
                console.log("Apple Pay state:", state);
                console.log("Final URL:", finalURL);
                console.log("Has outcome notification function:", !!outcomeNotificationFunction);
                
                // Handle 3DSecure stage for Apple Pay
                if (state === "3DSecure") {
                  console.log("Apple Pay 3DSecure authentication in progress...");
                  return;
                }
                
                // Handle completion stage
                if (state === "done") {
                  console.log("Apple Pay transaction completed");
                  
                  try {
                    // Extract session ID from links for completion
                    const sessionId = links[0]?.href?.split('/').pop();
                    
                    if (sessionId && eventData) {
                      toast({
                        title: "Apple Pay Successful!",
                        description: "Finalizing your order...",
                      });
                      
                      // Call the Drop In success function to finalize the order
                      const { data, error } = await supabase.functions.invoke('windcave-dropin-success', {
                        body: { 
                          sessionId: sessionId,
                          eventId: eventData.id
                        }
                      });

                      if (error) {
                        console.error("Apple Pay finalization error:", error);
                        // Notify Apple Pay of failure
                        if (outcomeNotificationFunction) {
                          outcomeNotificationFunction(false);
                        }
                        toast({
                          title: "Order Processing Failed",
                          description: "Apple Pay successful but order processing failed. Please contact support.",
                          variant: "destructive"
                        });
                        return false;
                      }

                      // Notify Apple Pay of success
                      if (outcomeNotificationFunction) {
                        outcomeNotificationFunction(true);
                      }

                      toast({
                        title: "Order Complete!",
                        description: "Your tickets have been confirmed via Apple Pay.",
                      });
                      
                      // Delay redirect to allow Apple Pay to show success
                      setTimeout(() => {
                        window.location.href = '/payment-success';
                      }, 2000);
                      
                      return true;
                    } else {
                      // Notify Apple Pay of failure
                      if (outcomeNotificationFunction) {
                        outcomeNotificationFunction(false);
                      }
                      return false;
                    }
                  } catch (error) {
                    console.error("Apple Pay order finalization error:", error);
                    // Notify Apple Pay of failure
                    if (outcomeNotificationFunction) {
                      outcomeNotificationFunction(false);
                    }
                    toast({
                      title: "Order Processing Failed",
                      description: "Apple Pay successful but order processing failed. Please contact support.",
                      variant: "destructive"
                    });
                    return false;
                  }
                }
                
                return true;
              },
              // Apple Pay specific onError callback
              onError: (error: any) => {
                console.error("=== APPLE PAY ERROR CALLBACK ===");
                console.error("Apple Pay transaction failed:", error);
                
                let errorMessage = "Apple Pay payment failed. Please try again.";
                if (typeof error === 'string') {
                  errorMessage = error;
                } else if (error?.message) {
                  errorMessage = error.message;
                }
                
                toast({
                  title: "Apple Pay Failed",
                  description: errorMessage,
                  variant: "destructive"
                });
                
                setShowPaymentForm(false);
              }
            },
            // Google Pay configuration
            googlePay: {
              environment: eventData.organizations.windcave_endpoint === "SEC" ? "PRODUCTION" : "TEST",
              merchantId: eventData.organizations.name || "Event Tickets",
              merchantName: eventData.organizations.name || "Event Tickets"
            }
          } : undefined,
          // Optional callback triggered when payment starts
          onPaymentStart: (paymentMethod: string, next: () => void, cancel: () => void) => {
            console.log("=== PAYMENT START CALLBACK ===");
            console.log("Payment method selected:", paymentMethod);
            
            // Perform any pre-payment validation or preparation here
            // For now, just proceed with the payment
            next();
          },
          // General onSuccess callback (for non-Apple Pay payments)
          onSuccess: async (status: any, data?: any) => {
            console.log("=== WINDCAVE SUCCESS CALLBACK ===");
            console.log("Success status:", status);
            console.log("Success data:", data);
            
            // Critical: Handle 3DSecure authentication flow
            if (status == "3DSecure") {
              console.log("3DSecure authentication in progress...");
              return;
            }
            
            console.log("Transaction finished");
            
            // Close the drop-in widget
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            
            // Extract session ID from links for completion
            const sessionId = links[0]?.href?.split('/').pop();
            console.log("=== DEBUG INFO ===");
            console.log("Full link:", links[0]?.href);
            console.log("Extracted sessionId:", sessionId);
            console.log("Event ID:", eventData?.id);
            
            if (sessionId && eventData) {
              toast({
                title: "Payment Successful!",
                description: "Finalizing your order...",
              });
              
              try {
                console.log("=== CALLING WINDCAVE DROPIN SUCCESS ===");
                console.log("About to call function with:", {
                  sessionId: sessionId,
                  eventId: eventData.id
                });
                
                // Call the Drop In success function to finalize the order
                const { data, error } = await supabase.functions.invoke('windcave-dropin-success', {
                  body: { 
                    sessionId: sessionId,
                    eventId: eventData.id
                  }
                });

                console.log("=== FUNCTION RESPONSE ===");
                console.log("Data:", data);
                console.log("Error:", error);

                if (error) {
                  console.error("=== WINDCAVE DROPIN SUCCESS ERROR ===");
                  console.error("Full error object:", error);
                  console.error("Error message:", error.message);
                  console.error("Error details:", error.details);
                  throw error;
                }

                console.log("=== WINDCAVE DROPIN SUCCESS DATA ===");
                console.log("Response data:", data);

                toast({
                  title: "Order Complete!",
                  description: `Your tickets have been confirmed. Check your email for details.`,
                });
                
                // Redirect to success page
                setTimeout(() => {
                  window.location.href = '/payment-success';
                }, 1500);
                
              } catch (error) {
                console.error("=== COMPLETE ERROR DETAILS ===");
                console.error("Error finalizing order:", error);
                console.error("Error type:", typeof error);
                console.error("Error constructor:", error?.constructor?.name);
                console.error("Error stack:", error?.stack);
                toast({
                  title: "Payment Processed",
                  description: "Payment successful but there was an issue finalizing your order. Please contact support.",
                  variant: "destructive"
                });
              }
            } else {
              toast({
                title: "Payment Complete",
                description: "Your payment has been processed successfully!",
              });
              
              // Redirect to success page
              setTimeout(() => {
                window.location.href = '/payment-success';
              }, 1500);
            }
          },
          // General onError callback (for non-Apple Pay payments)
          onError: (error: any) => {
            console.error("=== WINDCAVE ERROR CALLBACK ===");
            console.error("Transaction failed:", error);
            
            // Close the drop-in widget
            if (window.windcaveDropIn) {
              window.windcaveDropIn.close();
              window.windcaveDropIn = null;
            }
            
            let errorMessage = "Payment failed. Please try again.";
            if (typeof error === 'string') {
              errorMessage = error;
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive"
            });
            
            setShowPaymentForm(false);
          }
        };

        console.log("Initializing Windcave Drop-In with data:", data);
        
        // Create the drop-in using the simpler approach from the example
        window.windcaveDropIn = window.WindcavePayments.DropIn.create(data);
        
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
      
      // Try the payment status check function
      const { data, error } = await supabase.functions.invoke("windcave-payment-status", {
        body: { 
          eventId,
          txnRef: sessionId,
          orderId: sessionId
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

      if (data?.success && data?.status === 'completed') {
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

            {/* Merchandise Selection */}
            <MerchandiseSelector 
              eventId={eventId!} 
              onCartUpdate={setMerchandiseCart}
            />

            {/* Customer Information - Only show if cart has items */}
            {(cart.length > 0 || merchandiseCart.length > 0) && (
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
                  {(cart.length > 0 || merchandiseCart.length > 0) && (
                    <Badge variant="secondary" className="ml-auto">
                      {cart.reduce((sum, item) => sum + item.quantity, 0) + merchandiseCart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 && merchandiseCart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground mt-1">Add tickets or merchandise to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ticket Cart Items */}
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-3 p-3 bg-accent/10 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">${item.price} each</p>
                          {item.selectedSeats && item.selectedSeats.length > 0 && (
                            <p className="text-xs text-primary flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              Seats selected: {item.selectedSeats.length} seat(s)
                            </p>
                          )}
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

                    {/* Merchandise Cart Items */}
                    {merchandiseCart.map((item, index) => (
                      <div key={`merch-${index}`} className="flex justify-between items-start gap-3 p-3 bg-primary/5 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.merchandise.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${item.merchandise.price} each
                            {item.selectedSize && ` • Size: ${item.selectedSize}`}
                            {item.selectedColor && ` • Color: ${item.selectedColor}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <span className="text-sm font-medium">
                            ${(item.merchandise.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      {cart.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Tickets:</span>
                          <span className="text-sm">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                        </div>
                      )}
                      {merchandiseCart.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Merchandise:</span>
                          <span className="text-sm">${getMerchandiseTotal().toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-primary">${getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCheckout}
                      className="w-full mt-4"
                      size="lg"
                      disabled={!customerInfo.name || !customerInfo.email || (cart.length === 0 && merchandiseCart.length === 0)}
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
        
        {/* Seat Selection Modal */}
        {showSeatSelection && pendingSeatSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <GuestSeatSelector
                eventId={eventId!}
                ticketTypeId={pendingSeatSelection.ticketType.id}
                requestedQuantity={pendingSeatSelection.quantity}
                onSeatsSelected={handleSeatsSelected}
                onSkip={handleSkipSeatSelection}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketWidget;