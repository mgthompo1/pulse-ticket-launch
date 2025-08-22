import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WindcaveHostedFieldsProps {
  sessionData: {
    sessionId: string;
    links: Array<{
      href: string;
      rel: string;
      method: string;
    }>;
    totalAmount: number;
    orderId: string;
  };
  onSuccess: (sessionId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  eventData: any;
}

declare global {
  interface Window {
    windcaveController?: any;
  }
}

export const WindcaveHostedFields: React.FC<WindcaveHostedFieldsProps> = ({
  sessionData,
  onSuccess,
  onError,
  isProcessing,
  eventData
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCardType, setDetectedCardType] = useState<string | null>(null);
  const controllerRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);

  // Load Windcave scripts
  useEffect(() => {
    if (scriptsLoadedRef.current) return;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    const loadScripts = async () => {
      try {
        const environment = eventData?.organizations?.windcave_endpoint === 'UAT' ? 'uat' : 'sec';
        const baseUrl = environment === 'uat' ? 'https://uat.windcave.com' : 'https://sec.windcave.com';
        
        await Promise.all([
          loadScript(`${baseUrl}/js/lib/hosted-fields-v1.js`),
          loadScript(`${baseUrl}/js/windcavepayments-hostedfields-v1.js`)
        ]);

        scriptsLoadedRef.current = true;
        setIsLoading(false);
        // Wait a bit for the DOM to be ready, then initialize
        setTimeout(() => {
          initializeHostedFields();
        }, 100);
      } catch (error) {
        console.error('Failed to load Windcave scripts:', error);
        onError('Failed to load payment system');
        setIsLoading(false);
      }
    };

    loadScripts();
  }, []);

  const waitForDOMElements = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const checkElements = () => {
        const elements = [
          document.getElementById("windcave-card-number"),
          document.getElementById("windcave-expiry"),
          document.getElementById("windcave-cvv"),
          document.getElementById("windcave-postal")
        ];
        
        const allExist = elements.every(el => el !== null);
        
        if (allExist) {
          console.log("All Windcave container elements found!");
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error("Timeout waiting for DOM elements:", {
            'windcave-card-number': !!document.getElementById("windcave-card-number"),
            'windcave-expiry': !!document.getElementById("windcave-expiry"),
            'windcave-cvv': !!document.getElementById("windcave-cvv"),
            'windcave-postal': !!document.getElementById("windcave-postal")
          });
          reject(new Error("DOM elements not found after timeout"));
        } else {
          attempts++;
          setTimeout(checkElements, 100);
        }
      };
      
      checkElements();
    });
  };

  const initializeHostedFields = async () => {
    if (!(window as any).WindcavePayments?.HostedFields) {
      console.error('WindcavePayments.HostedFields not available');
      onError('Payment system not ready');
      return;
    }

    try {
      // Wait for DOM elements to be ready
      await waitForDOMElements();
    } catch (error) {
      console.error('DOM elements not ready:', error);
      onError('Payment form not ready');
      return;
    }

    console.log("Initializing Windcave Hosted Fields...");
    const environment = eventData?.organizations?.windcave_endpoint === 'UAT' ? 'uat' : 'sec';

    const options = {
      env: environment,
      fields: {
        CardNumber: {
          container: "windcave-card-number",
          tabOrder: 1,
          placeholder: "4111 1111 1111 1111",
          supportedCards: ["visa", "masterCard", "amex"],
          cardSchemaImagePlacement: "right",
          // Card validation rules based on type
          validation: {
            enabled: true,
            cardNumberFormat: true
          }
        },
        ExpirationDate: {
          container: "windcave-expiry",
          tabOrder: 2,
          placeholder: "MM/YY"
        },
        CVV: {
          container: "windcave-cvv",
          tabOrder: 3,
          placeholder: "123"
        },
        BillingPostalCode: {
          container: "windcave-postal",
          tabOrder: 4,
          placeholder: "0000"
        }
      },
      // Event callbacks for card type detection
      callbacks: {
        onCardTypeDetected: (cardType: string) => {
          console.log('Card type detected:', cardType);
          setDetectedCardType(cardType);
          updateCardValidation(cardType);
        },
        onFieldChanged: (fieldName: string, fieldData: any) => {
          console.log('Field changed:', fieldName, fieldData);
          // Additional validation logic can be added here
        }
      }
    };

    try {
      controllerRef.current = (window as any).WindcavePayments.HostedFields.create(
        options,
        30,
        () => {
          console.log("Windcave Hosted Fields created successfully");
          setIsReady(true);
          setupCardTypeDetection();
        },
        (error: string) => {
          console.error("Hosted Fields creation failed:", error);
          onError(`Payment setup failed: ${error}`);
        }
      );
    } catch (error) {
      console.error("Error creating hosted fields:", error);
      onError('Failed to initialize payment form');
    }
  };

  // Function to update card validation based on detected card type
  const updateCardValidation = (cardType: string) => {
    const cardTypeInfo = getCardTypeInfo(cardType);
    
    // Update the UI to show card type info
    const cardNumberContainer = document.getElementById("windcave-card-number");
    if (cardNumberContainer) {
      const existingInfo = cardNumberContainer.querySelector('.card-type-info');
      if (existingInfo) {
        existingInfo.remove();
      }
      
      // Add card type indicator
      const cardInfo = document.createElement('div');
      cardInfo.className = 'card-type-info text-xs text-muted-foreground mt-1';
      cardInfo.textContent = `${cardTypeInfo.displayName} - ${cardTypeInfo.length} digits required`;
      cardNumberContainer.parentElement?.appendChild(cardInfo);
    }

    // Update CVV placeholder based on card type
    // Note: Windcave hosted fields handle card type validation internally
    // The actual length validation happens server-side within Windcave
    console.log(`Card type ${cardType} detected - CVV length: ${cardTypeInfo.cvvLength}, Card length: ${cardTypeInfo.length}`);
  };

  // Function to get card type information
  const getCardTypeInfo = (cardType: string) => {
    const cardTypes: Record<string, { displayName: string; length: number; cvvLength: number }> = {
      'visa': { displayName: 'Visa', length: 16, cvvLength: 3 },
      'mastercard': { displayName: 'Mastercard', length: 16, cvvLength: 3 },
      'masterCard': { displayName: 'Mastercard', length: 16, cvvLength: 3 }, // Windcave uses this format
      'amex': { displayName: 'American Express', length: 15, cvvLength: 4 },
      'discover': { displayName: 'Discover', length: 16, cvvLength: 3 },
      'diners': { displayName: 'Diners Club', length: 14, cvvLength: 3 }
    };
    
    return cardTypes[cardType.toLowerCase()] || { displayName: 'Unknown', length: 16, cvvLength: 3 };
  };

  // Setup additional event listeners for card type detection
  const setupCardTypeDetection = () => {
    if (!controllerRef.current) return;

    try {
      // Listen for card type changes if the API supports it
      if (controllerRef.current.on) {
        controllerRef.current.on('cardTypeChanged', (event: any) => {
          console.log('Card type changed event:', event);
          if (event.cardType) {
            setDetectedCardType(event.cardType);
            updateCardValidation(event.cardType);
          }
        });

        controllerRef.current.on('fieldChanged', (event: any) => {
          console.log('Field changed event:', event);
          // Additional field change handling
        });
      }
    } catch (error) {
      console.log('Event listeners not supported by this Windcave version:', error);
    }
  };

  const handleSubmit = async () => {
    if (!controllerRef.current || !sessionData.links) {
      onError('Payment system not ready');
      return;
    }

    // Find the ajaxSubmitCard link
    const submitLink = sessionData.links.find(link => link.rel === 'ajaxSubmitCard');
    if (!submitLink) {
      onError('Payment configuration error');
      return;
    }

    setIsSubmitting(true);

    try {
      // First validate the fields
      controllerRef.current.validateField(null, 
        (validationResult: any) => {
          console.log("Validation result:", validationResult);
          
          // Check if all fields are valid
          const allValid = Object.values(validationResult).every(
            (field: any) => field.isValidationPass
          );

          if (!allValid) {
            toast({
              title: "Validation Error",
              description: "Please check all payment fields are filled correctly",
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }

          // Submit the payment
          controllerRef.current.submit(
            submitLink.href,
            30,
            (status: string) => {
              console.log("Payment status:", status);
              if (status === "done") {
                onSuccess(sessionData.sessionId);
              } else if (status === "3DSecure") {
                toast({
                  title: "3D Secure",
                  description: "Please complete 3D Secure verification",
                });
              }
            },
            (error: any) => {
              console.error("Payment submission error:", error);
              onError(`Payment failed: ${error.message || error}`);
              setIsSubmitting(false);
            }
          );
        },
        (error: any) => {
          console.error("Validation error:", error);
          onError('Payment validation failed');
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error("Submit error:", error);
      onError('Payment submission failed');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading payment form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Single row payment fields */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium mb-1 block">
              Card Number
              {detectedCardType && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({getCardTypeInfo(detectedCardType).displayName})
                </span>
              )}
            </label>
            <div 
              id="windcave-card-number"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all"
            />
          </div>
          
          <div className="w-full sm:w-24">
            <label className="text-sm font-medium mb-1 block">Expiry</label>
            <div 
              id="windcave-expiry"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all"
            />
          </div>
          
          <div className="w-full sm:w-20">
            <label className="text-sm font-medium mb-1 block">
              CVV
              {detectedCardType && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({getCardTypeInfo(detectedCardType).cvvLength} digits)
                </span>
              )}
            </label>
            <div 
              id="windcave-cvv"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all"
            />
          </div>
          
          <div className="w-full sm:w-28">
            <label className="text-sm font-medium mb-1 block">Postal Code</label>
            <div 
              id="windcave-postal"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all"
            />
          </div>
        </div>

        <div className="w-full">
          <Button 
            onClick={handleSubmit}
            disabled={!isReady || isSubmitting || isProcessing}
            className="w-full h-12 text-base font-medium bg-neutral-900 hover:bg-neutral-800 text-white border-0"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              `Pay $${sessionData.totalAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};