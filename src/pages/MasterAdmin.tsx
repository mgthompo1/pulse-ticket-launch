import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Building, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Server,
  Database,
  Globe,
  Shield,
  Settings,
  UserCheck,
  Ban
} from "lucide-react";

const MasterAdmin = () => {
  const [activeTab, setActiveTab] = useState("overview");

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
      name: "Sports Events Co",
      email: "info@sportsevents.com",
      events: 5,
      revenue: "$12,500",
      status: "suspended",
      joinDate: "2024-01-28",
      tier: "basic"
    }
  ];

  const systemMetrics = {
    uptime: 99.9,
    apiRequests: 1250000,
    activeUsers: 3450,
    errorRate: 0.02,
    avgResponseTime: 145
  };

  const revenueBreakdown = [
    { month: "Jan", revenue: 12500, organizations: 15 },
    { month: "Feb", revenue: 18200, organizations: 22 },
    { month: "Mar", revenue: 25800, organizations: 28 },
    { month: "Apr", revenue: 31200, organizations: 35 },
    { month: "May", revenue: 38900, organizations: 42 }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Ticket2 Master Admin
              </h1>
              <p className="text-muted-foreground mt-2">Platform management and analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                System Healthy
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$81,500</div>
                  <p className="text-xs text-muted-foreground">+25% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3,450</div>
                  <p className="text-xs text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">99.9%</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New organization registered</p>
                        <p className="text-xs text-muted-foreground">TechCorp Events - 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Large event created</p>
                        <p className="text-xs text-muted-foreground">Music Festival 2024 - 4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Payment issue resolved</p>
                        <p className="text-xs text-muted-foreground">Sports Events Co - 6 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">API limit increased</p>
                        <p className="text-xs text-muted-foreground">Premium tier upgrade - 8 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly platform earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueBreakdown.map((month) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium w-8">{month.month}</span>
                          <div className="flex-1">
                            <Progress value={(month.revenue / 40000) * 100} className="h-2" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${month.revenue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{month.organizations} orgs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Organizations</CardTitle>
                <CardDescription>Manage organizations on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{org.events}</TableCell>
                        <TableCell className="font-medium">{org.revenue}</TableCell>
                        <TableCell>
                          <Badge variant={org.tier === "premium" ? "default" : "secondary"}>
                            {org.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.status === "active" ? "default" : "destructive"}>
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <UserCheck className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Ban className="w-3 h-3" />
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

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics.apiRequests.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card className="gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics.errorRate}%</div>
                  <p className="text-xs text-muted-foreground">Well within limits</p>
                </CardContent>
              </Card>

              <Card className="gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics.avgResponseTime}ms</div>
                  <p className="text-xs text-muted-foreground">Average response</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Core services health check</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Database</p>
                        <p className="text-sm text-muted-foreground">Primary & replica healthy</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">API Servers</p>
                        <p className="text-sm text-muted-foreground">All instances running</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Security</p>
                        <p className="text-sm text-muted-foreground">No threats detected</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Secure
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">CDN</p>
                        <p className="text-sm text-muted-foreground">Some edge servers slow</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Degraded
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="gradient-card hover-scale">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">$81,500</div>
                  <p className="text-sm text-muted-foreground">+25% from last month</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">5.5%</div>
                  <p className="text-sm text-muted-foreground">Average across tiers</p>
                </CardContent>
              </Card>

              <Card className="gradient-card hover-scale">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">+32%</div>
                  <p className="text-sm text-muted-foreground">Revenue increase</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown by Tier</CardTitle>
                <CardDescription>Commission earnings by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">Premium Tier</p>
                        <p className="text-sm text-muted-foreground">8% commission</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">$48,900</p>
                      <p className="text-sm text-muted-foreground">60% of total</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-secondary rounded-full"></div>
                      <div>
                        <p className="font-medium">Standard Tier</p>
                        <p className="text-sm text-muted-foreground">5% commission</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">$24,450</p>
                      <p className="text-sm text-muted-foreground">30% of total</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-muted rounded-full"></div>
                      <div>
                        <p className="font-medium">Basic Tier</p>
                        <p className="text-sm text-muted-foreground">3% commission</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">$8,150</p>
                      <p className="text-sm text-muted-foreground">10% of total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure global platform options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input id="platform-name" value="Ticket2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" value="support@ticket2.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission-rate">Default Commission Rate (%)</Label>
                  <Input id="commission-rate" type="number" value="5.5" />
                </div>
                <Button className="gradient-primary">Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MasterAdmin;