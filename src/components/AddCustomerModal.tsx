import React, { useState } from 'react';
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
import { UserPlus, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface AddCustomerModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddCustomerForm: React.FC<AddCustomerModalProps> = ({
  organizationId,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (!formData.email) {
      setError("Email is required");
      return;
    }

    if (saveCard && (!stripe || !elements)) {
      setError("Stripe not initialized");
      return;
    }

    setLoading(true);

    try {
      // Check if contact already exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", formData.email)
        .maybeSingle();

      if (existing) {
        setError("A customer with this email already exists");
        setLoading(false);
        return;
      }

      // Create new contact
      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          organization_id: organizationId,
          email: formData.email,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          full_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          phone: formData.phone || null,
          city: formData.city || null,
          country: formData.country || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Save payment method if card capture is enabled
      if (saveCard && stripe && elements && newContact) {
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
          // Don't fail the whole operation if payment method fails
          toast({
            title: "Customer Added",
            description: `${formData.firstName} ${formData.lastName || formData.email} added, but card save failed: ${pmError.message}`,
            variant: "destructive",
          });
        } else if (paymentMethod) {
          // Save payment method to contact
          const { error: saveError } = await supabase.functions.invoke('save-payment-method', {
            body: {
              contact_id: newContact.id,
              organization_id: organizationId,
              payment_method_id: paymentMethod.id,
            },
          });

          if (saveError) {
            console.error("Error saving payment method:", saveError);
            toast({
              title: "Customer Added",
              description: `${formData.firstName} ${formData.lastName || formData.email} added, but card save failed`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Customer Added with Card",
              description: `${formData.firstName} ${formData.lastName || formData.email} and payment method saved`,
            });
          }
        }
      } else {
        toast({
          title: "Customer Added",
          description: `${formData.firstName} ${formData.lastName || formData.email} has been added to your CRM`,
        });
      }

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        country: "",
        notes: "",
      });
      setSaveCard(false);
      if (elements) {
        elements.getElement(CardElement)?.clear();
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error adding customer:", err);
      setError(err.message || "Failed to add customer");
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

      {/* Save Card Checkbox */}
      <div className="flex items-center space-x-2 border-t pt-4">
        <Checkbox
          id="saveCard"
          checked={saveCard}
          onCheckedChange={(checked) => setSaveCard(checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="saveCard"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Save payment method for future orders
          </label>
          <p className="text-sm text-muted-foreground">
            Store card details securely for phone sales and repeat purchases
          </p>
        </div>
      </div>

      {/* Stripe Card Element */}
      {saveCard && (
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
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const AddCustomerModal: React.FC<AddCustomerModalProps> = (props) => {
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
              <UserPlus className="h-5 w-5" />
              Add New Customer
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
            <UserPlus className="h-5 w-5" />
            Add New Customer
          </DialogTitle>
          <DialogDescription>
            Manually add a new customer to your CRM. They'll be available for phone sales and email campaigns.
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <AddCustomerForm {...props} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};
