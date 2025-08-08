import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const XeroCallback = () => {
  
  const [searchParams] = useSearchParams();
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        console.error('Xero authorization error:', error);
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'XERO_AUTH_ERROR',
            error: error
          }, '*');
        }
        window.close();
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state parameter');
        if (window.opener) {
          window.opener.postMessage({
            type: 'XERO_AUTH_ERROR',
            error: 'Missing authorization parameters'
          }, '*');
        }
        window.close();
        return;
      }

      try {
        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'XERO_AUTH_SUCCESS',
            code: code,
            state: state
          }, '*');
        }
        
        // Close the popup window
        window.close();
      } catch (error) {
        console.error('Error handling Xero callback:', error);
        if (window.opener) {
          window.opener.postMessage({
            type: 'XERO_AUTH_ERROR',
            error: 'Failed to complete authorization'
          }, '*');
        }
        window.close();
      }
    };

    handleCallback();
  }, [code, state, error]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Authorization Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {error === 'access_denied' 
                ? 'You denied access to your Xero account.'
                : `Error: ${error}`
              }
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This window will close automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Authorization Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">
            Completing your Xero connection...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This window will close automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default XeroCallback;