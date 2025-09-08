import { useState, useCallback, useRef } from 'react';
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
  
  // Use ref to track if support check is already running to prevent multiple calls
  const checkingSupportRef = useRef(false);

  // Check WebAuthn support
  const checkSupport = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous support checks
    if (checkingSupportRef.current) {
      console.log('Support check already in progress, returning current state');
      return isSupported ?? false;
    }
    
    // If we already have a result, return it unless explicitly re-checking
    if (isSupported !== null) {
      console.log('Support already checked, returning cached result:', isSupported);
      return isSupported;
    }
    
    checkingSupportRef.current = true;
    try {
      const supported = browserSupportsWebAuthn();
      console.log('Browser supports WebAuthn:', supported);
      setIsSupported(supported);
      
      if (supported) {
        // Add timeout to prevent hanging
        const platformAvailablePromise = platformAuthenticatorIsAvailable();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Platform authenticator check timeout')), 5000)
        );
        
        try {
          const platformAvailable = await Promise.race([platformAvailablePromise, timeoutPromise]);
          console.log('Platform authenticator available:', platformAvailable);
          setIsPlatformAvailable(platformAvailable as boolean);
        } catch (platformError) {
          console.warn('Platform authenticator check failed:', platformError);
          // Default to assuming platform auth is available if check fails
          setIsPlatformAvailable(true);
        }
      } else {
        setIsPlatformAvailable(false);
      }
      
      return supported;
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      setIsSupported(false);
      setIsPlatformAvailable(false);
      return false;
    } finally {
      checkingSupportRef.current = false;
    }
  }, [isSupported]);

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

      // Get registration options from server using direct fetch to bypass caching issues
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yoxsewbpoqxscsutqlcb.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k";
      
      const optionsResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-registration-options?t=${Date.now()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      let options;
      let optionsError;
      
      if (optionsResponse.ok) {
        options = await optionsResponse.json();
      } else {
        optionsError = new Error(`HTTP ${optionsResponse.status}: ${await optionsResponse.text()}`);
      }

      if (optionsError || !options) {
        console.error('Error getting registration options:', optionsError);
        return { success: false, error: 'Failed to prepare passkey registration' };
      }

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options);

      // Verify registration on server using direct fetch
      const verifyResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-registration-verify?t=${Date.now()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            credential: registrationResponse,
            credentialName: credentialName || 'My Passkey'
          })
        }
      );

      let verificationResult;
      let verificationError;
      
      if (verifyResponse.ok) {
        verificationResult = await verifyResponse.json();
      } else {
        verificationError = new Error(`HTTP ${verifyResponse.status}: ${await verifyResponse.text()}`);
      }

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
      // Get authentication options from server using direct fetch to bypass caching issues
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yoxsewbpoqxscsutqlcb.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k";
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-authentication-options?t=${Date.now()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ email })
        }
      );

      let options;
      let optionsError;
      
      if (response.ok) {
        options = await response.json();
      } else {
        optionsError = new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      if (optionsError || !options) {
        console.error('Error getting authentication options:', optionsError);
        
        if (optionsError?.message?.includes('No passkeys found')) {
          return { success: false, error: 'No passkeys found for this account' };
        }
        
        return { success: false, error: 'Failed to prepare passkey authentication' };
      }

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication(options);

      // Verify authentication on server using direct fetch
      const verifyResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/webauthn-authentication-verify?t=${Date.now()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            email,
            credential: authenticationResponse
          })
        }
      );

      let verificationResult;
      let verificationError;
      
      if (verifyResponse.ok) {
        verificationResult = await verifyResponse.json();
      } else {
        verificationError = new Error(`HTTP ${verifyResponse.status}: ${await verifyResponse.text()}`);
      }

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