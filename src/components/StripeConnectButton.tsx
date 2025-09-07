import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Unplug, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectButtonProps {
  isConnected?: boolean;
  stripeAccountId?: string;
  onConnectionChange?: () => void;
}

export const StripeConnectButton: React.FC<StripeConnectButtonProps> = ({
  isConnected = false,
  stripeAccountId,
  onConnectionChange
}) => {
  const [loading, setLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: "Connection Failed",
        description: `Stripe connection failed: ${error}`,
        variant: "destructive"
      });
      return;
    }

    if (code && state) {
      completeConnection(code, state);
    }
  }, []);

  const completeConnection = async (code: string, state: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { code, state },
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

      if (data.connect_url) {
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

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account? This will disable payment processing.')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
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
              Connect your existing Stripe account to enable payment processing. 
              This uses OAuth - no need to share API keys!
            </p>
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click "Connect Stripe Account" below</li>
                <li>• Login to your existing Stripe account</li>
                <li>• Authorize TicketFlo to process payments</li>
                <li>• Start accepting payments immediately</li>
              </ul>
            </div>
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full flex items-center gap-2"
              style={{ backgroundColor: '#635BFF', color: 'white' }}
            >
              <ExternalLink className="h-4 w-4" />
              {loading ? 'Connecting...' : 'Connect Stripe Account'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};