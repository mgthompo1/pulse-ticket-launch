import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  tags: string[] | null;
  organization_id?: string;
  payment_methods?: {
    stripe?: {
      customer_id: string;
      payment_method_id: string;
      last4: string;
      brand: string;
    };
  };
}

interface EditCustomerModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EditCustomerForm: React.FC<EditCustomerModalProps> = ({
  contact,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updateCard, setUpdateCard] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    notes: "",
  });

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.first_name || "",
        lastName: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        city: contact.city || "",
        country: contact.country || "",
        notes: contact.notes || "",
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact) return;

    // Validate required fields
    if (!formData.email) {
      setError("Email is required");
      return;
    }

    if (updateCard && (!stripe || !elements)) {
      setError("Stripe not initialized");
      return;
    }

    setLoading(true);

    try {
      // Update contact
      const { error: updateError } = await supabase
        .from("contacts")
        .update({
          email: formData.email,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          full_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          phone: formData.phone || null,
          city: formData.city || null,
          country: formData.country || null,
          notes: formData.notes || null,
        })
        .eq("id", contact.id);

      if (updateError) throw updateError;

      // Save/update payment method if card update is enabled
      if (updateCard && stripe && elements && contact.organization_id) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Card element not found");
        }

        // Create payment method
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`.trim() || formData.email,
            phone: formData.phone || undefined,
          },
        });

        if (pmError) {
          console.error("Error creating payment method:", pmError);
          toast({
            title: "Customer Updated",
            description: `Customer updated, but card save failed: ${pmError.message}`,
            variant: "destructive",
          });
        } else if (paymentMethod) {
          // Save payment method to contact
          const { error: saveError } = await supabase.functions.invoke('save-payment-method', {
            body: {
              contact_id: contact.id,
              organization_id: contact.organization_id,
              payment_method_id: paymentMethod.id,
            },
          });

          if (saveError) {
            console.error("Error saving payment method:", saveError);
            toast({
              title: "Customer Updated",
              description: "Customer updated, but card save failed",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Customer Updated with Card",
              description: `${formData.firstName} ${formData.lastName || formData.email} and payment method saved`,
            });
          }
        }
      } else {
        toast({
          title: "Customer Updated",
          description: `${formData.firstName} ${formData.lastName || formData.email} has been updated`,
        });
      }

      setUpdateCard(false);
      if (elements) {
        elements.getElement(CardElement)?.clear();
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating customer:", err);
      setError(err.message || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (!contact) return null;

  const hasExistingCard = contact.payment_methods?.stripe?.last4;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+64 21 123 4567"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Auckland"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="New Zealand"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Internal)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional information about this customer..."
          rows={3}
        />
      </div>

      {/* Update Card Checkbox */}
      <div className="flex items-center space-x-2 border-t pt-4">
        <Checkbox
          id="updateCard"
          checked={updateCard}
          onCheckedChange={(checked) => setUpdateCard(checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="updateCard"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {hasExistingCard ? 'Update payment method' : 'Add payment method'}
          </label>
          <p className="text-sm text-muted-foreground">
            {hasExistingCard
              ? `Current card: ${contact.payment_methods?.stripe?.brand} •••• ${contact.payment_methods?.stripe?.last4}`
              : 'Store card details securely for phone sales and repeat purchases'
            }
          </p>
        </div>
      </div>

      {/* Stripe Card Element */}
      {updateCard && (
        <div className="space-y-2">
          <Label>Card Details</Label>
          <div className="border rounded-md p-3">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-xs text-muted-foreground">
            Card will be saved securely with Stripe. No card details are stored on our servers.
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <UserCog className="h-4 w-4 mr-2" />
              Update Customer
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const EditCustomerModal: React.FC<EditCustomerModalProps> = (props) => {
  // Load Stripe - get key from environment
  const stripePromise = React.useMemo(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("VITE_STRIPE_PUBLISHABLE_KEY not configured");
      return null;
    }
    return loadStripe(key);
  }, []);

  if (!stripePromise) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Edit Customer
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Stripe is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your environment.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit Customer
          </DialogTitle>
          <DialogDescription>
            Update customer information for {props.contact?.email}
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <EditCustomerForm {...props} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};
