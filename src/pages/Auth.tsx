import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";


const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [invitationValid, setInvitationValid] = useState(false);
  // const [invitationLoading, setInvitationLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has verified their email
        if (user.email_confirmed_at) {
          navigate("/dashboard");
        } else {
          // User exists but email not verified - show message
          setError("Please check your email and click the verification link before signing in.");
        }
      }
    };
    checkUser();

    // Check for invitation token
    const checkInvitation = async () => {
      const inviteToken = searchParams.get('invite');
      const inviteEmail = searchParams.get('email');
      
      if (inviteToken && inviteEmail) {
        // setInvitationLoading(true);
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
          // setInvitationLoading(false);
        }
      }
    };

    checkInvitation();
  }, [navigate, searchParams, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
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

        toast({
          title: "Account Created!",
          description: "Please check your email for verification link. Check your spam folder if you don't see it.",
        });
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
      navigate("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
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
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
            <Tabs defaultValue="signin" className="space-y-4">
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
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
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
      </div>
    </div>
  );
};

export default Auth;