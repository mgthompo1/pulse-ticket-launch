import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { InvitationAcceptance } from "@/components/InvitationAcceptance";
import { PasskeyButton } from "@/components/PasskeyButton";
import { PasskeySetup } from "@/components/PasskeySetup";
import { usePasskeys } from "@/hooks/usePasskeys";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validateEmail, validatePassword, validatePasswordMatch } from "@/lib/validation";


const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isSupported: isPasskeySupported, checkSupport } = usePasskeys();
  
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  // Removed - now using shared validation utilities from @/lib/validation

  // Tab change handler with state cleanup
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setError(""); // Clear errors when switching tabs
    setPassword(""); // Clear password when switching tabs
    setConfirmPassword(""); // Clear confirm password when switching tabs
    setShowForgotPassword(false); // Reset forgot password state
    setResetEmailSent(false); // Reset reset email state
  }, []);

  // Determine if invitation acceptance should be shown
  const shouldShowInvitationAcceptance = useMemo(() => {
    return inviteToken && invitationValid && !invitationLoading;
  }, [inviteToken, invitationValid, invitationLoading]);

  useEffect(() => {
    // Only redirect if not loading invitation and no valid invitation
    if (!authLoading && user && !inviteToken && !invitationLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate, inviteToken, invitationLoading]);

  useEffect(() => {
    // Check for invitation token
    const checkInvitation = async () => {
      const inviteToken = searchParams.get('invite');
      const inviteEmail = searchParams.get('email');
      
      if (inviteToken && inviteEmail) {
        setInvitationLoading(true);
        try {
          // Validate the invitation token
          const { data: invitation, error } = await supabase
            .from("admin_invitations" as any)
            .select("*")
            .eq("token", inviteToken)
            .eq("email", inviteEmail)
            .eq("status", "pending")
            .gte("expires_at", new Date().toISOString())
            .maybeSingle();

          if (error) {
            setError("Error validating invitation. Please try again.");
          } else if (!invitation) {
            setError("Invalid or expired invitation link. Please contact support.");
          } else {
            setInvitationValid(true);
            setEmail(inviteEmail);
            toast({
              title: "Welcome!",
              description: "You've been invited to join TicketFlo. Please complete your registration.",
            });
          }
        } catch (error) {
          console.error("Error validating invitation:", error);
          setError("Error validating invitation. Please try again.");
        } finally {
          setInvitationLoading(false);
        }
      }
    };

    checkInvitation();
  }, [searchParams, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password match validation
    const matchError = validatePasswordMatch(password, confirmPassword);
    if (matchError) {
      setError(matchError);
      return;
    }

    // Password strength validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0] || "Password does not meet requirements");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Starting sign-up process for:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            // Add any additional user metadata here
            signup_source: invitationValid ? 'invitation' : 'public'
          }
        }
      });

      console.log("Sign-up response:", { data, error });

      if (error) {
        console.error("Sign-up error:", error);
        throw error;
      }

      // Detect if user already exists (Supabase doesn't always return an error for existing users)
      // Check if user was created more than 5 seconds ago, indicating this isn't a new signup
      if (data.user && !data.session) {
        const userCreatedAt = new Date(data.user.created_at).getTime();
        const now = Date.now();
        const timeSinceCreation = now - userCreatedAt;

        // If user was created more than 5 seconds ago, it's an existing user
        if (timeSinceCreation > 5000) {
          console.log("User already exists:", data.user.email);
          setError("This email is already registered. Please sign in instead or use the 'Forgot Password' option if you can't remember your password.");
          setLoading(false);
          return;
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        console.log("Email confirmation required for:", data.user.email);
        
        // If this was an invitation sign-up, mark the invitation as accepted
        const inviteToken = searchParams.get('invite');
        if (inviteToken && invitationValid) {
          try {
            await supabase
              .from("admin_invitations" as any)
              .update({ status: "accepted" })
              .eq("token", inviteToken);
            console.log("Invitation marked as accepted");
          } catch (inviteError) {
            console.error("Error updating invitation status:", inviteError);
          }
        }

        // Redirect to email confirmation page
        navigate(`/auth/check-email?email=${encodeURIComponent(email)}`);
      } else if (data.user && data.user.email_confirmed_at) {
        // User is already confirmed, redirect to dashboard
        toast({
          title: "Welcome!",
          description: "You've been signed in successfully.",
        });
        navigate("/dashboard");
      }

    } catch (error: unknown) {
      console.error("Sign-up process failed:", error);
      setError(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });
      
      // Check if user should set up passkey after successful traditional sign in
      const shouldPromptPasskeySetup = !invitationValid && isPasskeySupported;
      if (shouldPromptPasskeySetup) {
        setShowPasskeySetup(true);
      } else {
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuthSuccess = () => {
    setError("");
    navigate("/dashboard");
  };

  const handlePasskeyAuthError = (error: string) => {
    setError(error);
  };

  const handlePasskeySetupSuccess = () => {
    setShowPasskeySetup(false);
    navigate("/dashboard");
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address first",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verification Email Sent!",
        description: "Please check your email (and spam folder) for the verification link.",
      });
    } catch (error: unknown) {
      console.error("Error resending verification email:", error);
      setError(error instanceof Error ? error.message : "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?resetPassword=true`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Password Reset Email Sent!",
        description: "Check your email for the password reset link.",
      });
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      setError(error instanceof Error ? error.message : "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  // Show invitation acceptance only after validation completes and is valid
  if (shouldShowInvitationAcceptance) {
    return <InvitationAcceptance />;
  }

  if (authLoading || invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>

        <Card className="gradient-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to TicketFlo
            </CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
            {invitationValid && (
              <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">You've been invited to join!</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="space-y-4">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Sign In
                    </Button>
                    
                    {/* OAuth & Passkey Sign In Options */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <OAuthButtons onError={handlePasskeyAuthError} />

                    {isPasskeySupported && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              Or use passkey
                            </span>
                          </div>
                        </div>

                        <PasskeyButton
                          email={email}
                          onSuccess={handlePasskeyAuthSuccess}
                          onError={handlePasskeyAuthError}
                          variant="outline"
                        />
                      </>
                    )}
                    
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium">Reset Password</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter your email address and we'll send you a password reset link.
                      </p>
                    </div>
                    
                    {!resetEmailSent ? (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full gradient-primary" 
                          disabled={loading}
                        >
                          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Send Reset Link
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-green-700">
                          Password reset email sent! Check your inbox (and spam folder) for the reset link.
                        </p>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmailSent(false);
                          setError("");
                        }}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                {/* OAuth Sign Up Options */}
                <div className="space-y-4">
                  <OAuthButtons
                    onError={setError}
                    redirectTo={`${window.location.origin}/dashboard`}
                  />

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or sign up with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {/* Password Strength Indicator */}
                    {password && (
                      <PasswordStrengthIndicator password={password} showRequirements />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                  
                  {/* Resend verification email button */}
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={resendVerificationEmail}
                    disabled={loading || !email}
                    className="w-full"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Resend Verification Email
                  </Button>
                </form>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
        
        {/* Passkey Setup Dialog */}
        <PasskeySetup
          isOpen={showPasskeySetup}
          onClose={() => setShowPasskeySetup(false)}
          onSuccess={handlePasskeySetupSuccess}
        />
      </div>
    </div>
  );
};

export default Auth;