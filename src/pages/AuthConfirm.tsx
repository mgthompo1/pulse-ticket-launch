import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!token_hash || !type) {
        setStatus('error');
        setMessage('Invalid verification link. Missing required parameters.');
        return;
      }

      try {
        // Verify the email using Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          console.error('Email verification error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may have expired.');
        } else {
          setStatus('success');
          setMessage('Your email has been verified successfully!');

          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Unexpected error during verification:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-purple-600" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-600" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-600" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message || 'Please wait while we verify your email address...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard Now
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You can try signing up again or contact support if the problem persists.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/auth')} className="flex-1">
                  Back to Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate('/contact')} className="flex-1">
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
