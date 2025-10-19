
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Info } from "lucide-react";
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
      {/* Stripe API Configuration */}
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableBookingFees"
              checked={enableBookingFees}
              onCheckedChange={handleBookingFeeToggle}
              disabled={!stripeConnectedAccountId && !enableBookingFees}
            />
            <Label htmlFor="enableBookingFees" className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${!stripeConnectedAccountId && !enableBookingFees ? 'text-muted-foreground' : ''}`}>
              Pass booking fees to customers
            </Label>
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

          <div className="text-sm text-muted-foreground pl-6">
            <p className="mb-2">
              When enabled, customers will pay a booking fee of <strong>1% + $0.50</strong> on top of the ticket price.
            </p>
            {enableBookingFees ? (
              <>
                <p className="mb-2 text-blue-600">
                  ✅ <strong>With Connect:</strong> Booking fees are automatically split - customers pay once, platform keeps fees, you get ticket revenue.
                </p>
                <p className="text-green-600 font-medium">
                  💡 This creates the cleanest customer experience with automatic fee collection.
                </p>
              </>
            ) : (
              <>
                <p className="mb-2">
                  <strong>Without booking fees:</strong> Customers only pay ticket prices directly to your Stripe account.
                </p>
                <p className="text-gray-600">
                  💡 Platform fees will be invoiced to you separately on a monthly basis.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connect - Always shown, but with different messaging */}
      <StripeConnectButton
        isConnected={!!stripeConnectedAccountId}
        stripeAccountId={stripeConnectedAccountId}
        onConnectionChange={onConnectionChange}
        showBookingFeesRequirement={!enableBookingFees}
      />
    </div>
  );
};