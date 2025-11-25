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
  CreditCard,
  Filter,
  ArrowDownToLine,
  RotateCcw,
  FileText,
  Banknote,
  ScrollText,
  Megaphone,
  HeartPulse,
  Trash2,
  Plus,
  Eye,
  EyeOff
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
  const [onboardingFunnel, setOnboardingFunnel] = useState<{
    loading: boolean;
    stages: Array<{ name: string; count: number; percentage: number }>;
    dropoffs: { signupToVerified: number; verifiedToOrg: number; orgToEvent: number; eventToSale: number };
    stuckUsers: Array<{ id: string; email: string; created_at: string; provider: string }>;
  }>({
    loading: true,
    stages: [],
    dropoffs: { signupToVerified: 0, verifiedToOrg: 0, orgToEvent: 0, eventToSale: 0 },
    stuckUsers: []
  });
  const [payoutsData, setPayoutsData] = useState<{
    loading: boolean;
    platformPayouts: any[];
    connectedAccounts: any[];
    recentTransfers: any[];
  }>({
    loading: true,
    platformPayouts: [],
    connectedAccounts: [],
    recentTransfers: []
  });
  const [refundsData, setRefundsData] = useState<{
    loading: boolean;
    refunds: any[];
    stats: { totalRefunded: number; refundCount: number; byStatus: Record<string, number> };
  }>({
    loading: true,
    refunds: [],
    stats: { totalRefunded: 0, refundCount: 0, byStatus: {} }
  });
  const [auditLog, setAuditLog] = useState<{
    loading: boolean;
    entries: Array<{ id: string; action: string; actor_email: string; details: any; created_at: string }>;
  }>({
    loading: true,
    entries: []
  });
  const [announcements, setAnnouncements] = useState<{
    loading: boolean;
    banners: Array<{ id: string; message: string; type: 'info' | 'warning' | 'success' | 'error'; active: boolean; created_at: string }>;
  }>({
    loading: true,
    banners: []
  });
  const [newAnnouncement, setNewAnnouncement] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error'
  });
  const [orgHealthScores, setOrgHealthScores] = useState<{
    loading: boolean;
    organizations: Array<{
      id: string;
      name: string;
      score: number;
      metrics: {
        hasEvents: boolean;
        hasTicketsSold: boolean;
        hasStripeConnected: boolean;
        isActive: boolean;
        lastActivity: string | null;
      };
    }>;
  }>({
    loading: true,
    organizations: []
  });
  const [systemLogs, setSystemLogs] = useState<{
    loading: boolean;
    authActivity: Array<{ type: string; email: string; timestamp: string; provider: string; confirmed: boolean; user_id: string }>;
    authStats: {
      total: number;
      confirmed: number;
      unconfirmed: number;
      byProvider: Record<string, number>;
      last24h: number;
      last7d: number;
    };
    recentOrders: any[];
    recentEvents: any[];
    recentOrgs: any[];
    recentTickets: any[];
    tableStats: Array<{ table_name: string; row_count: number }>;
    pendingInvites: any[];
    totalUsers: number;
  }>({
    loading: true,
    authActivity: [],
    authStats: { total: 0, confirmed: 0, unconfirmed: 0, byProvider: {}, last24h: 0, last7d: 0 },
    recentOrders: [],
    recentEvents: [],
    recentOrgs: [],
    recentTickets: [],
    tableStats: [],
    pendingInvites: [],
    totalUsers: 0
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
          body: { token: adminToken },
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

  // Fetch onboarding funnel data
  useEffect(() => {
    const fetchOnboardingFunnel = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'onboarding_funnel' }
        });

        if (error) throw error;
        if (data?.success) {
          setOnboardingFunnel({ ...data.data, loading: false });
        } else {
          setOnboardingFunnel(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading onboarding funnel:", error);
        setOnboardingFunnel(prev => ({ ...prev, loading: false }));
      }
    };
    fetchOnboardingFunnel();
  }, []);

  // Fetch payouts data
  useEffect(() => {
    const fetchPayouts = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'payouts' }
        });

        if (error) throw error;
        if (data?.success) {
          setPayoutsData({ ...data.data, loading: false });
        } else {
          setPayoutsData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading payouts:", error);
        setPayoutsData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchPayouts();
  }, []);

  // Fetch refunds data
  useEffect(() => {
    const fetchRefunds = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'refunds' }
        });

        if (error) throw error;
        if (data?.success) {
          setRefundsData({ ...data.data, loading: false });
        } else {
          setRefundsData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading refunds:", error);
        setRefundsData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchRefunds();
  }, []);

  // Fetch audit log
  useEffect(() => {
    const fetchAuditLog = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'audit_log' }
        });

        if (error) throw error;
        if (data?.success) {
          setAuditLog({ entries: data.data || [], loading: false });
        } else {
          setAuditLog(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading audit log:", error);
        setAuditLog(prev => ({ ...prev, loading: false }));
      }
    };
    fetchAuditLog();
  }, []);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'announcements' }
        });

        if (error) throw error;
        if (data?.success) {
          setAnnouncements({ banners: data.data || [], loading: false });
        } else {
          setAnnouncements(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading announcements:", error);
        setAnnouncements(prev => ({ ...prev, loading: false }));
      }
    };
    fetchAnnouncements();
  }, []);

  // Fetch org health scores
  useEffect(() => {
    const fetchOrgHealthScores = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'org_health_scores' }
        });

        if (error) throw error;
        if (data?.success) {
          setOrgHealthScores({ organizations: data.data || [], loading: false });
        } else {
          setOrgHealthScores(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading org health scores:", error);
        setOrgHealthScores(prev => ({ ...prev, loading: false }));
      }
    };
    fetchOrgHealthScores();
  }, []);

  // Fetch system logs
  useEffect(() => {
    const fetchSystemLogs = async () => {
      const adminToken = sessionStorage.getItem('ticketflo_admin_token');
      if (!adminToken) return;

      try {
        const { data, error } = await supabase.functions.invoke('admin-data', {
          body: { token: adminToken, dataType: 'system_logs' }
        });

        if (error) throw error;
        if (data?.success) {
          setSystemLogs({ ...data.data, loading: false });
        } else {
          setSystemLogs(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading system logs:", error);
        setSystemLogs(prev => ({ ...prev, loading: false }));
      }
    };
    fetchSystemLogs();
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
            onClick={() => setActiveTab("funnel")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "funnel"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Filter className="w-4 h-4" />
            Onboarding Funnel
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "payouts"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Banknote className="w-4 h-4" />
            Payouts
          </button>
          <button
            onClick={() => setActiveTab("refunds")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "refunds"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Refunds
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "audit"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Audit Log
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "announcements"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Announcements
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "health"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            Org Health
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
              {activeTab === "funnel" && "Onboarding Funnel"}
              {activeTab === "payouts" && "Payout Management"}
              {activeTab === "refunds" && "Refund Dashboard"}
              {activeTab === "audit" && "Audit Log"}
              {activeTab === "announcements" && "Announcement Banners"}
              {activeTab === "health" && "Organization Health Scores"}
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

          {/* Onboarding Funnel Tab */}
          {activeTab === "funnel" && (
            <div className="space-y-6">
              {onboardingFunnel.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading funnel data...</span>
                </div>
              ) : (
                <>
                  {/* Funnel Visualization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        User Onboarding Funnel
                      </CardTitle>
                      <CardDescription>Track where users drop off in the signup process</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {onboardingFunnel.stages.map((stage, index) => (
                          <div key={stage.name} className="relative">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{stage.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {stage.count} ({stage.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                              <div
                                className="h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                                style={{
                                  width: `${stage.percentage}%`,
                                  backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#22c55e' : index === 2 ? '#eab308' : index === 3 ? '#f97316' : '#ef4444',
                                  minWidth: stage.count > 0 ? '60px' : '0'
                                }}
                              >
                                {stage.count > 0 && stage.count}
                              </div>
                            </div>
                            {index < onboardingFunnel.stages.length - 1 && (
                              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                                <ArrowDownToLine className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Drop-off Stats */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Signup → Verified</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">{onboardingFunnel.dropoffs.signupToVerified}</div>
                        <p className="text-xs text-red-600">dropped off</p>
                      </CardContent>
                    </Card>
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-800">Verified → Org Created</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{onboardingFunnel.dropoffs.verifiedToOrg}</div>
                        <p className="text-xs text-orange-600">dropped off</p>
                      </CardContent>
                    </Card>
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-800">Org → Event Created</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{onboardingFunnel.dropoffs.orgToEvent}</div>
                        <p className="text-xs text-yellow-600">dropped off</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Event → First Sale</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{onboardingFunnel.dropoffs.eventToSale}</div>
                        <p className="text-xs text-blue-600">no sales yet</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stuck Users */}
                  {onboardingFunnel.stuckUsers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                          Users Stuck at Verification (No Org Created)
                        </CardTitle>
                        <CardDescription>These users verified their email but never created an organization</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Signed Up</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {onboardingFunnel.stuckUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{user.provider}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === "payouts" && (
            <div className="space-y-6">
              {payoutsData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading payouts data...</span>
                </div>
              ) : (
                <>
                  {/* Connected Accounts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Connected Stripe Accounts ({payoutsData.connectedAccounts.length})
                      </CardTitle>
                      <CardDescription>Organizations with Stripe Connect enabled</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {payoutsData.connectedAccounts.length === 0 ? (
                        <p className="text-muted-foreground">No connected accounts found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Business Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Payouts</TableHead>
                              <TableHead>Charges</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payoutsData.connectedAccounts.map((account: any) => (
                              <TableRow key={account.id}>
                                <TableCell className="font-medium">{account.business_name || 'N/A'}</TableCell>
                                <TableCell>{account.email || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge variant={account.payouts_enabled ? 'default' : 'destructive'}>
                                    {account.payouts_enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={account.charges_enabled ? 'default' : 'destructive'}>
                                    {account.charges_enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Transfers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Banknote className="w-5 h-5" />
                        Recent Transfers to Connected Accounts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payoutsData.recentTransfers.length === 0 ? (
                        <p className="text-muted-foreground">No recent transfers found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Amount</TableHead>
                              <TableHead>Destination</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payoutsData.recentTransfers.map((transfer: any) => (
                              <TableRow key={transfer.id}>
                                <TableCell className="font-medium">
                                  ${transfer.amount.toFixed(2)} {transfer.currency.toUpperCase()}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{transfer.destination}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(transfer.created), 'MMM d, yyyy HH:mm')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Platform Payouts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Platform Payouts (Your Account)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payoutsData.platformPayouts.length === 0 ? (
                        <p className="text-muted-foreground">No platform payouts found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Arrival Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payoutsData.platformPayouts.map((payout: any) => (
                              <TableRow key={payout.id}>
                                <TableCell className="font-medium">
                                  ${payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                                    {payout.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(payout.arrival_date), 'MMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === "refunds" && (
            <div className="space-y-6">
              {refundsData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading refunds data...</span>
                </div>
              ) : (
                <>
                  {/* Refund Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          ${(refundsData.stats.totalRefunded || 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Refund Count</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{refundsData.stats.refundCount}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">By Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(refundsData.stats.byStatus || {}).map(([status, count]) => (
                            <Badge key={status} variant="outline">
                              {status}: {count as number}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Refunds List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" />
                        Recent Refunds
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {refundsData.refunds.length === 0 ? (
                        <p className="text-muted-foreground">No refunds found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {refundsData.refunds.map((refund: any) => (
                              <TableRow key={refund.id}>
                                <TableCell className="font-medium text-red-600">
                                  -${refund.amount.toFixed(2)} {refund.currency.toUpperCase()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={refund.status === 'succeeded' ? 'default' : 'secondary'}>
                                    {refund.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {refund.reason || 'N/A'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(refund.created), 'MMM d, yyyy HH:mm')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              {auditLog.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading audit log...</span>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ScrollText className="w-5 h-5" />
                      Platform Audit Log
                    </CardTitle>
                    <CardDescription>Track all administrative actions and system events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditLog.entries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No audit log entries yet.</p>
                        <p className="text-sm">Administrative actions will be recorded here.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLog.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {entry.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{entry.actor_email}</TableCell>
                              <TableCell className="max-w-xs truncate text-muted-foreground">
                                {typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm:ss')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              {announcements.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Loading announcements...</span>
                </div>
              ) : (
                <>
                  {/* Create New Announcement */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create Announcement Banner
                      </CardTitle>
                      <CardDescription>Display platform-wide announcements to all users</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Input
                          placeholder="Enter announcement message..."
                          value={newAnnouncement.message}
                          onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <div className="flex gap-2">
                          {(['info', 'warning', 'success', 'error'] as const).map((type) => (
                            <Button
                              key={type}
                              variant={newAnnouncement.type === type ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setNewAnnouncement(prev => ({ ...prev, type }))}
                              className={
                                type === 'info' ? 'bg-blue-500 hover:bg-blue-600' :
                                type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                type === 'success' ? 'bg-green-500 hover:bg-green-600' :
                                'bg-red-500 hover:bg-red-600'
                              }
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!newAnnouncement.message.trim()}
                        onClick={async () => {
                          const adminToken = sessionStorage.getItem('ticketflo_admin_token');
                          if (!adminToken) return;
                          try {
                            const { data, error } = await supabase.functions.invoke('admin-data', {
                              body: {
                                token: adminToken,
                                dataType: 'create_announcement',
                                message: newAnnouncement.message,
                                type: newAnnouncement.type
                              }
                            });
                            if (error) throw error;
                            if (data?.success) {
                              toast({ title: "Announcement Created", description: "The announcement is now live." });
                              setNewAnnouncement({ message: '', type: 'info' });
                              setAnnouncements(prev => ({
                                ...prev,
                                banners: [data.data, ...prev.banners]
                              }));
                            }
                          } catch (error) {
                            console.error("Error creating announcement:", error);
                            toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" });
                          }
                        }}
                      >
                        <Megaphone className="w-4 h-4 mr-2" />
                        Publish Announcement
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Active Announcements */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5" />
                        Active Announcements ({announcements.banners.filter(b => b.active).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {announcements.banners.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No announcements yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {announcements.banners.map((banner) => (
                            <div
                              key={banner.id}
                              className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                                banner.type === 'info' ? 'border-blue-200 bg-blue-50' :
                                banner.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                                banner.type === 'success' ? 'border-green-200 bg-green-50' :
                                'border-red-200 bg-red-50'
                              } ${!banner.active ? 'opacity-50' : ''}`}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{banner.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Created: {format(new Date(banner.created_at), 'MMM d, yyyy HH:mm')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant={banner.active ? 'default' : 'secondary'}>
                                  {banner.active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    const adminToken = sessionStorage.getItem('ticketflo_admin_token');
                                    if (!adminToken) return;
                                    try {
                                      const { data, error } = await supabase.functions.invoke('admin-data', {
                                        body: {
                                          token: adminToken,
                                          dataType: 'toggle_announcement',
                                          announcementId: banner.id,
                                          active: !banner.active
                                        }
                                      });
                                      if (error) throw error;
                                      if (data?.success) {
                                        setAnnouncements(prev => ({
                                          ...prev,
                                          banners: prev.banners.map(b =>
                                            b.id === banner.id ? { ...b, active: !b.active } : b
                                          )
                                        }));
                                      }
                                    } catch (error) {
                                      console.error("Error toggling announcement:", error);
                                    }
                                  }}
                                >
                                  {banner.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={async () => {
                                    const adminToken = sessionStorage.getItem('ticketflo_admin_token');
                                    if (!adminToken) return;
                                    try {
                                      const { data, error } = await supabase.functions.invoke('admin-data', {
                                        body: {
                                          token: adminToken,
                                          dataType: 'delete_announcement',
                                          announcementId: banner.id
                                        }
                                      });
                                      if (error) throw error;
                                      if (data?.success) {
                                        setAnnouncements(prev => ({
                                          ...prev,
                                          banners: prev.banners.filter(b => b.id !== banner.id)
                                        }));
                                        toast({ title: "Deleted", description: "Announcement has been removed." });
                                      }
                                    } catch (error) {
                                      console.error("Error deleting announcement:", error);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Org Health Scores Tab */}
          {activeTab === "health" && (
            <div className="space-y-6">
              {orgHealthScores.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-lg">Calculating health scores...</span>
                </div>
              ) : (
                <>
                  {/* Score Breakdown Explanation */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="w-5 h-5" />
                        How Health Scores Are Calculated
                      </CardTitle>
                      <CardDescription>Each organization is scored out of 100 points based on 4 key metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">Stripe Connected</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">+25 pts</div>
                          <p className="text-xs text-blue-600 mt-1">Has linked Stripe account for payments</p>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-purple-800">Events Created</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">+25 pts</div>
                          <p className="text-xs text-purple-600 mt-1">Has at least 1 event created</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Ticket className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-800">Tickets Sold</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">+25 pts</div>
                          <p className="text-xs text-green-600 mt-1">Has sold at least 1 ticket</p>
                        </div>
                        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-orange-600" />
                            <span className="font-semibold text-orange-800">Recent Activity</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-600">+25 pts</div>
                          <p className="text-xs text-orange-600 mt-1">Activity within last 30 days</p>
                        </div>
                      </div>

                      {/* Status Legend */}
                      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">Healthy (75-100)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                          <span className="text-sm font-medium">Needs Attention (50-74)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-medium">At Risk (25-49)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span className="text-sm font-medium">Critical (0-24)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Organizations Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Organization Health Details</CardTitle>
                      <CardDescription>Sorted by health score (lowest first to identify at-risk organizations)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {orgHealthScores.organizations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <HeartPulse className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No organizations to analyze.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Organization</TableHead>
                              <TableHead>Total Score</TableHead>
                              <TableHead className="text-center">
                                <div className="flex flex-col items-center">
                                  <CreditCard className="w-4 h-4 mb-1" />
                                  <span>Stripe</span>
                                  <span className="text-xs text-muted-foreground">+25</span>
                                </div>
                              </TableHead>
                              <TableHead className="text-center">
                                <div className="flex flex-col items-center">
                                  <Calendar className="w-4 h-4 mb-1" />
                                  <span>Events</span>
                                  <span className="text-xs text-muted-foreground">+25</span>
                                </div>
                              </TableHead>
                              <TableHead className="text-center">
                                <div className="flex flex-col items-center">
                                  <Ticket className="w-4 h-4 mb-1" />
                                  <span>Sales</span>
                                  <span className="text-xs text-muted-foreground">+25</span>
                                </div>
                              </TableHead>
                              <TableHead className="text-center">
                                <div className="flex flex-col items-center">
                                  <Activity className="w-4 h-4 mb-1" />
                                  <span>Active</span>
                                  <span className="text-xs text-muted-foreground">+25</span>
                                </div>
                              </TableHead>
                              <TableHead>Last Activity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orgHealthScores.organizations
                              .sort((a, b) => a.score - b.score)
                              .map((org) => (
                                <TableRow key={org.id} className={
                                  org.score < 25 ? 'bg-red-50' :
                                  org.score < 50 ? 'bg-orange-50' :
                                  org.score < 75 ? 'bg-yellow-50' : ''
                                }>
                                  <TableCell className="font-medium">{org.name}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-3 h-3 rounded-full ${
                                          org.score >= 75 ? 'bg-green-500' :
                                          org.score >= 50 ? 'bg-yellow-500' :
                                          org.score >= 25 ? 'bg-orange-500' :
                                          'bg-red-500'
                                        }`}
                                      ></div>
                                      <Progress value={org.score} className="w-20" />
                                      <span className={`text-sm font-bold ${
                                        org.score >= 75 ? 'text-green-600' :
                                        org.score >= 50 ? 'text-yellow-600' :
                                        org.score >= 25 ? 'text-orange-600' :
                                        'text-red-600'
                                      }`}>
                                        {org.score}/100
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {org.metrics.hasStripeConnected ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span className="text-xs text-green-600 font-medium">+25</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        <span className="text-xs text-red-400">+0</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {org.metrics.hasEvents ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span className="text-xs text-green-600 font-medium">+25</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        <span className="text-xs text-red-400">+0</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {org.metrics.hasTicketsSold ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span className="text-xs text-green-600 font-medium">+25</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        <span className="text-xs text-red-400">+0</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {org.metrics.isActive ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span className="text-xs text-green-600 font-medium">+25</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        <span className="text-xs text-red-400">+0</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {org.metrics.lastActivity
                                      ? format(new Date(org.metrics.lastActivity), 'MMM d, yyyy')
                                      : 'Never'}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
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

                  {/* System Logs Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        System Activity Logs
                      </CardTitle>
                      <CardDescription>
                        Real-time activity from auth, database, and platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {systemLogs.loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Loading system logs...</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Auth Stats Overview */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Auth Statistics
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                              <div className="p-3 border rounded-lg text-center">
                                <div className="text-2xl font-bold">{systemLogs.authStats.total}</div>
                                <div className="text-xs text-muted-foreground">Total Users</div>
                              </div>
                              <div className="p-3 border rounded-lg text-center bg-green-50">
                                <div className="text-2xl font-bold text-green-600">{systemLogs.authStats.confirmed}</div>
                                <div className="text-xs text-muted-foreground">Confirmed</div>
                              </div>
                              <div className="p-3 border rounded-lg text-center bg-yellow-50">
                                <div className="text-2xl font-bold text-yellow-600">{systemLogs.authStats.unconfirmed}</div>
                                <div className="text-xs text-muted-foreground">Unconfirmed</div>
                              </div>
                              <div className="p-3 border rounded-lg text-center bg-blue-50">
                                <div className="text-2xl font-bold text-blue-600">{systemLogs.authStats.last24h}</div>
                                <div className="text-xs text-muted-foreground">Last 24h</div>
                              </div>
                              <div className="p-3 border rounded-lg text-center bg-purple-50">
                                <div className="text-2xl font-bold text-purple-600">{systemLogs.authStats.last7d}</div>
                                <div className="text-xs text-muted-foreground">Last 7 days</div>
                              </div>
                              <div className="p-3 border rounded-lg text-center">
                                <div className="text-sm font-medium">By Provider</div>
                                <div className="text-xs text-muted-foreground">
                                  {Object.entries(systemLogs.authStats.byProvider).map(([provider, count]) => (
                                    <span key={provider} className="block">{provider}: {count}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Auth Activity */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Recent Auth Activity
                            </h4>
                            {systemLogs.authActivity.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No recent auth activity</p>
                            ) : (
                              <div className="max-h-64 overflow-y-auto border rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Email</TableHead>
                                      <TableHead>Provider</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Time</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {systemLogs.authActivity.map((event, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          <Badge variant={event.type === 'signup' ? 'default' : 'secondary'}>
                                            {event.type === 'signup' ? 'Sign Up' : 'Sign In'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{event.email}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{event.provider}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {event.confirmed ? (
                                            <span className="text-green-600 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" /> Confirmed
                                            </span>
                                          ) : (
                                            <span className="text-yellow-600 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" /> Pending
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {format(new Date(event.timestamp), 'MMM d, HH:mm:ss')}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>

                          {/* Database Stats */}
                          {systemLogs.tableStats.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Database Table Stats
                              </h4>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {systemLogs.tableStats.map((stat) => (
                                  <div key={stat.table_name} className="p-2 border rounded text-center">
                                    <div className="text-lg font-bold">{stat.row_count.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground truncate">{stat.table_name}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recent Platform Activity */}
                          <div className="grid md:grid-cols-4 gap-4">
                            {/* Recent Orders */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Recent Orders
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {systemLogs.recentOrders.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No recent orders</p>
                                ) : (
                                  systemLogs.recentOrders.slice(0, 5).map((order: any) => (
                                    <div key={order.id} className="p-2 border rounded text-sm">
                                      <div className="flex justify-between">
                                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                          {order.status}
                                        </Badge>
                                        <span className="font-medium">${(order.total_amount || 0).toFixed(2)}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {order.customer_email || 'N/A'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(order.created_at), 'MMM d, HH:mm')}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Recent Tickets */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Ticket className="w-4 h-4" />
                                Recent Tickets
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {systemLogs.recentTickets.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No recent tickets</p>
                                ) : (
                                  systemLogs.recentTickets.slice(0, 5).map((ticket: any) => (
                                    <div key={ticket.id} className="p-2 border rounded text-sm">
                                      <Badge variant={ticket.status === 'valid' ? 'default' : 'secondary'}>
                                        {ticket.status}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Recent Events Created */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Recent Events
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {systemLogs.recentEvents.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No recent events</p>
                                ) : (
                                  systemLogs.recentEvents.slice(0, 5).map((event: any) => (
                                    <div key={event.id} className="p-2 border rounded text-sm">
                                      <p className="font-medium truncate">{event.name}</p>
                                      <div className="flex justify-between mt-1">
                                        <Badge variant="outline">{event.status}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {format(new Date(event.created_at), 'MMM d')}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Recent Orgs Created */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Recent Organizations
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {systemLogs.recentOrgs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No recent orgs</p>
                                ) : (
                                  systemLogs.recentOrgs.slice(0, 5).map((org: any) => (
                                    <div key={org.id} className="p-2 border rounded text-sm">
                                      <p className="font-medium truncate">{org.name}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(org.created_at), 'MMM d, HH:mm')}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pending Invitations */}
                          {systemLogs.pendingInvites.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Pending Invitations ({systemLogs.pendingInvites.length})
                              </h4>
                              <div className="space-y-2">
                                {systemLogs.pendingInvites.map((invite: any) => (
                                  <div key={invite.id} className="p-2 border rounded text-sm flex justify-between items-center">
                                    <span className="font-mono">{invite.email}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(invite.created_at), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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