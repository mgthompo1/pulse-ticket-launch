import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePasskeys } from '@/hooks/usePasskeys';
import { PasskeySetup } from './PasskeySetup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Fingerprint, 
  Loader2, 
  Plus,
  Smartphone,
  AlertCircle
} from 'lucide-react';

export const PasskeyManager = () => {
  const { user } = useAuth();
  const { 
    isLoading, 
    isSupported, 
    isPlatformAvailable, 
    checkSupport 
  } = usePasskeys();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [registeredPasskeys, setRegisteredPasskeys] = useState([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(true);

  const loadPasskeys = async () => {
    if (!user) return;
    
    setIsLoadingPasskeys(true);
    try {
      // Use RPC function to get user credentials
      const { data: credentials, error } = await supabase
        .rpc('webauthn_get_user_credentials', { p_user_id: user.id });

      if (error) {
        console.error('Error loading passkeys:', error);
        setRegisteredPasskeys([]);
      } else {
        console.log('Loaded passkeys:', credentials);
        setRegisteredPasskeys(credentials || []);
      }
    } catch (error) {
      console.error('Failed to load passkeys:', error);
      setRegisteredPasskeys([]);
    } finally {
      setIsLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    const initializeSupport = async () => {
      setIsChecking(true);
      await checkSupport();
      setIsChecking(false);
    };

    initializeSupport();
  }, [checkSupport]);

  useEffect(() => {
    if (user && !isChecking) {
      loadPasskeys();
    }
  }, [user, isChecking]);

  const handleSetupSuccess = () => {
    console.log('Passkey registered successfully!');
    // Refresh the passkey list
    loadPasskeys();
  };

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking device compatibility...</span>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your browser doesn't support passkeys. Try using Chrome, Safari, or Edge on a supported device.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isPlatformAvailable ? (
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" />
                Passkey authentication available
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Security key authentication available
              </span>
            )}
          </p>
        </div>
        <Badge variant="secondary">
          {registeredPasskeys.length} passkey{registeredPasskeys.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-2">
        {isLoadingPasskeys ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading passkeys...</span>
          </div>
        ) : registeredPasskeys.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No passkeys registered yet. Create your first passkey to enable secure, passwordless sign-in.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {registeredPasskeys.map((passkey: any) => (
              <div key={passkey.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                  <div className="flex flex-col">
                    <span className="font-medium">{passkey.credential_name || 'My Passkey'}</span>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(passkey.created_at).toLocaleDateString()}
                      {passkey.credential_device_type && ` • ${passkey.credential_device_type}`}
                    </span>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => setIsSetupOpen(true)}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {registeredPasskeys.length === 0 ? 'Create Your First Passkey' : 'Add Another Passkey'}
            </>
          )}
        </Button>
      </div>

      <PasskeySetup 
        isOpen={isSetupOpen} 
        onClose={() => setIsSetupOpen(false)}
        onSuccess={handleSetupSuccess}
      />
    </div>
  );
};