// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePasskeys } from '@/hooks/usePasskeys';
import { 
  Fingerprint, 
  Loader2, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Plus
} from 'lucide-react';

interface PasskeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PasskeySetup = ({ isOpen, onClose, onSuccess }: PasskeySetupProps) => {
  const { 
    isLoading, 
    isSupported, 
    isPlatformAvailable, 
    checkSupport, 
    registerPasskey 
  } = usePasskeys();

  const [credentialName, setCredentialName] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeSupport = async () => {
      if (isOpen) {
        setIsChecking(true);
        await checkSupport();
        setIsChecking(false);
      }
    };

    // Only run when dialog opens, not when checkSupport changes
    initializeSupport();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatePasskey = async () => {
    setError('');
    
    const result = await registerPasskey(credentialName || undefined);
    
    if (result.success) {
      onSuccess?.();
      onClose();
      setCredentialName('');
    } else {
      setError(result.error || 'Failed to create passkey');
    }
  };

  const getDeviceTypeIcon = () => {
    if (isPlatformAvailable) {
      return <Fingerprint className="w-8 h-8 text-blue-600" />;
    }
    return <Shield className="w-8 h-8 text-green-600" />;
  };

  const getDeviceTypeText = () => {
    if (isPlatformAvailable) {
      return 'This device supports passkey authentication (Face ID, Touch ID, or Windows Hello)';
    }
    return 'This device supports security key authentication';
  };

  if (isChecking) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Checking device compatibility...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Passkeys Not Supported
            </DialogTitle>
            <DialogDescription>
              Your current browser or device doesn't support passkeys. 
              Try using a modern browser like Chrome, Safari, or Edge on a supported device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Set Up Your Passkey
          </DialogTitle>
          <DialogDescription>
            Create a passkey to sign in securely without remembering passwords.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Compatibility Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {getDeviceTypeIcon()}
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Device Compatible</h4>
                  <p className="text-sm text-muted-foreground">
                    {getDeviceTypeText()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800">Faster sign-in</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">More secure</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <span className="text-sm text-purple-800">Phishing resistant</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm text-orange-800">No passwords</span>
            </div>
          </div>

          {/* Credential Name Input */}
          <div className="space-y-2">
            <Label htmlFor="credentialName">
              Passkey Name (Optional)
            </Label>
            <Input
              id="credentialName"
              placeholder="e.g., iPhone Touch ID, YubiKey"
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Give your passkey a name to identify it later
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleCreatePasskey}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Passkey
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};