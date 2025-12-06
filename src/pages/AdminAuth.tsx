import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, Lock, Shield, User } from "lucide-react";

const AdminAuth = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [totpCode, setTotpCode] = useState("");
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in using the secure admin session token
  useEffect(() => {
    const checkAuth = async () => {
      const adminToken = sessionStorage.getItem("ticketflo_admin_token");
      if (!adminToken) return;

      try {
        const response = await fetch(`https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/validate-admin-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: adminToken })
        });

        const result = await response.json();
        if (result.valid) {
          navigate("/master-admin");
        } else {
          sessionStorage.removeItem("ticketflo_admin_token");
          sessionStorage.removeItem("ticketflo_admin_user");
        }
      } catch (err) {
        console.error("Session validation error:", err);
        sessionStorage.removeItem("ticketflo_admin_token");
        sessionStorage.removeItem("ticketflo_admin_user");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-auth", {
        body: {
          email: credentials.email,
          password: credentials.password,
          totpCode: totpCode || undefined
        }
      });

      if (fnError) throw fnError;

      if (data.requiresTOTP) {
        setRequiresTOTP(true);
        toast({
          title: "TOTP Required",
          description: "Enter the 6-digit code from your authenticator app.",
        });
        return;
      }

      if (data.success && data.token) {
        sessionStorage.setItem("ticketflo_admin_token", data.token);
        sessionStorage.setItem("ticketflo_admin_user", JSON.stringify(data.admin));
        toast({
          title: "Welcome back!",
          description: "Successfully authenticated to the admin dashboard.",
        });
        navigate("/master-admin");
      } else {
        throw new Error(data?.error || "Authentication failed");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err?.message || "Authentication failed");
      toast({
        title: "Access Denied",
        description: err?.message || "Invalid credentials or TOTP code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-2 border-primary/10 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">
              TicketFlo Master Admin
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your administrator credentials to access the master control panel
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={credentials.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
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
                    placeholder="Enter administrator password"
                    value={credentials.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
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
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="border-2 focus:border-primary transition-colors text-center text-lg tracking-wider"
                      maxLength={6}
                      required
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={
                  loading ||
                  !credentials.email ||
                  !credentials.password ||
                  (requiresTOTP && totpCode.length !== 6)
                }
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
                    Access Master Admin
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  🔒 Secure administrator access only
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  This page is protected with master credentials
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuth;
