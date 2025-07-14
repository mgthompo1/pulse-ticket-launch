import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Shield } from "lucide-react";

const AdminAuth = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    const isAdminLoggedIn = sessionStorage.getItem("ticket2_admin_auth");
    if (isAdminLoggedIn === "true") {
      navigate("/master-admin");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check hardcoded credentials
    if (credentials.username === "Ticket22025" && credentials.password === "Fujifilm95!") {
      // Set session
      sessionStorage.setItem("ticket2_admin_auth", "true");
      sessionStorage.setItem("ticket2_admin_user", "Ticket22025");
      
      toast({
        title: "Welcome back!",
        description: "Successfully logged in as Ticket2 Administrator",
      });

      // Redirect to master admin page
      navigate("/master-admin");
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid credentials. Please check your username and password.",
        variant: "destructive"
      });
    }

    setLoading(false);
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">
              Ticket2 Master Admin
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your administrator credentials to access the master control panel
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter administrator username"
                    value={credentials.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
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
              </div>

              <Button 
                type="submit" 
                disabled={loading || !credentials.username || !credentials.password}
                className="w-full gradient-primary text-white font-semibold py-3 h-auto"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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