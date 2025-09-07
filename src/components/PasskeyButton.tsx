import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePasskeys } from '@/hooks/usePasskeys';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';

interface PasskeyButtonProps {
  email: string;
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const PasskeyButton = ({ 
  email, 
  onSuccess, 
  onError,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false
}: PasskeyButtonProps) => {
  const { 
    isLoading, 
    isSupported, 
    isPlatformAvailable, 
    checkSupport, 
    authenticateWithPasskey 
  } = usePasskeys();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const initializeSupport = async () => {
      setIsChecking(true);
      await checkSupport();
      setIsChecking(false);
    };

    initializeSupport();
  }, [checkSupport]);

  const handlePasskeySignIn = async () => {
    if (!email.trim()) {
      onError?.('Please enter your email address first');
      return;
    }

    const result = await authenticateWithPasskey(email);
    
    if (result.success) {
      onSuccess?.(result.user);
    } else {
      onError?.(result.error || 'Failed to authenticate with passkey');
    }
  };

  // Don't show the button if WebAuthn is not supported
  if (isChecking) {
    return null;
  }

  if (!isSupported) {
    return null;
  }

  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (isPlatformAvailable) {
      return <Fingerprint className="w-4 h-4" />;
    }
    
    return <ShieldCheck className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (isLoading) {
      return 'Authenticating...';
    }
    
    if (isPlatformAvailable) {
      return 'Sign in with biometrics';
    }
    
    return 'Sign in with passkey';
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handlePasskeySignIn}
      disabled={disabled || isLoading || !email.trim()}
      className={`w-full ${className}`}
    >
      {getButtonIcon()}
      <span className="ml-2">{getButtonText()}</span>
    </Button>
  );
};