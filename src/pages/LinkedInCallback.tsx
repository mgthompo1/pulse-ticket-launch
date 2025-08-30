import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const exchangingRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (exchangingRef.current) return; // prevent duplicate exchanges

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(searchParams.get('error_description') || 'Authorization was denied');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing authorization code or state parameter');
        return;
      }

      // Wait for auth to initialize and user to be available
      if (loading || !user) {
        setStatus('loading');
        return;
      }

      try {
        // Determine the exact redirect_uri used during auth
        let storedRedirect = null as string | null;
        try {
          storedRedirect = localStorage.getItem('linkedin_redirect_uri');
        } catch {}
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const fallbackRedirect = isLocalhost
          ? 'http://localhost:8080/auth/linkedin/callback'
          : 'https://ticketflo.org/dashboard/auth/linkedin/callback';
        
        // Validate stored redirect to avoid cross-environment mismatches
        let redirectUri = fallbackRedirect;
        if (storedRedirect) {
          try {
            const u = new URL(storedRedirect);
            const isStoredLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
            if (isStoredLocal === isLocalhost) {
              redirectUri = storedRedirect;
            }
          } catch {
            // ignore parse errors and use fallback
          }
        }

        console.log('[LinkedInCallback] Exchanging code for token', { code, redirectUri });

        // Start exchange (set guard only now)
        exchangingRef.current = true;

        // Exchange authorization code for access token using Supabase edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('linkedin-token', {
          body: {
            code,
            state, // allow backend to derive redirect from packed state
            // we still pass redirect_uri as a fallback if state not packed
            redirect_uri: redirectUri,
          },
        });

        if (tokenError || !tokenData) {
          throw new Error('Failed to exchange authorization code for access token');
        }

        const profileData = tokenData.profile || {
          localizedFirstName: 'LinkedIn',
          localizedLastName: 'User'
        };

        const connectionData = {
          user_id: user.id,
          platform: 'linkedin',
          account_name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
          account_type: 'personal',
          is_connected: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        };

        const { data: existing } = await supabase
          .from('social_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', 'linkedin')
          .single();

        let dbError;
        if (existing) {
          const { error } = await supabase
            .from('social_connections')
            .update(connectionData)
            .eq('id', existing.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('social_connections')
            .insert(connectionData);
          dbError = error;
        }

        if (dbError) {
          throw dbError;
        }

        setStatus('success');
        toast({ title: 'LinkedIn Connected!', description: 'Your LinkedIn account has been successfully connected.' });
        setTimeout(() => navigate('/dashboard?tab=marketing&subtab=social'), 2000);
      } catch (error) {
        console.error('LinkedIn callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, user, loading, navigate, toast]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Connecting to LinkedIn</CardTitle>
            <CardDescription>
              Please wait while we complete your LinkedIn connection...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Linkedin className="w-4 h-4" />
              Processing authorization...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <CardTitle>Connection Failed</CardTitle>
            <CardDescription>
              We couldn't complete your LinkedIn connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard?tab=marketing&subtab=social')}
                className="flex-1"
              >
                Back to Marketing
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle>LinkedIn Connected!</CardTitle>
          <CardDescription>
            Your LinkedIn account has been successfully connected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                You can now schedule posts and manage your LinkedIn content
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </div>
          <Button 
            onClick={() => navigate('/dashboard?tab=marketing&subtab=social')}
            className="w-full"
          >
            Continue to Marketing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
