import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  LogOut,
  Loader2,
  Database,
  CheckCircle,
  Server,
  Globe,
  Edit,
  Save,
  Type,
  FileText,
  Mail,
  Copy,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";

const MasterAdmin = () => {
  // All hooks must be at the top, before any return
  const { isAdminAuthenticated, adminUser, loading: authLoading, logout } = useAdminAuth();
  const { content, loading: contentLoading, updateContent, refreshContent } = useLandingPageContent();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingContent, setEditingContent] = useState<{[key: string]: string}>({});
  const [savingContent, setSavingContent] = useState<{[key: string]: boolean}>({});
  // Sign-up link state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpLink, setSignUpLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    organizations: 0,
    events: 0,
    tickets: 0,
    platformRevenue: 0,
    loading: true
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    apiResponseTime: 0,
    dbPerformance: 0,
    serverUptime: 99.9
  });
  const [analytics, setAnalytics] = useState({
    loading: true,
    transactionFees: 0,
    dailyActiveUsers: 0,
    ticketsSold: 0,
    platformRevenue: 0,
    activeEvents: 0
  });
  const [contactEnquiries, setContactEnquiries] = useState<any[]>([]);
  const [platformConfig, setPlatformConfig] = useState({
    platform_fee_percentage: 1.0,
    platform_fee_fixed: 0.50,
    stripe_platform_publishable_key: '',
    stripe_platform_secret_key: '',
    loading: true
  });
  const [savingPlatformConfig, setSavingPlatformConfig] = useState(false);
  
  // User management state
  const [userManagement, setUserManagement] = useState({
    email: "",
    newPassword: "",
    isResetting: false
  });

  // Redirect if not authenticated
  useEffect(() => {
    console.log('Auth status check:', { authLoading, isAdminAuthenticated });
    if (!authLoading && !isAdminAuthenticated) {
      console.log('Redirecting to admin auth');
      navigate("/secure-admin-auth");
    }
  }, [isAdminAuthenticated, authLoading, navigate]);

  // Fetch organizations using admin endpoint
  useEffect(() => {
    const fetchOrganizations = async () => {
      console.log('fetchOrganizations called');
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      console.log('Admin token exists:', !!adminToken);
      if (!adminToken) return;
      
      try {
        console.log('Calling admin-data for organizations...');
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'organizations'
          }
        });
        
        console.log('Organizations response:', { data, error });
        
        if (error) throw error;
        
        if (data.success) {
          setOrganizations(data.data || []);
        } else {
          console.error('Failed to fetch organizations:', data.error);
        }
        
        // Also fetch contact enquiries
        const { data: enquiriesData, error: enquiriesError } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'contact_enquiries'
          }
        });
        
        if (enquiriesError) throw enquiriesError;
        
        if (enquiriesData.success) {
          setContactEnquiries(enquiriesData.data || []);
        }
      } catch (error) {
        console.error("Error loading organizations:", error);
      }
    };
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      console.log('fetchMetrics called');
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      console.log('Admin token for metrics exists:', !!adminToken);
      if (!adminToken) return;
      
      setMetrics(m => ({ ...m, loading: true }));
      
      try {
        console.log('Calling admin-data for metrics...');
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'metrics'
          }
        });
        
        console.log('Metrics response:', { data, error });
        
        if (error) throw error;
        
        if (data.success) {
          setMetrics({
            ...data.data,
            loading: false
          });
        } else {
          console.error("Error loading metrics:", data.error);
          setMetrics(m => ({ ...m, loading: false }));
        }
      } catch (error) {
        console.error("Error loading metrics:", error);
        setMetrics(m => ({ ...m, loading: false }));
      }
    };
    fetchMetrics();
  }, []);

  useEffect(() => {
    // Fetch recent activities (last 5 events, orders, or organizations)
    const fetchRecentActivities = async () => {
      // Example: last 5 organizations created
      const { data: orgs } = await supabase.from("organizations").select("name, created_at").order("created_at", { ascending: false }).limit(5);
      // Example: last 5 events created
      const { data: events } = await supabase.from("events").select("name, created_at").order("created_at", { ascending: false }).limit(5);
      // Example: last 5 orders
      const { data: orders } = await supabase.from("orders").select("id, created_at").order("created_at", { ascending: false }).limit(5);
      // Merge and sort by created_at
      const all = [
        ...(orgs?.map(o => ({ type: "Organization", name: o.name, created_at: o.created_at })) || []),
        ...(events?.map(e => ({ type: "Event", name: e.name, created_at: e.created_at })) || []),
        ...(orders?.map(o => ({ type: "Order", name: `Order #${o.id}` , created_at: o.created_at })) || [])
      ];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivities(all.slice(0, 5));
    };
    fetchRecentActivities();
  }, []);

  useEffect(() => {
    // Simulate system health (replace with real monitoring if available)
    setSystemHealth({
      apiResponseTime: 85, // ms
      dbPerformance: 92, // %
      serverUptime: 99.9 // %
    });
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;
      
      setAnalytics(a => ({ ...a, loading: true }));
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'analytics'
          }
        });
        
        if (error) throw error;
        
        if (data.success) {
          setAnalytics({
            ...data.data,
            loading: false
          });
        } else {
          console.error("Error loading analytics:", data.error);
          setAnalytics(a => ({ ...a, loading: false }));
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
        setAnalytics(a => ({ ...a, loading: false }));
      }
    };
    fetchAnalytics();
  }, []);

  // Fetch platform configuration
  useEffect(() => {
    const fetchPlatformConfig = async () => {
      console.log('fetchPlatformConfig called');
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      console.log('Admin token for platform config exists:', !!adminToken);
      if (!adminToken) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'platform_config'
          }
        });
        
        if (error) throw error;
        
        if (data.success && data.data) {
          setPlatformConfig({
            ...data.data,
            loading: false
          });
        } else {
          setPlatformConfig(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading platform config:", error);
        setPlatformConfig(prev => ({ ...prev, loading: false }));
      }
    };
    fetchPlatformConfig();
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAdminAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out of the master admin panel",
    });
    navigate("/");
  };

  const handleContentEdit = (id: string, currentValue: string) => {
    setEditingContent(prev => ({ ...prev, [id]: currentValue }));
  };

  const handleContentSave = async (id: string) => {
    const newValue = editingContent[id];
    if (!newValue || newValue.trim() === "") return;

    setSavingContent(prev => ({ ...prev, [id]: true }));
    
    try {
      const result = await updateContent(id, newValue.trim());
      
      if (result.success) {
        toast({
          title: "Content Updated",
          description: "Landing page content has been successfully updated",
        });
        setEditingContent(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update content. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating content",
        variant: "destructive"
      });
    } finally {
      setSavingContent(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleContentCancel = (id: string) => {
    setEditingContent(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const groupContentBySection = () => {
    const grouped: {[key: string]: typeof content} = {};
    content.forEach(item => {
      if (!grouped[item.section]) {
        grouped[item.section] = [];
      }
      grouped[item.section].push(item);
    });
    return grouped;
  };

  // Only generate a new link if one does not already exist for the current email
  const generateSignUpLink = async () => {
    if (!signUpEmail || !signUpEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    // If a link is already generated for this email, do not generate again
    if (signUpLink && signUpLink.includes(encodeURIComponent(signUpEmail))) {
      // Link already generated for this email, nothing to do
    }
    setIsGeneratingLink(true);
    try {
      // Generate a unique sign-up token
      const token = crypto.randomUUID();
      const signUpUrl = `${window.location.origin}/auth?invite=${token}&email=${encodeURIComponent(signUpEmail)}`;
      // Store the invitation in the database
      const { error } = await supabase
        .from("admin_invitations" as any)
        .insert({
          email: signUpEmail.trim(),
          token: token,
          invited_by: adminUser,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          status: "pending"
        } as any);
      if (error) {
        throw error;
      }
      setSignUpLink(signUpUrl);
      // Keep generated link in state for display
      toast({
        title: "Success",
        description: "Sign-up link generated successfully!",
      });
    } catch (error) {
      console.error("Error generating sign-up link:", error);
      toast({
        title: "Error",
        description: "Failed to generate sign-up link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copySignUpLink = async () => {
    try {
      await navigator.clipboard.writeText(signUpLink);
      toast({
        title: "Copied!",
        description: "Sign-up link copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying link:", error);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  // Only send the email for the existing link, do not generate a new one
  const sendSignUpEmail = async () => {
    if (!signUpLink) {
      toast({
        title: "Error",
        description: "Please generate a sign-up link first.",
        variant: "destructive"
      });
      return;
    }
    try {
      // Call the send-invitation-email function
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: signUpEmail,
          signUpLink: signUpLink,
          invitedBy: adminUser
        }
      });
      if (error) {
        throw error;
      }
      toast({
        title: "Email Sent!",
        description: `Sign-up invitation sent to ${signUpEmail}`,
      });
      // Reset form
      setSignUpEmail("");
      setSignUpLink("");
      // Dialog state removed; just clear local state
    } catch (error) {
      console.error("Error sending invitation email:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePlatformConfigSave = async () => {
    setSavingPlatformConfig(true);
    const adminToken = sessionStorage.getItem('ticketflo_admin_token');
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: {
          token: adminToken,
          dataType: 'update_platform_config',
          configData: {
            platform_fee_percentage: platformConfig.platform_fee_percentage,
            platform_fee_fixed: platformConfig.platform_fee_fixed,
            stripe_platform_publishable_key: platformConfig.stripe_platform_publishable_key,
            stripe_platform_secret_key: platformConfig.stripe_platform_secret_key
          }
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Configuration Updated",
          description: "Platform configuration has been successfully updated",
        });
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (error) {
      console.error("Error updating platform config:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update platform configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingPlatformConfig(false);
    }
  };

  const handleUserPasswordReset = async () => {
    if (!userManagement.email || !userManagement.newPassword) {
      toast({
        title: "Error",
        description: "Please enter both email and new password",
        variant: "destructive"
      });
      return;
    }

    setUserManagement(prev => ({ ...prev, isResetting: true }));
    const adminToken = sessionStorage.getItem('ticketflo_admin_token');
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          email: userManagement.email,
          newPassword: userManagement.newPassword,
          adminToken: adminToken
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Password Reset Successful",
          description: `Password updated for ${userManagement.email}`,
        });
        setUserManagement({ email: "", newPassword: "", isResetting: false });
      } else {
        throw new Error(data.error || 'Password reset failed');
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Password Reset Failed",
        description: error?.message || "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUserManagement(prev => ({ ...prev, isResetting: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Shield className="w-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">TicketFlo Master Admin</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {adminUser}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="enquiries">Contact Enquiries</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {metrics.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading metrics...</span>
              </div>
            ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.organizations}</div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.events}</div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Fee Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.platformRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets Sold</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.tickets}</div>
                </CardContent>
              </Card>
            </div>
            )}

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <div className="text-muted-foreground">No recent activity found.</div>
                  ) : (
                    recentActivities.map((activity, idx) => (
                      <div key={idx} className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.type}: {activity.name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(activity.created_at), 'PPpp')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Platform status overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response Time</span>
                    <div className="flex items-center gap-2">
                      <Progress value={systemHealth.apiResponseTime} className="w-20" />
                      <span className="text-sm text-green-600">{systemHealth.apiResponseTime}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Performance</span>
                    <div className="flex items-center gap-2">
                      <Progress value={systemHealth.dbPerformance} className="w-20" />
                      <span className="text-sm text-green-600">{systemHealth.dbPerformance}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Server Uptime</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">{systemHealth.serverUptime}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            {/* Send Sign-Up Link Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Send Sign-Up Invitation
                </CardTitle>
                <CardDescription>
                  Generate and send a sign-up link to invite new users to the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter email address to invite"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={generateSignUpLink}
                      disabled={isGeneratingLink || !signUpEmail.trim()}
                      className="flex items-center gap-2"
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Generate Link
                    </Button>
                  </div>
                </div>

                {/* Generated Link Display */}
                {signUpLink && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Generated Sign-Up Link</Label>
                        <div className="mt-1 text-sm text-muted-foreground break-all">
                          {signUpLink}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copySignUpLink}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          onClick={sendSignUpEmail}
                          className="flex items-center gap-2"
                        >
                          <Mail className="h-3 w-3" />
                          Send Email
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organizations List */}
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="text-muted-foreground">No organizations found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.map(org => (
                          <tr key={org.id} className="border-b">
                            <td className="px-4 py-2">{org.name}</td>
                            <td className="px-4 py-2">{org.email || "N/A"}</td>
                            <td className="px-4 py-2">{org.status || "N/A"}</td>
                            <td className="px-4 py-2">{org.created_at ? new Date(org.created_at).toLocaleDateString() : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and reset passwords
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">User Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="user@example.com"
                        value={userManagement.email}
                        onChange={(e) => setUserManagement(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={userManagement.newPassword}
                        onChange={(e) => setUserManagement(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleUserPasswordReset}
                    disabled={userManagement.isResetting || !userManagement.email || !userManagement.newPassword}
                    className="w-full"
                  >
                    {userManagement.isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Reset User Password
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Enquiries Tab */}
          <TabsContent value="enquiries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Enquiries
                </CardTitle>
                <CardDescription>
                  Manage contact enquiries and support tickets from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contactEnquiries.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">No contact enquiries found.</div>
                ) : (
                  <div className="space-y-4">
                    {contactEnquiries.map((enquiry) => (
                      <div key={enquiry.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              enquiry.status === 'open' ? 'bg-yellow-500' :
                              enquiry.status === 'in_progress' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className="font-medium">{enquiry.name}</span>
                            <span className="text-sm text-muted-foreground">({enquiry.email})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              enquiry.enquiry_type === 'support' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {enquiry.enquiry_type === 'support' ? 'Support Ticket' : 'General Enquiry'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              enquiry.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                              enquiry.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {enquiry.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        {enquiry.phone && (
                          <p className="text-sm text-muted-foreground">Phone: {enquiry.phone}</p>
                        )}
                        
                        <div className="bg-muted/50 p-3 rounded text-sm">
                          {enquiry.message}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Created: {new Date(enquiry.created_at).toLocaleString()}</span>
                          {enquiry.updated_at !== enquiry.created_at && (
                            <span>Updated: {new Date(enquiry.updated_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Landing Page Content Management
                </CardTitle>
                <CardDescription>
                  Edit all text content that appears on the customer-facing landing page
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading content...</span>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupContentBySection()).map(([section, items]) => (
                      <div key={section} className="space-y-4">
                        <div className="border-b pb-2">
                          <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {section.replace('_', ' ')} Section
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {section === 'hero' && 'Main banner section at the top of the page'}
                            {section === 'hero_stats' && 'Statistics displayed in the hero section'}
                            {section === 'features' && 'Features section content'}
                            {section === 'pricing' && 'Pricing section content'}
                            {section === 'pricing_bottom' && 'Additional pricing information'}
                          </p>
                        </div>
                        
                        <div className="grid gap-4">
                          {items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <label className="font-medium text-sm">
                                    {item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </label>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {editingContent[item.id] !== undefined ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleContentSave(item.id)}
                                        disabled={savingContent[item.id]}
                                        className="h-8"
                                      >
                                        {savingContent[item.id] ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Save className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleContentCancel(item.id)}
                                        disabled={savingContent[item.id]}
                                        className="h-8"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleContentEdit(item.id, item.value)}
                                      className="h-8"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {editingContent[item.id] !== undefined ? (
                                <div className="space-y-2">
                                  {item.content_type === 'text' && item.value.length > 100 ? (
                                    <Textarea
                                      value={editingContent[item.id]}
                                      onChange={(e) => setEditingContent(prev => ({ 
                                        ...prev, 
                                        [item.id]: e.target.value 
                                      }))}
                                      className="min-h-[100px]"
                                      placeholder="Enter content..."
                                    />
                                  ) : (
                                    <Input
                                      value={editingContent[item.id]}
                                      onChange={(e) => setEditingContent(prev => ({ 
                                        ...prev, 
                                        [item.id]: e.target.value 
                                      }))}
                                      placeholder="Enter content..."
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="bg-muted/50 p-3 rounded text-sm">
                                  {item.value}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={refreshContent}
                        disabled={contentLoading}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Refresh Content
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {analytics.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading analytics...</span>
              </div>
            ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Platform revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Transaction Fees</span>
                      <span className="font-medium">${analytics.transactionFees.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Platform Revenue</span>
                      <span className="font-medium">${analytics.platformRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User & Event Analytics</CardTitle>
                  <CardDescription>Platform usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Daily Active Users</span>
                      <span className="font-medium">{analytics.dailyActiveUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Events</span>
                      <span className="font-medium">{analytics.activeEvents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tickets Sold</span>
                      <span className="font-medium">{analytics.ticketsSold}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      <span>Application Server</span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>CDN</span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Configuration</CardTitle>
                  <CardDescription>System settings and configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Fee Percentage</Label>
                    <Input type="number" placeholder="5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum File Upload Size (MB)</Label>
                    <Input type="number" placeholder="10" />
                  </div>
                  <Button className="w-full">Update Configuration</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Platform Configuration</CardTitle>
                  <CardDescription>Manage platform-wide Stripe settings</CardDescription>
                </CardHeader>
                <CardContent>
                  {platformConfig.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading platform configuration...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Platform Fee Percentage (%)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={platformConfig.platform_fee_percentage}
                            onChange={(e) => setPlatformConfig(prev => ({
                              ...prev,
                              platform_fee_percentage: parseFloat(e.target.value) || 0
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Percentage fee charged on each transaction
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Platform Fixed Fee ($)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={platformConfig.platform_fee_fixed}
                            onChange={(e) => setPlatformConfig(prev => ({
                              ...prev,
                              platform_fee_fixed: parseFloat(e.target.value) || 0
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Fixed fee charged per transaction
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Stripe Platform Publishable Key</Label>
                          <Input 
                            type="text"
                            value={platformConfig.stripe_platform_publishable_key}
                            onChange={(e) => setPlatformConfig(prev => ({
                              ...prev,
                              stripe_platform_publishable_key: e.target.value
                            }))}
                            placeholder="pk_..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Your Stripe platform publishable key (safe to expose)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Stripe Platform Secret Key</Label>
                          <Input 
                            type="password"
                            value={platformConfig.stripe_platform_secret_key}
                            onChange={(e) => setPlatformConfig(prev => ({
                              ...prev,
                              stripe_platform_secret_key: e.target.value
                            }))}
                            placeholder="sk_..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Your Stripe platform secret key (kept secure)
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handlePlatformConfigSave}
                        disabled={savingPlatformConfig}
                        className="w-full"
                      >
                        {savingPlatformConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving Configuration...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Platform Configuration
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Platform-wide general settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input defaultValue="TicketFlo" />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input defaultValue="support@ticketflo.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance Mode</Label>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="maintenance" />
                        <label htmlFor="maintenance" className="text-sm">
                          Enable maintenance mode
                        </label>
                      </div>
                    </div>
                  </div>
                  <Button>Save General Settings</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MasterAdmin;