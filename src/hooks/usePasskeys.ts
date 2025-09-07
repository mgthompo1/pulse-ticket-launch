import { useState } from 'react';
import { 
  startRegistration, 
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable
} from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PasskeyRegistrationResult {
  success: boolean;
  error?: string;
}

export interface PasskeyAuthenticationResult {
  success: boolean;
  error?: string;
  user?: any;
}

export const usePasskeys = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check WebAuthn support
  const checkSupport = async () => {
    try {
      const supported = browserSupportsWebAuthn();
      setIsSupported(supported);
      
      if (supported) {
        const platformAvailable = await platformAuthenticatorIsAvailable();
        setIsPlatformAvailable(platformAvailable);
      }
      
      return supported;
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      setIsSupported(false);
      setIsPlatformAvailable(false);
      return false;
    }
  };

  // Register a new passkey
  const registerPasskey = async (credentialName?: string): Promise<PasskeyRegistrationResult> => {
    if (!isSupported) {
      const supported = await checkSupport();
      if (!supported) {
        return { success: false, error: 'WebAuthn is not supported on this device' };
      }
    }

    setIsLoading(true);
    
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: 'You must be signed in to register a passkey' };
      }

      // Get registration options from server
      const { data: options, error: optionsError } = await supabase.functions.invoke(
        'webauthn-registration-options',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (optionsError || !options) {
        console.error('Error getting registration options:', optionsError);
        return { success: false, error: 'Failed to prepare passkey registration' };
      }

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options);

      // Verify registration on server
      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke(
        'webauthn-registration-verify',
        {
          body: {
            credential: registrationResponse,
            credentialName: credentialName || 'My Passkey'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (verificationError || !verificationResult?.verified) {
        console.error('Error verifying registration:', verificationError);
        return { success: false, error: 'Failed to verify passkey registration' };
      }

      toast({
        title: 'Passkey Registered!',
        description: 'Your passkey has been successfully registered. You can now sign in with biometrics.',
      });

      return { success: true };

    } catch (error: any) {
      console.error('Passkey registration error:', error);
      
      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Passkey registration was cancelled or timed out' };
      } else if (error.name === 'NotSupportedError') {
        return { success: false, error: 'This device does not support passkeys' };
      } else if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error during passkey registration' };
      }
      
      return { success: false, error: error.message || 'Failed to register passkey' };
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticate with passkey
  const authenticateWithPasskey = async (email: string): Promise<PasskeyAuthenticationResult> => {
    if (!isSupported) {
      const supported = await checkSupport();
      if (!supported) {
        return { success: false, error: 'WebAuthn is not supported on this device' };
      }
    }

    setIsLoading(true);

    try {
      // Get authentication options from server
      const { data: options, error: optionsError } = await supabase.functions.invoke(
        'webauthn-authentication-options',
        {
          body: { email }
        }
      );

      if (optionsError || !options) {
        console.error('Error getting authentication options:', optionsError);
        
        if (optionsError?.message?.includes('No passkeys found')) {
          return { success: false, error: 'No passkeys found for this account' };
        }
        
        return { success: false, error: 'Failed to prepare passkey authentication' };
      }

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication(options);

      // Verify authentication on server
      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke(
        'webauthn-authentication-verify',
        {
          body: {
            email,
            credential: authenticationResponse
          }
        }
      );

      if (verificationError || !verificationResult?.verified) {
        console.error('Error verifying authentication:', verificationError);
        return { success: false, error: 'Failed to verify passkey authentication' };
      }

      // Set the session from the authentication result
      if (verificationResult.accessToken && verificationResult.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: verificationResult.accessToken,
          refresh_token: verificationResult.refreshToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return { success: false, error: 'Failed to establish session' };
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You\'ve been signed in successfully with your passkey.',
      });

      return { 
        success: true,
        user: verificationResult.user
      };

    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      
      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Passkey authentication was cancelled or timed out' };
      } else if (error.name === 'NotSupportedError') {
        return { success: false, error: 'This device does not support passkeys' };
      } else if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error during passkey authentication' };
      }
      
      return { success: false, error: error.message || 'Failed to authenticate with passkey' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isSupported,
    isPlatformAvailable,
    checkSupport,
    registerPasskey,
    authenticateWithPasskey
  };
};