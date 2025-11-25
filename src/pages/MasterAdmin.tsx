import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  Save,
  Mail,
  Copy,
  UserPlus,
  AlertCircle,
  XCircle,
  Activity,
  RefreshCw,
  ClipboardCheck,
  TrendingUp,
  Ticket,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { OrganizationDetailModal } from "@/components/OrganizationDetailModal";
import { EnquiryDetailModal } from "@/components/EnquiryDetailModal";

const MasterAdmin = () => {
  // All hooks must be at the top, before any return
  const { isAdminAuthenticated, adminUser, loading: authLoading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
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
    serverUptime: 99.9,
    loading: true,
    database: { status: 'operational' as 'operational' | 'degraded' | 'down', responseTime: 0 },
    storage: { status: 'operational' as 'operational' | 'degraded' | 'down', responseTime: 0 },
    functions: { status: 'operational' as 'operational' | 'degraded' | 'down', responseTime: 0 },
  });
  const [analytics, setAnalytics] = useState<{
    loading: boolean;
    transactionFees: number;
    dailyActiveUsers: number;
    ticketsSold: number;
    platformRevenue: number;
    activeEvents: number;
    chartData?: Array<{ date: string; revenue: number; fees: number; tickets: number }>;
  }>({
    loading: true,
    transactionFees: 0,
    dailyActiveUsers: 0,
    ticketsSold: 0,
    platformRevenue: 0,
    activeEvents: 0
  });
  const [contactEnquiries, setContactEnquiries] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [authUsersLoading, setAuthUsersLoading] = useState(true);
  const [stripeRevenue, setStripeRevenue] = useState({
    available: 0,
    pending: 0,
    totalApplicationFees: 0,
    loading: true
  });
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

  // Organization detail modal state
  const [selectedOrganization, setSelectedOrganization] = useState<{id: string, name: string} | null>(null);

  // Enquiry detail modal state
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);

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
    const fetchSystemHealth = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('system-health', {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        if (error) throw error;

        if (data.success && data.metrics) {
          setSystemHealth({
            apiResponseTime: data.metrics.performance.avgApiResponseTime,
            dbPerformance: data.metrics.performance.dbPerformance,
            serverUptime: data.metrics.uptime.percentage,
            loading: false,
            database: data.metrics.database,
            storage: data.metrics.storage,
            functions: data.metrics.functions,
          });
        }
      } catch (error) {
        console.error('Error fetching system health:', error);
        // Fallback to default values
        setSystemHealth(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSystemHealth();
    // Refresh health data every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
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

  // Fetch auth users
  useEffect(() => {
    const fetchAuthUsers = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      console.log('fetchAuthUsers called, token exists:', !!adminToken);
      if (!adminToken) return;

      setAuthUsersLoading(true);
      try {
        console.log('Calling admin-data for users...');
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'users'
          }
        });

        console.log('Users response:', { data, error });

        if (error) throw error;

        if (data?.success) {
          setAuthUsers(data.data || []);
        } else {
          console.log('Users fetch returned success:false', data?.error);
        }
      } catch (error) {
        console.error("Error loading auth users:", error);
      } finally {
        setAuthUsersLoading(false);
      }
    };
    fetchAuthUsers();
  }, []);

  // Fetch Stripe revenue
  useEffect(() => {
    const fetchStripeRevenue = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      console.log('fetchStripeRevenue called, token exists:', !!adminToken);
      if (!adminToken) return;

      try {
        console.log('Calling admin-data for stripe_revenue...');
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: {
            token: adminToken,
            dataType: 'stripe_revenue'
          }
        });

        console.log('Stripe revenue response:', { data, error });

        if (error) throw error;

        if (data?.success) {
          setStripeRevenue({
            ...data.data,
            loading: false
          });
        } else {
          console.log('Stripe revenue fetch returned success:false', data?.error);
          setStripeRevenue(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading Stripe revenue:", error);
        setStripeRevenue(prev => ({ ...prev, loading: false }));
      }
    };
    fetchStripeRevenue();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Shield className="w-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">TicketFlo</h1>
              <p className="text-xs text-muted-foreground">Master Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "organizations"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Organizations
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab("enquiries")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "enquiries"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Mail className="w-4 h-4" />
            Contact Enquiries
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "analytics"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "system"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Server className="w-4 h-4" />
            System Health
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Database className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => navigate("/qa-testing")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent text-foreground"
          >
            <ClipboardCheck className="w-4 h-4" />
            QA Testing
          </button>
        </nav>

        {/* User Info and Logout at Bottom */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <p className="font-medium">{adminUser ? JSON.parse(adminUser).email : 'Admin'}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar with Page Title */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="px-8 py-4">
            <h2 className="text-2xl font-bold">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "organizations" && "Organizations"}
              {activeTab === "users" && "User Management"}
              {activeTab === "enquiries" && "Contact Enquiries"}
              {activeTab === "analytics" && "Analytics & Reports"}
              {activeTab === "system" && "System Health & Monitoring"}
              {activeTab === "settings" && "Platform Settings"}
            </h2>
          </div>
        </div>

        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {metrics.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading metrics...</span>
                </div>
              ) : (
                <>
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
                        <div className="text-2xl font-bold">${(metrics.platformRevenue || 0).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets Sold</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{(metrics.tickets || 0).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stripe Connect Revenue */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-2 border-green-500/20 bg-green-50/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stripe Available Balance</CardTitle>
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {stripeRevenue.loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            `$${(stripeRevenue.available || 0).toLocaleString()}`
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Ready to pay out</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-yellow-500/20 bg-yellow-50/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stripe Pending Balance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-yellow-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {stripeRevenue.loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            `$${(stripeRevenue.pending || 0).toLocaleString()}`
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Processing</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-blue-500/20 bg-blue-50/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Application Fees</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {stripeRevenue.loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            `$${(stripeRevenue.totalApplicationFees || 0).toLocaleString()}`
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Platform revenue from Stripe Connect</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Chart */}
                  {analytics.chartData && analytics.chartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue & Sales (Last 30 Days)</CardTitle>
                        <CardDescription>Daily revenue and ticket sales</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                              />
                              <YAxis
                                yAxisId="left"
                                label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => `$${value}`}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                label={{ value: 'Tickets Sold', angle: 90, position: 'insideRight' }}
                              />
                              <Tooltip
                                labelFormatter={(value) => format(new Date(value), 'PPP')}
                                formatter={(value: number, name: string) => {
                                  if (name === 'Revenue' || name === 'Platform Fees') {
                                    return [`$${value.toFixed(2)}`, name];
                                  }
                                  return [value, name];
                                }}
                              />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#ea580c" name="Revenue" strokeWidth={2} dot={false} />
                              <Line yAxisId="left" type="monotone" dataKey="fees" stroke="#22c55e" name="Platform Fees" strokeWidth={2} dot={false} />
                              <Line yAxisId="right" type="monotone" dataKey="tickets" stroke="#3b82f6" name="Tickets Sold" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
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
            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === "organizations" && (
            <div className="space-y-6">
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
                            <th className="px-4 py-2 text-left">Billing Status</th>
                            <th className="px-4 py-2 text-left">Created At</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {organizations.map(org => (
                            <tr key={org.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-2 font-medium">{org.name}</td>
                              <td className="px-4 py-2">{org.email || "N/A"}</td>
                              <td className="px-4 py-2">
                                {org.billing_suspended ? (
                                  <Badge variant="destructive">Suspended</Badge>
                                ) : org.trial_ends_at && new Date(org.trial_ends_at) > new Date() ? (
                                  <Badge variant="secondary">Trial</Badge>
                                ) : (
                                  <Badge variant="default">Active</Badge>
                                )}
                              </td>
                              <td className="px-4 py-2">{org.created_at ? new Date(org.created_at).toLocaleDateString() : "N/A"}</td>
                              <td className="px-4 py-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrganization({ id: org.id, name: org.name })}
                                >
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Auth Users List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Registered Users ({authUsers.length})
                  </CardTitle>
                  <CardDescription>
                    All users who have signed up through the authentication system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {authUsersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading users...</span>
                    </div>
                  ) : authUsers.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No users found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Sign In</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {authUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>
                                {user.confirmed ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {user.provider}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy HH:mm') : 'Never'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Password Reset */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Reset User Password
                  </CardTitle>
                  <CardDescription>
                    Reset a user's password (use with caution)
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
            </div>
          )}

          {/* Contact Enquiries Tab */}
          {activeTab === "enquiries" && (
            <div className="space-y-6">
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

                          <Button
                            onClick={() => setSelectedEnquiry(enquiry)}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                          >
                            View Details & Respond
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
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
                          <span className="font-medium">${(analytics.transactionFees || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Platform Revenue</span>
                          <span className="font-medium">${(analytics.platformRevenue || 0).toLocaleString()}</span>
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
            </div>
          )}

          {/* System Tab */}
          {activeTab === "system" && (
            <div className="space-y-6">
              {systemHealth.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading system health...</span>
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            System Status
                          </CardTitle>
                          <CardDescription>Real-time platform health monitoring</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.reload()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Database Status */}
                        <div className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                          systemHealth.database.status === 'operational' ? 'border-green-200 bg-green-50' :
                          systemHealth.database.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Database className={`h-5 w-5 ${
                              systemHealth.database.status === 'operational' ? 'text-green-600' :
                              systemHealth.database.status === 'degraded' ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">Database</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {systemHealth.database.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {systemHealth.database.responseTime}ms
                              </p>
                            </div>
                          </div>
                          {systemHealth.database.status === 'operational' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : systemHealth.database.status === 'degraded' ? (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>

                        {/* Storage Status */}
                        <div className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                          systemHealth.storage.status === 'operational' ? 'border-green-200 bg-green-50' :
                          systemHealth.storage.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Server className={`h-5 w-5 ${
                              systemHealth.storage.status === 'operational' ? 'text-green-600' :
                              systemHealth.storage.status === 'degraded' ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">Storage</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {systemHealth.storage.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {systemHealth.storage.responseTime}ms
                              </p>
                            </div>
                          </div>
                          {systemHealth.storage.status === 'operational' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : systemHealth.storage.status === 'degraded' ? (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>

                        {/* Functions Status */}
                        <div className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                          systemHealth.functions.status === 'operational' ? 'border-green-200 bg-green-50' :
                          systemHealth.functions.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Globe className={`h-5 w-5 ${
                              systemHealth.functions.status === 'operational' ? 'text-green-600' :
                              systemHealth.functions.status === 'degraded' ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">Edge Functions</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {systemHealth.functions.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {systemHealth.functions.responseTime}ms
                              </p>
                            </div>
                          </div>
                          {systemHealth.functions.status === 'operational' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : systemHealth.functions.status === 'degraded' ? (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Average API Response Time</span>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(systemHealth.apiResponseTime, 100)} className="w-32" />
                              <span className={`text-sm font-medium ${
                                systemHealth.apiResponseTime < 100 ? 'text-green-600' :
                                systemHealth.apiResponseTime < 200 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {systemHealth.apiResponseTime}ms
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Database Performance</span>
                            <div className="flex items-center gap-2">
                              <Progress value={systemHealth.dbPerformance} className="w-32" />
                              <span className="text-sm font-medium text-green-600">
                                {systemHealth.dbPerformance}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Platform Uptime (30 days)</span>
                            <div className="flex items-center gap-2">
                              <Progress value={systemHealth.serverUptime} className="w-32" />
                              <span className="text-sm font-medium text-green-600">
                                {systemHealth.serverUptime}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Health checks refresh automatically every 30 seconds</span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 animate-pulse" />
                            Live monitoring
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization Detail Modal */}
      {selectedOrganization && (
        <OrganizationDetailModal
          isOpen={!!selectedOrganization}
          onClose={() => setSelectedOrganization(null)}
          organizationId={selectedOrganization.id}
          organizationName={selectedOrganization.name}
          onUpdate={async () => {
            // Reload organizations after update
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) return;

            try {
              const { data } = await supabase.functions.invoke('admin-data', {
                body: {
                  token: adminToken,
                  dataType: 'organizations'
                }
              });

              if (data.success) {
                setOrganizations(data.data || []);
              }
            } catch (error) {
              console.error('Error reloading organizations:', error);
            }
          }}
        />
      )}

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <EnquiryDetailModal
          isOpen={!!selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          enquiry={selectedEnquiry}
          onUpdate={async () => {
            // Reload enquiries after update
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) return;

            try {
              const { data } = await supabase.functions.invoke('admin-data', {
                body: {
                  token: adminToken,
                  dataType: 'enquiries'
                }
              });

              if (data.success) {
                setContactEnquiries(data.data || []);
              }
            } catch (error) {
              console.error('Error reloading enquiries:', error);
            }
          }}
        />
      )}
    </div>
  );
};

export default MasterAdmin;