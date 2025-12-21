import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Crown, User, LogIn, Loader2, Check, Shield, CreditCard,
  Mail, ArrowRight, UserPlus, ShoppingBag, X, Eye, EyeOff
} from 'lucide-react';
import { Theme } from '@/types/theme';

interface SavedPaymentMethod {
  id: string;
  type: 'stripe' | 'windcave';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

interface MembershipInfo {
  id: string;
  tier_name: string;
  tier_color: string;
  status: string;
  benefits?: string[];
  discount_percentage?: number;
}

interface CustomerProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  membership: MembershipInfo | null;
  savedPaymentMethods: SavedPaymentMethod[];
}

type AuthMode = 'choice' | 'signin' | 'signup' | 'guest';

interface CustomerAuthFlowProps {
  organizationId: string;
  membershipEnabled?: boolean;
  onCustomerAuthenticated: (customer: CustomerProfile | null, isGuest: boolean) => void;
  onMemberPricingEnabled: (enabled: boolean, discountPercentage?: number) => void;
  theme: Theme;
}

export const CustomerAuthFlow: React.FC<CustomerAuthFlowProps> = ({
  organizationId,
  membershipEnabled = false,
  onCustomerAuthenticated,
  onMemberPricingEnabled,
  theme,
}) => {
  const [mode, setMode] = useState<AuthMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  // Sign up fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  const lookupCustomer = async (emailToLookup: string): Promise<CustomerProfile | null> => {
    try {
      // Look up customer by email
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, full_name, phone, payment_methods')
        .eq('organization_id', organizationId)
        .eq('email', emailToLookup.toLowerCase().trim())
        .single();

      if (contactError || !contactData) {
        return null;
      }

      // Check for membership
      let membershipInfo: MembershipInfo | null = null;
      if (membershipEnabled) {
        const { data: membershipData } = await supabase
          .from('memberships')
          .select(`
            id,
            status,
            membership_tiers (
              id,
              name,
              color,
              benefits,
              discount_percentage
            )
          `)
          .eq('contact_id', contactData.id)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .single();

        if (membershipData && membershipData.membership_tiers) {
          const tier = membershipData.membership_tiers as any;
          membershipInfo = {
            id: membershipData.id,
            tier_name: tier.name,
            tier_color: tier.color || '#f59e0b',
            status: membershipData.status,
            benefits: tier.benefits || [],
            discount_percentage: tier.discount_percentage
          };
        }
      }

      // Parse saved payment methods
      const savedPaymentMethods: SavedPaymentMethod[] = [];
      const paymentMethods = contactData.payment_methods as any;

      if (paymentMethods?.stripe) {
        savedPaymentMethods.push({
          id: paymentMethods.stripe.payment_method_id,
          type: 'stripe',
          brand: paymentMethods.stripe.brand,
          last4: paymentMethods.stripe.last4,
          exp_month: paymentMethods.stripe.exp_month,
          exp_year: paymentMethods.stripe.exp_year,
        });
      }

      return {
        id: contactData.id,
        email: contactData.email,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        full_name: contactData.full_name,
        phone: contactData.phone,
        membership: membershipInfo,
        savedPaymentMethods,
      };
    } catch (error) {
      console.error('Error looking up customer:', error);
      return null;
    }
  };

  const handleSignIn = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customerProfile = await lookupCustomer(email);

      if (!customerProfile) {
        setError('No account found with this email. Would you like to create one?');
        setLoading(false);
        return;
      }

      // Customer found - set as authenticated
      setCustomer(customerProfile);
      onCustomerAuthenticated(customerProfile, false);

      // Enable member pricing if applicable
      if (customerProfile.membership?.status === 'active') {
        onMemberPricingEnabled(true, customerProfile.membership.discount_percentage);
      }

    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signupEmail || !signupName) {
      setError('Please enter your name and email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if customer already exists
      const existingCustomer = await lookupCustomer(signupEmail);
      if (existingCustomer) {
        setError('An account with this email already exists. Please sign in instead.');
        setLoading(false);
        return;
      }

      // Create new contact
      const nameParts = signupName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;

      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          organization_id: organizationId,
          email: signupEmail.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          full_name: signupName.trim(),
          phone: signupPhone || null,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Create customer profile
      const customerProfile: CustomerProfile = {
        id: newContact.id,
        email: newContact.email,
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        full_name: newContact.full_name,
        phone: newContact.phone,
        membership: null,
        savedPaymentMethods: [],
      };

      setCustomer(customerProfile);
      onCustomerAuthenticated(customerProfile, false);

    } catch (err) {
      console.error('Signup error:', err);
      setError('Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    onCustomerAuthenticated(null, true);
    setMode('guest');
  };

  const handleSignOut = () => {
    setCustomer(null);
    setMode('choice');
    setEmail('');
    setError(null);
    onCustomerAuthenticated(null, false);
    onMemberPricingEnabled(false);
  };

  // If customer is authenticated, show their profile
  if (customer) {
    return (
      <Card style={{
        backgroundColor: theme.cardBackgroundColor,
        border: customer.membership?.status === 'active'
          ? `2px solid ${customer.membership.tier_color}`
          : theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
      }}>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{
                  backgroundColor: customer.membership?.tier_color || theme.primaryColor
                }}
              >
                {customer.membership ? (
                  <Crown className="h-6 w-6" />
                ) : (
                  (customer.full_name || customer.email)?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg" style={{ color: theme.headerTextColor }}>
                    {customer.full_name || customer.email}
                  </span>
                  {customer.membership?.status === 'active' && (
                    <Badge
                      style={{
                        backgroundColor: customer.membership.tier_color + '20',
                        color: customer.membership.tier_color,
                        borderColor: customer.membership.tier_color + '40'
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      {customer.membership.tier_name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                  {customer.email}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </Button>
          </div>

          {/* Member Benefits */}
          {customer.membership?.status === 'active' && (
            <div
              className="mt-4 p-3 rounded-lg"
              style={{
                backgroundColor: customer.membership.tier_color + '10',
                borderLeft: `4px solid ${customer.membership.tier_color}`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" style={{ color: customer.membership.tier_color }} />
                <span className="font-medium text-sm" style={{ color: customer.membership.tier_color }}>
                  Member Benefits Applied
                </span>
              </div>
              {customer.membership.discount_percentage && customer.membership.discount_percentage > 0 && (
                <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                  <Check className="h-3.5 w-3.5 inline mr-1" style={{ color: customer.membership.tier_color }} />
                  {customer.membership.discount_percentage}% discount on tickets
                </p>
              )}
            </div>
          )}

          {/* Saved Payment Methods */}
          {customer.savedPaymentMethods.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.borderColor }}>
              <p className="text-sm font-medium mb-2" style={{ color: theme.headerTextColor }}>
                Saved Payment Methods
              </p>
              <div className="space-y-2">
                {customer.savedPaymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                    style={{ borderColor: theme.borderColor, backgroundColor: theme.inputBackgroundColor }}
                  >
                    <CreditCard className="h-4 w-4" style={{ color: theme.primaryColor }} />
                    <span className="text-sm capitalize" style={{ color: theme.bodyTextColor }}>
                      {method.brand} •••• {method.last4}
                    </span>
                    {method.exp_month && method.exp_year && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Expires {method.exp_month}/{method.exp_year}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Choice screen
  if (mode === 'choice') {
    return (
      <Card style={{
        backgroundColor: theme.cardBackgroundColor,
        border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
      }}>
        <CardHeader className="pb-2">
          <CardTitle style={{ color: theme.headerTextColor }}>
            How would you like to checkout?
          </CardTitle>
          <CardDescription style={{ color: theme.bodyTextColor }}>
            Sign in for faster checkout, saved payment methods, and member benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Sign In Option */}
          <button
            type="button"
            onClick={() => setMode('signin')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
            style={{
              borderColor: theme.primaryColor,
              backgroundColor: theme.primaryColor + '05'
            }}
          >
            <div
              className="p-3 rounded-full"
              style={{ backgroundColor: theme.primaryColor + '15' }}
            >
              <LogIn className="h-5 w-5" style={{ color: theme.primaryColor }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: theme.headerTextColor }}>
                Sign In
              </p>
              <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                Access saved details, payment methods & member pricing
              </p>
            </div>
            <ArrowRight className="h-5 w-5" style={{ color: theme.primaryColor }} />
          </button>

          {/* Create Account Option */}
          <button
            type="button"
            onClick={() => setMode('signup')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:border-gray-300"
            style={{ borderColor: theme.borderColor }}
          >
            <div className="p-3 rounded-full bg-muted">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: theme.headerTextColor }}>
                Create Account
              </p>
              <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                Save your details for faster future checkouts
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Guest Checkout Option */}
          <button
            type="button"
            onClick={handleGuestCheckout}
            className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:border-gray-300"
            style={{ borderColor: theme.borderColor }}
          >
            <div className="p-3 rounded-full bg-muted">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: theme.headerTextColor }}>
                Guest Checkout
              </p>
              <p className="text-sm" style={{ color: theme.bodyTextColor }}>
                Continue without creating an account
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Member benefits hint */}
          {membershipEnabled && (
            <div className="flex items-center gap-2 pt-2 px-1">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm" style={{ color: theme.bodyTextColor }}>
                Members get exclusive discounts and benefits
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Sign In screen
  if (mode === 'signin') {
    return (
      <Card style={{
        backgroundColor: theme.cardBackgroundColor,
        border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
      }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle style={{ color: theme.headerTextColor }}>
              Sign In
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setMode('choice'); setError(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription style={{ color: theme.bodyTextColor }}>
            Enter your email to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email" style={{ color: theme.bodyTextColor }}>
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSignIn();
                  }
                }}
                className="pl-10"
                style={{
                  backgroundColor: theme.inputBackgroundColor,
                  border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
                }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
              {error.includes('create one') && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => { setMode('signup'); setSignupEmail(email); setError(null); }}
                  className="ml-1 p-0 h-auto text-destructive underline"
                >
                  Create account
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setMode('choice'); setError(null); }}
              className="flex-1"
              style={{ borderColor: theme.borderColor }}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSignIn}
              disabled={loading || !email}
              className="flex-1"
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.buttonTextColor
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleGuestCheckout}
              style={{ color: theme.bodyTextColor }}
            >
              Continue as guest instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sign Up screen
  if (mode === 'signup') {
    return (
      <Card style={{
        backgroundColor: theme.cardBackgroundColor,
        border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
      }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle style={{ color: theme.headerTextColor }}>
              Create Account
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setMode('choice'); setError(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription style={{ color: theme.bodyTextColor }}>
            Save your details for faster future checkouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name" style={{ color: theme.bodyTextColor }}>
              Full Name *
            </Label>
            <Input
              id="signup-name"
              type="text"
              placeholder="John Smith"
              value={signupName}
              onChange={(e) => { setSignupName(e.target.value); setError(null); }}
              style={{
                backgroundColor: theme.inputBackgroundColor,
                border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" style={{ color: theme.bodyTextColor }}>
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                className="pl-10"
                style={{
                  backgroundColor: theme.inputBackgroundColor,
                  border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-phone" style={{ color: theme.bodyTextColor }}>
              Phone Number (optional)
            </Label>
            <Input
              id="signup-phone"
              type="tel"
              placeholder="+64 21 123 4567"
              value={signupPhone}
              onChange={(e) => setSignupPhone(e.target.value)}
              style={{
                backgroundColor: theme.inputBackgroundColor,
                border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
              }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
              {error.includes('sign in') && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => { setMode('signin'); setEmail(signupEmail); setError(null); }}
                  className="ml-1 p-0 h-auto text-destructive underline"
                >
                  Sign in
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setMode('choice'); setError(null); }}
              className="flex-1"
              style={{ borderColor: theme.borderColor }}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSignUp}
              disabled={loading || !signupEmail || !signupName}
              className="flex-1"
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.buttonTextColor
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleGuestCheckout}
              style={{ color: theme.bodyTextColor }}
            >
              Continue as guest instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Guest mode - just show a minimal indicator
  if (mode === 'guest') {
    return (
      <Card style={{
        backgroundColor: theme.cardBackgroundColor,
        border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined
      }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: theme.headerTextColor }}>
                  Checking out as guest
                </p>
                <p className="text-xs" style={{ color: theme.bodyTextColor }}>
                  Your details won't be saved for future purchases
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setMode('choice')}
              style={{ color: theme.primaryColor }}
            >
              Sign in instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
