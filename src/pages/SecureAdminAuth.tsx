import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Shield, Lock, AlertTriangle } from "lucide-react";

const SecureAdminAuth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      const adminToken = sessionStorage.getItem("admin_secure_token");
      if (adminToken) {
        try {
          const tokenData = JSON.parse(atob(adminToken));
          if (tokenData.expiresAt > Date.now()) {
            navigate("/master-admin");
          } else {
            sessionStorage.removeItem("admin_secure_token");
          }
        } catch (error) {
          sessionStorage.removeItem("admin_secure_token");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { 
          email, 
          password,
          totpCode: totpCode || undefined 
        }
      });

      if (error) throw error;

      if (data.requiresTOTP) {
        setRequiresTOTP(true);
        toast({
          title: "TOTP Required",
          description: "Please enter your authenticator code",
        });
        return;
      }

      if (data.success && data.token) {
        sessionStorage.setItem("admin_secure_token", data.token);
        toast({
          title: "Authentication Successful",
          description: "Welcome to the secure admin panel",
        });
        navigate("/master-admin");
      } else {
        throw new Error(data.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="border-2 border-primary/10 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">
              Secure Admin Access
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enhanced security authentication required
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>

                {requiresTOTP && (
                  <div className="space-y-2">
                    <Label htmlFor="totpCode" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Authenticator Code
                    </Label>
                    <Input
                      id="totpCode"
                      type="text"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="border-2 focus:border-primary transition-colors text-center text-lg tracking-wider"
                      maxLength={6}
                      required
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading || !email || !password || (requiresTOTP && totpCode.length !== 6)}
                className="w-full gradient-primary text-white font-semibold py-3 h-auto"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Secure Login
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  🔒 Multi-factor authentication required
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  This system uses enhanced security protocols
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecureAdminAuth;