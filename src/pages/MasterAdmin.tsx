import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Settings, 
  BarChart3, 
  Shield,
  LogOut,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Database,
  Activity,
  CheckCircle,
  XCircle,
  Server,
  Globe,
  UserCheck,
  Ban,
  Edit,
  Save,
  Type,
  FileText
} from "lucide-react";

const MasterAdmin = () => {
  const { isAdminAuthenticated, adminUser, loading: authLoading, logout } = useAdminAuth();
  const { content, loading: contentLoading, updateContent, refreshContent } = useLandingPageContent();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingContent, setEditingContent] = useState<{[key: string]: string}>({});
  const [savingContent, setSavingContent] = useState<{[key: string]: boolean}>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      navigate("/admin-auth");
    }
  }, [isAdminAuthenticated, authLoading, navigate]);

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

  const organizations = [
    {
      id: 1,
      name: "TechCorp Events",
      email: "admin@techcorp.com",
      events: 12,
      revenue: "$45,200",
      status: "active",
      joinDate: "2024-01-15",
      tier: "premium"
    },
    {
      id: 2,
      name: "Music Venues Inc",
      email: "contact@musicvenues.com",
      events: 8,
      revenue: "$23,800",
      status: "active",
      joinDate: "2024-02-03",
      tier: "standard"
    },
    {
      id: 3,
      name: "Conference Solutions",
      email: "info@confsolutions.com",
      events: 15,
      revenue: "$67,500",
      status: "suspended",
      joinDate: "2024-01-08",
      tier: "premium"
    }
  ];

  const systemMetrics = [
    { label: "Total Organizations", value: "156", change: "+12%", icon: Building2 },
    { label: "Active Events", value: "342", change: "+8%", icon: Calendar },
    { label: "Total Revenue", value: "$234,567", change: "+15%", icon: DollarSign },
    { label: "Platform Users", value: "2,847", change: "+23%", icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Ticket2 Master Admin</h1>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {systemMetrics.map((metric, index) => (
                <Card key={index} className="border-2 border-primary/10 hover:border-primary/20 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.label}
                    </CardTitle>
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      {metric.change} from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New organization registered</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Event published</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment processed</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Platform status overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response Time</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20" />
                      <span className="text-sm text-green-600">85ms</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Performance</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20" />
                      <span className="text-sm text-green-600">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Server Uptime</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">99.9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Management</CardTitle>
                <CardDescription>Manage all organizations on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">{org.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{org.events}</TableCell>
                        <TableCell>{org.revenue}</TableCell>
                        <TableCell>
                          <Badge variant={org.status === "active" ? "default" : "destructive"}>
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.tier === "premium" ? "secondary" : "outline"}>
                            {org.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                      <span className="font-medium">$12,450</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Subscription Revenue</span>
                      <span className="font-medium">$8,900</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Premium Features</span>
                      <span className="font-medium">$3,200</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>Platform usage statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Daily Active Users</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Events Created</span>
                      <span className="font-medium">89</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tickets Sold</span>
                      <span className="font-medium">2,567</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Master Admin Settings</CardTitle>
                <CardDescription>Platform-wide configuration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input defaultValue="Ticket2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@ticket2.com" />
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
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MasterAdmin;