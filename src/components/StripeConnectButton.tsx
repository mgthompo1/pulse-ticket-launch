import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Unplug, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface StripeConnectButtonProps {
  isConnected?: boolean;
  stripeAccountId?: string;
  onConnectionChange?: () => void;
  showBookingFeesRequirement?: boolean;
  organizationId?: string;
}

export const StripeConnectButton: React.FC<StripeConnectButtonProps> = ({
  isConnected = false,
  stripeAccountId,
  onConnectionChange,
  showBookingFeesRequirement = false,
  organizationId
}) => {
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const { toast } = useToast();

  // Handle OAuth callback and account creation callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const connected = urlParams.get('connected');
    const refresh = urlParams.get('refresh');

    if (error) {
      toast({
        title: "Connection Failed",
        description: `Stripe connection failed: ${error}`,
        variant: "destructive"
      });
      return;
    }

    // Handle successful account creation and onboarding completion
    if (connected === 'true') {
      toast({
        title: "Success!",
        description: "Your Stripe account has been created and connected successfully.",
      });

      // Clean up URL params
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);

      onConnectionChange?.();
      return;
    }

    // Handle account onboarding refresh (if user needs to complete more info)
    if (refresh === 'true') {
      toast({
        title: "Additional Information Required",
        description: "Please complete your Stripe account setup to continue.",
        variant: "default"
      });

      // Clean up URL params
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    // Handle OAuth flow completion
    if (code && state) {
      completeConnection(code, state);
    }
  }, []);

  const completeConnection = async (code: string, state: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { code, state, action: 'complete_connection' },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your Stripe account has been connected successfully.",
      });

      // Clean up URL params
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);

      onConnectionChange?.();
    } catch (error: any) {
      console.error('Connection completion error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to complete connection",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      if (data?.connect_url) {
        // Redirect to Stripe OAuth
        window.location.href = data.connect_url;
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to initiate connection",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID is required to create a Stripe account",
        variant: "destructive"
      });
      return;
    }

    setCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { organizationId },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe account onboarding
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Create account error:', error);
      toast({
        title: "Account Creation Error",
        description: error.message || "Failed to create Stripe account",
        variant: "destructive"
      });
      setCreatingAccount(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account? This will disable payment processing.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'disconnect' },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Your Stripe account has been disconnected.",
      });

      onConnectionChange?.();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Error", 
        description: error.message || "Failed to disconnect account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          Stripe Account Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="bg-green-100 text-green-800">
                Connected
              </Badge>
              {stripeAccountId && (
                <span className="text-sm text-gray-600">
                  Account: {stripeAccountId}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Your existing Stripe account is connected. Customers will pay directly to your account, 
              and platform fees will be automatically collected.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Unplug className="h-4 w-4" />
                Disconnect Account
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-800">
                Not Connected
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Connect Stripe to enable {showBookingFeesRequirement ? 'booking fee pass-through to customers' : 'payment processing'}.
              Choose one of the options below.
            </p>
            {showBookingFeesRequirement && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-1">Required for Booking Fees:</h4>
                <p className="text-sm text-amber-800">
                  To pass booking fees to customers, you must connect a Stripe account. This enables automatic fee splitting
                  where customers pay once, platform keeps fees, and you get ticket revenue.
                </p>
              </div>
            )}

            {/* Option 1: Create New Stripe Account */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New to Stripe?
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Create a new Stripe account and get set up in minutes. Stripe will guide you through the onboarding process.
              </p>
              <ul className="text-xs text-blue-700 space-y-1 mb-3 ml-4">
                <li>• No existing Stripe account needed</li>
                <li>• Complete onboarding in one flow</li>
                <li>• Automatic connection to TicketFlo</li>
              </ul>
              <Button
                onClick={handleCreateAccount}
                disabled={creatingAccount || loading || !organizationId}
                className="w-full flex items-center gap-2"
                variant="default"
              >
                <UserPlus className="h-4 w-4" />
                {creatingAccount ? 'Creating Account...' : 'Sign Up for Stripe'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Option 2: Connect Existing Account */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Already have a Stripe account?
              </h4>
              <p className="text-sm text-purple-800 mb-3">
                Connect your existing Stripe account using OAuth. No need to share API keys!
              </p>
              <ul className="text-xs text-purple-700 space-y-1 mb-3 ml-4">
                <li>• Secure OAuth connection</li>
                <li>• Login with your Stripe credentials</li>
                <li>• Authorize TicketFlo to process payments</li>
                <li>• Start accepting payments immediately</li>
              </ul>
              <Button
                onClick={handleConnect}
                disabled={loading || creatingAccount}
                className="w-full flex items-center gap-2"
                style={{ backgroundColor: '#635BFF', color: 'white' }}
              >
                <ExternalLink className="h-4 w-4" />
                {loading ? 'Connecting...' : 'Connect Existing Stripe Account'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};