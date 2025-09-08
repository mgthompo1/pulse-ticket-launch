import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TOTPSetup } from './TOTPSetup';
import { PasskeyManager } from './PasskeyManager';
import { Shield, Key, AlertTriangle, CheckCircle, Clock, Mail, Fingerprint } from 'lucide-react';

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [securityStatus, setSecurityStatus] = useState({
    totpEnabled: false,
    emailVerified: false,
    passwordStrength: 'unknown' as 'unknown' | 'weak' | 'moderate' | 'strong',
    lastSignIn: null as string | null,
    activeSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSecurityStatus();
    }
  }, [user]);

  const checkSecurityStatus = async () => {
    try {
      // Check TOTP status
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const totpEnabled = mfaData?.totp?.some(factor => factor.status === 'verified') || false;

      // Get user metadata
      const { data: userData } = await supabase.auth.getUser();
      const emailVerified = userData.user?.email_confirmed_at != null;
      const lastSignIn = userData.user?.last_sign_in_at || null;

      setSecurityStatus({
        totpEnabled,
        emailVerified,
        passwordStrength: 'unknown', // Would need additional implementation
        lastSignIn,
        activeSessions: 1, // Current session
      });
    } catch (error) {
      console.error('Error checking security status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error: unknown) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Password reset failed",
        variant: "destructive",
      });
    }
  };

  const getSecurityScore = () => {
    let score = 0;
    if (securityStatus.totpEnabled) score += 40;
    if (securityStatus.emailVerified) score += 30;
    if (securityStatus.passwordStrength === 'strong') score += 30;
    return score;
  };

  const securityScore = getSecurityScore();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Score
          </CardTitle>
          <CardDescription>
            Your account security rating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{securityScore}/100</span>
              <Badge variant={securityScore >= 70 ? "default" : securityScore >= 40 ? "secondary" : "destructive"}>
                {securityScore >= 70 ? "Strong" : securityScore >= 40 ? "Moderate" : "Weak"}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  securityScore >= 70 ? "bg-green-500" : 
                  securityScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${securityScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Status</CardTitle>
          <CardDescription>
            Current security settings and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4" />
                <span className="font-medium">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                {securityStatus.totpEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <Badge variant={securityStatus.totpEnabled ? "default" : "secondary"}>
                  {securityStatus.totpEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4" />
                <span className="font-medium">Email Verification</span>
              </div>
              <div className="flex items-center gap-2">
                {securityStatus.emailVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <Badge variant={securityStatus.emailVerified ? "default" : "secondary"}>
                  {securityStatus.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-4 w-4" />
                <span className="font-medium">Passkeys</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <Badge variant="default">
                  Available
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Last Sign In</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {securityStatus.lastSignIn 
                  ? new Date(securityStatus.lastSignIn).toLocaleDateString()
                  : "Unknown"
                }
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Quick Actions</h4>
            <div className="space-y-2">
              <Button 
                onClick={handlePasswordReset}
                variant="outline"
                className="w-full justify-start"
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOTP Setup */}
      {!securityStatus.totpEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recommended: Enable 2FA
            </CardTitle>
            <CardDescription>
              Secure your account with two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TOTPSetup onSetupComplete={checkSecurityStatus} />
          </CardContent>
        </Card>
      )}

      {/* Passkey Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-blue-600" />
            Passkeys
          </CardTitle>
          <CardDescription>
            Sign in securely with passkeys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasskeyManager />
        </CardContent>
      </Card>
    </div>
  );
};