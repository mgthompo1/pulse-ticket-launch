import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Ticket,
  Users,
  DollarSign,
  FileText,
  Tag,
  Loader2,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Copy,
} from "lucide-react";
import { GroupDiscountCodes } from "@/components/GroupDiscountCodes";
import { GroupInvoices } from "@/components/GroupInvoices";

interface Group {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  url_slug: string;
  organization_id: string;
  organizations: {
    name: string;
    logo_url: string | null;
  };
}

interface GroupAllocation {
  id: string;
  allocated_quantity: number;
  used_quantity: number;
  reserved_quantity: number;
  full_price: number;
  minimum_price: number | null;
  events: {
    id: string;
    name: string;
    event_date: string;
    venue: string | null;
    logo_url: string | null;
    status: string;
  };
  ticket_types: {
    name: string;
    price: number;
  };
}

interface GroupSale {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  created_at: string;
  promo_code_id: string | null;
  order_items: Array<{
    quantity: number;
    ticket_types: {
      name: string;
    } | null;
  }>;
  events: {
    name: string;
  };
}

interface Analytics {
  totalRevenue: number;
  totalTicketsSold: number;
  totalOrders: number;
  activeAllocations: number;
  pendingInvoiceAmount: number;
}

export const GroupPortal = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [allocations, setAllocations] = useState<GroupAllocation[]>([]);
  const [sales, setSales] = useState<GroupSale[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (slug) {
      loadGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadGroupData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load group by slug
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          *,
          organizations (
            name,
            logo_url
          )
        `)
        .eq("url_slug", slug)
        .eq("is_active", true)
        .single();

      if (groupError) {
        if (groupError.code === "PGRST116") {
          setError("Group not found. Please check the URL and try again.");
        } else {
          throw groupError;
        }
        return;
      }

      setGroup(groupData as Group);

      // 2. Verify user is a coordinator for this group
      const { data: user } = await supabase.auth.getUser();

      if (user?.user) {
        const { data: coordinatorData, error: coordinatorError } = await supabase
          .from("group_coordinators")
          .select("*")
          .eq("group_id", groupData.id)
          .eq("user_id", user.user.id)
          .maybeSingle();

        if (coordinatorError) {
          console.error('Coordinator check error:', coordinatorError);
        }

        if (!coordinatorData) {
          setError("You are not authorized to access this group portal. Please contact your group administrator.");
          return;
        }

        console.log('User is coordinator:', coordinatorData);
      } else {
        setError("Authentication required to access this portal.");
        return;
      }

      // 3. Load allocations
      const { data: allocationsData, error: allocationsError } = await supabase
        .from("group_ticket_allocations")
        .select(`
          *,
          events (
            id,
            name,
            event_date,
            venue,
            logo_url,
            status
          ),
          ticket_types (
            name,
            price
          )
        `)
        .eq("group_id", groupData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (allocationsError) throw allocationsError;
      setAllocations(allocationsData as GroupAllocation[] || []);

      // 4. Load sales data from group_ticket_sales
      const { data: salesData, error: salesError } = await supabase
        .from("group_ticket_sales")
        .select(`
          id,
          paid_price,
          discount_amount,
          created_at,
          discount_code,
          tickets (
            id,
            ticket_code,
            order_item_id
          )
        `)
        .eq("group_id", groupData.id)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false });

      if (salesError) {
        console.error('Sales query error:', salesError);
        throw salesError;
      }

      console.log('Sales data loaded:', salesData);

      // Get unique order item IDs from tickets
      const orderItemIds = (salesData || [])
        .map((sale: any) => sale.tickets?.order_item_id)
        .filter(Boolean);

      const ordersMap = new Map();
      const ticketTypesMap = new Map();

      if (orderItemIds.length > 0) {
        console.log('Loading order items for IDs:', orderItemIds);

        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            id,
            orders (
              id,
              customer_name,
              customer_email,
              events (
                name
              )
            ),
            ticket_types (
              name
            )
          `)
          .in("id", orderItemIds);

        if (orderItemsError) {
          console.error('Order items query error:', orderItemsError);
          throw orderItemsError;
        }

        console.log('Order items loaded:', orderItemsData);

        if (orderItemsData) {
          orderItemsData.forEach((item: any) => {
            if (item.orders) {
              ordersMap.set(item.id, item.orders);
            }
            if (item.ticket_types) {
              ticketTypesMap.set(item.id, item.ticket_types);
            }
          });
        }
      }

      // Transform sales data
      const transformedSales = (salesData || []).map((sale: any) => {
        const orderItemId = sale.tickets?.order_item_id;
        const order = ordersMap.get(orderItemId) || {};
        const ticketType = ticketTypesMap.get(orderItemId);

        return {
          id: sale.id,
          customer_name: order.customer_name || 'Unknown',
          customer_email: order.customer_email || '',
          total_amount: sale.paid_price || 0,
          created_at: sale.created_at,
          promo_code_id: sale.discount_code,
          order_items: [{
            quantity: 1,
            ticket_types: ticketType
          }],
          events: order.events || { name: 'Unknown Event' }
        };
      });

      setSales(transformedSales);

      // 5. Calculate analytics
      const totalRevenue = (transformedSales || []).reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const totalTicketsSold = transformedSales.length; // Each sale in group_ticket_sales is 1 ticket

      // Get pending invoices
      const { data: invoicesData } = await supabase
        .from("group_invoices")
        .select("total_amount")
        .eq("group_id", groupData.id)
        .eq("status", "pending");

      const pendingInvoiceAmount = (invoicesData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      // Count unique orders
      const uniqueOrderIds = new Set(
        transformedSales.map(sale => {
          const orderItemId = (salesData || []).find((s: any) => s.id === sale.id)?.tickets?.order_item_id;
          const order = ordersMap.get(orderItemId);
          return order?.id;
        }).filter(Boolean)
      );

      setAnalytics({
        totalRevenue,
        totalTicketsSold,
        totalOrders: uniqueOrderIds.size,
        activeAllocations: (allocationsData || []).filter(a => {
          const remaining = a.allocated_quantity - a.used_quantity - a.reserved_quantity;
          return remaining > 0 && a.events.status === "published";
        }).length,
        pendingInvoiceAmount,
      });
    } catch (err) {
      console.error("Error loading group data:", err);
      setError("Failed to load group information. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load group information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWidgetLink = () => {
    if (!group) return;
    const widgetUrl = `${window.location.origin}/group/${group.url_slug}/widget`;
    navigator.clipboard.writeText(widgetUrl);
    toast({
      title: "Link Copied!",
      description: "Widget link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading group portal...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">
                  {error || "Group Not Found"}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {error ||
                    "The group you're looking for doesn't exist or has been deactivated."}
                </p>
              </div>
              <Button onClick={() => navigate("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {group.logo_url && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={group.logo_url}
                  alt={group.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Admin Portal
                </Badge>
              </div>
              {group.description && (
                <p className="text-muted-foreground mt-2">{group.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Powered by {group.organizations.name}</span>
                  {group.organizations.logo_url && (
                    <img
                      src={group.organizations.logo_url}
                      alt={group.organizations.name}
                      className="h-5 w-5 rounded"
                    />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWidgetLink}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Widget Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/group/${group.url_slug}/widget`)}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Public Widget
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="promo-codes">
              <Tag className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="sales">
              <Ticket className="h-4 w-4 mr-2" />
              Sales
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalTicketsSold}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalOrders} orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.activeAllocations}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      With available tickets
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${analytics.pendingInvoiceAmount.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Awaiting payment
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Allocations Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Your Event Allocations</CardTitle>
                <CardDescription>
                  Events where you have ticket allocations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-2" />
                    <p>No allocations yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allocations.map((allocation) => {
                      const remaining = allocation.allocated_quantity - allocation.used_quantity - allocation.reserved_quantity;
                      const usagePercent = Math.round((allocation.used_quantity / allocation.allocated_quantity) * 100);

                      return (
                        <div key={allocation.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{allocation.events.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {allocation.ticket_types.name} • ${allocation.ticket_types.price.toFixed(2)}
                              </p>
                            </div>
                            <Badge variant={remaining > 0 ? "default" : "secondary"}>
                              {allocation.events.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Usage</span>
                              <span className="font-medium">
                                {allocation.used_quantity} / {allocation.allocated_quantity} sold
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promo-codes">
            <GroupDiscountCodes
              groupId={group.id}
              groupName={group.name}
              organizationId={group.organization_id}
            />
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <GroupInvoices
              groupId={group.id}
              groupName={group.name}
              organizationId={group.organization_id}
              readOnly={true}
            />
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  All ticket purchases made through your group
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-2" />
                    <p>No sales yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sales.map((sale) => (
                      <div key={sale.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{sale.customer_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {sale.events.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{sale.customer_email}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                            {sale.promo_code_id && (
                              <Badge variant="secondary" className="text-xs">
                                Used Promo Code
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">${sale.total_amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">
                            {sale.order_items.reduce((sum, item) => sum + item.quantity, 0)} tickets
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupPortal;
