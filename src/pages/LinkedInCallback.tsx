import { useEffect, useState } from "react";
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
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
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

      if (!user) {
        setStatus('error');
        setErrorMessage('User not authenticated');
        return;
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('/api/linkedin/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/linkedin/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code for access token');
        }

        const tokenData = await tokenResponse.json();
        
        // Get user profile information
        const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        });

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch LinkedIn profile');
        }

        const profileData = await profileResponse.json();

        // Store the connection in the database
        const { error: dbError } = await supabase
          .from('social_connections')
          .upsert({
            user_id: user.id,
            platform: 'linkedin',
            account_name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
            account_type: 'personal', // Default to personal, can be updated later
            is_connected: true,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
          });

        if (dbError) {
          throw dbError;
        }

        setStatus('success');
        
        toast({
          title: "LinkedIn Connected!",
          description: "Your LinkedIn account has been successfully connected.",
        });

        // Redirect back to marketing tab after a short delay
        setTimeout(() => {
          navigate('/dashboard?tab=marketing&subtab=social');
        }, 2000);

      } catch (error) {
        console.error('LinkedIn callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, toast]);

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
