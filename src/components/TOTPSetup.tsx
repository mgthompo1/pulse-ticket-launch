import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface TOTPSetupProps {
  onSetupComplete?: () => void;
}

export const TOTPSetup = ({ onSetupComplete }: TOTPSetupProps) => {
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [factors, setFactors] = useState<Array<{
    id: string;
    status: string;
    factor_type: string;
  }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkTOTPStatus();
  }, []);

  const checkTOTPStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      setFactors(data.totp || []);
      setTotpEnabled(data.totp.some(factor => factor.status === 'verified'));
    } catch (error) {
      console.error('Error checking TOTP status:', error);
    }
  };

  const enrollTOTP = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      setTotpSecret(data.totp.secret);
      setQrCodeUrl(data.totp.uri);
      
      toast({
        title: "TOTP Enrollment Started",
        description: "Scan the QR code with your authenticator app",
      });
    } catch (error: unknown) {
      console.error('Error enrolling TOTP:', error);
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Failed to start TOTP enrollment",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyTOTP = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: factors[0]?.id,
        challengeId: factors[0]?.id,
        code: verificationCode,
      });

      if (error) throw error;

      setTotpEnabled(true);
      toast({
        title: "TOTP Enabled Successfully",
        description: "Two-factor authentication is now active on your account",
      });
      
      onSetupComplete?.();
    } catch (error: unknown) {
      console.error('Error verifying TOTP:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disableTOTP = async () => {
    try {
      const totp = factors.find(factor => factor.status === 'verified');
      if (!totp) return;

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totp.id,
      });

      if (error) throw error;

      setTotpEnabled(false);
      setTotpSecret('');
      setQrCodeUrl('');
      setVerificationCode('');
      
      toast({
        title: "TOTP Disabled",
        description: "Two-factor authentication has been disabled",
      });
      
      await checkTOTPStatus();
    } catch (error: unknown) {
      console.error('Error disabling TOTP:', error);
      toast({
        title: "Disable Failed",
        description: error instanceof Error ? error.message : "Failed to disable TOTP",
        variant: "destructive",
      });
    }
  };

  if (totpEnabled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            TOTP Enabled
          </CardTitle>
          <CardDescription>
            Two-factor authentication is active on your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Protected</span>
            </div>
            <p className="text-sm text-green-700">
              Your account is protected with two-factor authentication
            </p>
          </div>
          
          <Button 
            onClick={disableTOTP}
            variant="destructive"
            className="w-full"
          >
            Disable TOTP
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Setup Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            TOTP adds extra security by requiring a code from your authenticator app
          </AlertDescription>
        </Alert>

        {!totpSecret ? (
          <Button 
            onClick={enrollTOTP}
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Starting Enrollment..." : "Start TOTP Setup"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <h4 className="font-medium">Step 1: Scan QR Code</h4>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="TOTP QR Code" 
                    className="border rounded-lg"
                    width={200}
                    height={200}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Or enter this secret manually:</Label>
                <code className="block p-2 bg-muted rounded text-sm font-mono break-all">
                  {totpSecret}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Step 2: Enter Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-wider"
              />
            </div>

            <Button 
              onClick={verifyTOTP}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full"
            >
              {isVerifying ? "Verifying..." : "Verify & Enable TOTP"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};