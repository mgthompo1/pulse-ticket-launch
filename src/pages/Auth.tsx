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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#ff4d00]" />
          <p className="text-gray-400 font-manrope">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff4d00]/5 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff4d00]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors font-manrope">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>

        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white font-dm-sans">
            Ticket<span className="text-[#ff4d00]">Flo</span>
          </h1>
        </div>

        <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-semibold text-white font-dm-sans">
              {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-gray-400 font-manrope">
              {activeTab === 'signin' ? 'Sign in to manage your events' : 'Start selling tickets in minutes'}
            </CardDescription>
            {invitationValid && (
              <div className="flex items-center justify-center gap-2 mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-manrope">You've been invited to join!</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1">
                <TabsTrigger value="signin" className="data-[state=active]:bg-[#ff4d00] data-[state=active]:text-white text-gray-400 font-manrope font-medium transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-[#ff4d00] data-[state=active]:text-white text-gray-400 font-manrope font-medium transition-all">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="space-y-4">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300 font-manrope">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300 font-manrope">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white font-manrope font-medium transition-all shadow-lg shadow-[#ff4d00]/20"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Sign In
                    </Button>
                    
                    {/* OAuth & Passkey Sign In Options */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-2 text-gray-500 font-manrope">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <OAuthButtons onError={handlePasskeyAuthError} />

                    {isPasskeySupported && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-gray-500 font-manrope">
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
                        className="text-sm text-gray-400 hover:text-[#ff4d00] font-manrope"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-white font-dm-sans">Reset Password</h3>
                      <p className="text-sm text-gray-400 mt-1 font-manrope">
                        Enter your email address and we'll send you a password reset link.
                      </p>
                    </div>

                    {!resetEmailSent ? (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-gray-300 font-manrope">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white font-manrope font-medium transition-all shadow-lg shadow-[#ff4d00]/20"
                          disabled={loading}
                        >
                          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Send Reset Link
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-green-400 font-manrope">
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
                        className="text-sm text-gray-400 hover:text-[#ff4d00] font-manrope"
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
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-transparent px-2 text-gray-500 font-manrope">
                        Or sign up with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300 font-manrope">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300 font-manrope">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                    />
                    {/* Password Strength Indicator */}
                    {password && (
                      <PasswordStrengthIndicator password={password} showRequirements />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-gray-300 font-manrope">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white font-manrope font-medium transition-all shadow-lg shadow-[#ff4d00]/20"
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
                    className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white font-manrope"
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