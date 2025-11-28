import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Info, Coins } from "lucide-react";
import { StripeConnectButton } from "@/components/StripeConnectButton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripeConfigurationProps {
  stripeAccountId: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeTerminalLocationId?: string;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
  currency: string;
  enableBookingFees?: boolean;
  stripeConnectedAccountId?: string;
  organizationId?: string;
  onStripeAccountIdChange: (value: string) => void;
  onStripePublishableKeyChange: (value: string) => void;
  onStripeSecretKeyChange: (value: string) => void;
  onStripeTerminalLocationIdChange?: (value: string) => void;
  onEnableApplePayChange?: (value: boolean) => void;
  onEnableGooglePayChange?: (value: boolean) => void;
  onCurrencyChange: (value: string) => void;
  onEnableBookingFeesChange?: (value: boolean) => void;
  onConnectionChange?: () => void;
}

export const StripeConfiguration = ({
  stripeAccountId,
  stripePublishableKey,
  stripeSecretKey,
  stripeTerminalLocationId = '',
  currency,
  enableBookingFees = false,
  stripeConnectedAccountId,
  organizationId,
  onStripeAccountIdChange,
  onStripePublishableKeyChange,
  onStripeSecretKeyChange,
  onStripeTerminalLocationIdChange,
  onCurrencyChange,
  onEnableBookingFeesChange,
  onConnectionChange
}: StripeConfigurationProps) => {
  const handleBookingFeeToggle = (checked: boolean) => {
    if (checked && !stripeConnectedAccountId) {
      // Don't allow enabling booking fees without Connect setup
      return;
    }
    onEnableBookingFeesChange?.(checked);
  };

  return (
    <div className="space-y-6">
      {/* Manual Stripe API Configuration - Disabled, using Stripe Connect instead
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe API Configuration
            </CardTitle>
            <CardDescription>
              Configure your Stripe API keys and account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
              <Input
                id="stripeAccountId"
                value={stripeAccountId}
                onChange={(e) => onStripeAccountIdChange(e.target.value)}
                placeholder="acct_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
              <Input
                id="stripePublishableKey"
                value={stripePublishableKey}
                onChange={(e) => onStripePublishableKeyChange(e.target.value)}
                placeholder="pk_test_... or pk_live_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
              <Input
                id="stripeSecretKey"
                type="password"
                value={stripeSecretKey}
                onChange={(e) => onStripeSecretKeyChange(e.target.value)}
                placeholder="sk_test_... or sk_live_..."
              />
            </div>
        </CardContent>
      </Card>
      */}

      {/* Terminal and Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Settings
          </CardTitle>
          <CardDescription>
            Configure currency and terminal settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripeCurrency">Transaction Currency</Label>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
                <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                <SelectItem value="HKD">Hong Kong Dollar (HKD)</SelectItem>
                <SelectItem value="CHF">Swiss Franc (CHF)</SelectItem>
                <SelectItem value="SEK">Swedish Krona (SEK)</SelectItem>
                <SelectItem value="NOK">Norwegian Krone (NOK)</SelectItem>
                <SelectItem value="DKK">Danish Krone (DKK)</SelectItem>
                <SelectItem value="PLN">Polish Zloty (PLN)</SelectItem>
                <SelectItem value="CZK">Czech Koruna (CZK)</SelectItem>
                <SelectItem value="HUF">Hungarian Forint (HUF)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripeTerminalLocationId">Stripe Terminal Location ID (Optional)</Label>
            <Input
              id="stripeTerminalLocationId"
              value={stripeTerminalLocationId}
              onChange={(e) => onStripeTerminalLocationIdChange?.(e.target.value)}
              placeholder="tml_..."
            />
            <p className="text-sm text-muted-foreground">
              Required for Tap to Pay on iPhone in the iOS app. Create a location in your{" "}
              <a
                href="https://dashboard.stripe.com/terminal/locations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Stripe Dashboard
              </a>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking Fee Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Booking Fee Configuration
          </CardTitle>
          <CardDescription>
            Configure booking fee pass-through to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modern Switch Toggle */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Coins className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="font-medium">Pass Booking Fees to Customers</div>
                <p className="text-sm text-muted-foreground">
                  Customers pay 1% + $0.50 on top of ticket price
                </p>
              </div>
            </div>
            <Switch
              checked={enableBookingFees}
              onCheckedChange={handleBookingFeeToggle}
              disabled={!stripeConnectedAccountId && !enableBookingFees}
            />
          </div>

          {!stripeConnectedAccountId && !enableBookingFees && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Stripe Connect Required:</strong> You must first connect your Stripe account using OAuth below to enable booking fee pass-through to customers.
              </AlertDescription>
            </Alert>
          )}
          {enableBookingFees && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Connect Required:</strong> To pass booking fees to customers, you must connect your existing Stripe account using OAuth.
                This enables automatic fee splitting where customers pay the platform directly, and funds are transferred to your account minus booking fees.
              </AlertDescription>
            </Alert>
          )}

          {!enableBookingFees && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Without booking fees:</strong> Customers only pay ticket prices directly to your Stripe account.
              </p>
              <p className="text-muted-foreground">
                Platform fees will be invoiced to you separately on a monthly basis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Connect - Always shown, but with different messaging */}
      <StripeConnectButton
        isConnected={!!stripeConnectedAccountId}
        stripeAccountId={stripeConnectedAccountId}
        onConnectionChange={onConnectionChange}
        showBookingFeesRequirement={!enableBookingFees}
        organizationId={organizationId}
      />
    </div>
  );
};