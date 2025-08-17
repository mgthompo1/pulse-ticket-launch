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
        initializeHostedFields();
      } catch (error) {
        console.error('Failed to load Windcave scripts:', error);
        onError('Failed to load payment system');
        setIsLoading(false);
      }
    };

    loadScripts();
  }, []);

  const initializeHostedFields = () => {
    if (!(window as any).WindcavePayments?.HostedFields) {
      console.error('WindcavePayments.HostedFields not available');
      onError('Payment system not ready');
      return;
    }

    const environment = eventData?.organizations?.windcave_endpoint === 'UAT' ? 'uat' : 'sec';

    const options = {
      env: environment,
      fields: {
        CardNumber: {
          container: "windcave-card-number",
          tabOrder: 1,
          placeholder: "4111 1111 1111 1111",
          supportedCards: ["visa", "masterCard", "amex"],
          cardSchemaImagePlacement: "right"
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
      styles: {
        input: {
          color: "hsl(var(--foreground))",
          fontSize: "14px",
          fontFamily: "inherit",
          padding: "8px 12px",
          backgroundColor: "transparent",
          border: "none",
          outline: "none"
        },
        "input-valid": {
          color: "hsl(var(--foreground))"
        },
        "input-invalid": {
          color: "hsl(var(--destructive))"
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
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment fields in a single row for mobile-like layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Number</label>
            <div 
              id="windcave-card-number"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <div 
              id="windcave-expiry"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">CVV</label>
            <div 
              id="windcave-cvv"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Postal Code</label>
            <div 
              id="windcave-postal"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!isReady || isSubmitting || isProcessing}
            className="w-full"
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