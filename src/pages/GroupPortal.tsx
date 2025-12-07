import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Check,
  Calendar,
  Clock,
  ShoppingCart,
  ChevronRight,
  Lock,
  ArrowRight,
  Package,
  User,
  Mail,
  MapPin,
  Sparkles,
  Shield,
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
  has_passkey: boolean;
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
  totalAllocated: number;
  totalRemaining: number;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [validatingPasskey, setValidatingPasskey] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);

  useEffect(() => {
    if (slug) {
      const sessionToken = sessionStorage.getItem(`group_session_${slug}`);
      if (sessionToken) {
        setIsAuthenticated(true);
      }
      loadGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadGroupData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          logo_url,
          url_slug,
          organization_id,
          passkey,
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

      const safeGroupData: Group = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        logo_url: groupData.logo_url,
        url_slug: groupData.url_slug,
        organization_id: groupData.organization_id,
        has_passkey: !!groupData.passkey,
        organizations: groupData.organizations as { name: string; logo_url: string | null },
      };

      setGroup(safeGroupData);

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
      setAllocations((allocationsData as GroupAllocation[]) || []);

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
        console.error("Sales query error:", salesError);
        throw salesError;
      }

      const orderItemIds = (salesData || [])
        .map((sale: any) => sale.tickets?.order_item_id)
        .filter(Boolean);

      const ordersMap = new Map();
      const ticketTypesMap = new Map();

      if (orderItemIds.length > 0) {
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
          console.error("Order items query error:", orderItemsError);
          throw orderItemsError;
        }

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

      const transformedSales = (salesData || []).map((sale: any) => {
        const orderItemId = sale.tickets?.order_item_id;
        const order = ordersMap.get(orderItemId) || {};
        const ticketType = ticketTypesMap.get(orderItemId);

        return {
          id: sale.id,
          customer_name: order.customer_name || "Unknown",
          customer_email: order.customer_email || "",
          total_amount: sale.paid_price || 0,
          created_at: sale.created_at,
          promo_code_id: sale.discount_code,
          order_items: [
            {
              quantity: 1,
              ticket_types: ticketType,
            },
          ],
          events: order.events || { name: "Unknown Event" },
        };
      });

      setSales(transformedSales);

      const totalRevenue = (transformedSales || []).reduce(
        (sum, sale) => sum + (sale.total_amount || 0),
        0
      );
      const totalTicketsSold = transformedSales.length;

      const { data: invoicesData } = await supabase
        .from("group_invoices")
        .select("amount_owed, amount_paid")
        .eq("group_id", groupData.id)
        .in("status", ["draft", "sent", "viewed", "partial", "overdue"]);

      const pendingInvoiceAmount = (invoicesData || []).reduce((sum, inv) => {
        const remaining = (inv.amount_owed || 0) - (inv.amount_paid || 0);
        return sum + remaining;
      }, 0);

      const uniqueOrderIds = new Set(
        transformedSales
          .map((sale) => {
            const orderItemId = (salesData || []).find((s: any) => s.id === sale.id)?.tickets
              ?.order_item_id;
            const order = ordersMap.get(orderItemId);
            return order?.id;
          })
          .filter(Boolean)
      );

      const totalAllocated = (allocationsData || []).reduce(
        (sum, a) => sum + a.allocated_quantity,
        0
      );
      const totalUsed = (allocationsData || []).reduce((sum, a) => sum + a.used_quantity, 0);
      const totalReserved = (allocationsData || []).reduce(
        (sum, a) => sum + a.reserved_quantity,
        0
      );

      setAnalytics({
        totalRevenue,
        totalTicketsSold,
        totalOrders: uniqueOrderIds.size,
        activeAllocations: (allocationsData || []).filter((a) => {
          const remaining = a.allocated_quantity - a.used_quantity - a.reserved_quantity;
          return remaining > 0 && a.events.status === "published";
        }).length,
        pendingInvoiceAmount,
        totalAllocated,
        totalRemaining: totalAllocated - totalUsed - totalReserved,
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

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !group.has_passkey) {
      setPasskeyError("This group has not set up a passkey yet.");
      return;
    }

    if (!passkeyInput.trim()) {
      setPasskeyError("Please enter a passkey.");
      return;
    }

    setValidatingPasskey(true);
    setPasskeyError("");

    try {
      const { data, error } = await supabase.functions.invoke("validate-group-passkey", {
        body: {
          slug,
          passkey: passkeyInput,
        },
      });

      if (error) {
        console.error("Passkey validation error:", error);
        setPasskeyError("An error occurred. Please try again.");
        setPasskeyInput("");
        return;
      }

      if (!data?.success) {
        setPasskeyError(data?.error || "Incorrect passkey. Please try again.");
        setPasskeyInput("");
        return;
      }

      if (slug && data.sessionToken) {
        sessionStorage.setItem(`group_session_${slug}`, data.sessionToken);
      }
      setIsAuthenticated(true);
      setPasskeyError("");
    } catch (err) {
      console.error("Passkey validation exception:", err);
      setPasskeyError("An error occurred. Please try again.");
      setPasskeyInput("");
    } finally {
      setValidatingPasskey(false);
    }
  };

  const copyWidgetLink = () => {
    if (!group) return;
    const widgetUrl = `${window.location.origin}/group/${group.url_slug}/widget`;
    navigator.clipboard.writeText(widgetUrl);
    setCopiedWidget(true);
    toast({
      title: "Copied!",
      description: "Widget link copied to clipboard",
    });
    setTimeout(() => setCopiedWidget(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/30 to-background p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="pt-12 pb-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">{error ? "Error" : "Group Not Found"}</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {error || "The group you're looking for doesn't exist or has been deactivated."}
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="mt-4">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passkey Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/30 to-background p-4">
        <Card className="max-w-md w-full border-0 shadow-xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-primary/90 to-primary px-6 py-8 text-primary-foreground">
            <div className="flex items-center gap-4">
              {group.logo_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 ring-2 ring-white/20">
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                  <Users className="h-8 w-8 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <div className="flex items-center gap-2 mt-1 opacity-90">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Group Admin Portal</span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <form onSubmit={handlePasskeySubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="passkey" className="block text-sm font-medium">
                  Enter Your Passkey
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="passkey"
                    type="password"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="pl-10 font-mono text-lg tracking-widest text-center h-12"
                    autoFocus
                  />
                </div>
                {passkeyError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {passkeyError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={!passkeyInput || validatingPasskey}
              >
                {validatingPasskey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Access Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Contact your group administrator if you don't have the passkey
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Portal UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {group.logo_url ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{group.name}</h1>
                  <Badge variant="secondary" className="text-xs">
                    Admin Portal
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Powered by {group.organizations.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyWidgetLink}>
                {copiedWidget ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy Widget Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/group/${group.url_slug}/widget`)}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View Public Widget
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="promo-codes" className="gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Promo Codes</span>
              <span className="sm:hidden">Codes</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              <span>Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <Ticket className="h-4 w-4" />
              <span>Sales</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Analytics Cards */}
            {analytics && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-3xl font-bold mt-1">
                          ${analytics.totalRevenue.toFixed(0)}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      From {analytics.totalOrders} orders
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tickets Sold</p>
                        <p className="text-3xl font-bold mt-1 text-primary">
                          {analytics.totalTicketsSold}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Ticket className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress
                        value={
                          analytics.totalAllocated > 0
                            ? (analytics.totalTicketsSold / analytics.totalAllocated) * 100
                            : 0
                        }
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.totalRemaining} remaining
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Events</p>
                        <p className="text-3xl font-bold mt-1">{analytics.activeAllocations}</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">With available tickets</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Pending Invoices
                        </p>
                        <p
                          className={`text-3xl font-bold mt-1 ${analytics.pendingInvoiceAmount > 0 ? "text-orange-600" : ""}`}
                        >
                          ${analytics.pendingInvoiceAmount.toFixed(0)}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Awaiting payment</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                className="group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/group/${group.url_slug}/widget`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Share Ticket Widget</h3>
                        <p className="text-sm text-muted-foreground">
                          Your members can purchase tickets here
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab("promo-codes")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Tag className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Manage Promo Codes</h3>
                        <p className="text-sm text-muted-foreground">
                          Create discount codes for your members
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Allocations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Event Allocations</CardTitle>
                    <CardDescription>
                      Ticket inventory allocated to your group
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No allocations yet</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                      When the event organizer allocates tickets to your group, they will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {allocations.map((allocation) => {
                      const remaining =
                        allocation.allocated_quantity -
                        allocation.used_quantity -
                        allocation.reserved_quantity;
                      const usagePercent = Math.round(
                        (allocation.used_quantity / allocation.allocated_quantity) * 100
                      );
                      const isLowStock = remaining <= 5 && remaining > 0;
                      const isSoldOut = remaining === 0;

                      return (
                        <Card
                          key={allocation.id}
                          className={`overflow-hidden transition-all ${isSoldOut ? "opacity-60" : ""}`}
                        >
                          <div className="p-5 border-b bg-muted/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold truncate">
                                  {allocation.events.name}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{formatDate(allocation.events.event_date)}</span>
                                </div>
                                {allocation.events.venue && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">{allocation.events.venue}</span>
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant={isSoldOut ? "destructive" : isLowStock ? "secondary" : "default"}
                              >
                                {allocation.ticket_types.name}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-5 space-y-4">
                            {/* Progress */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Sales Progress</span>
                                <span className="font-medium">{usagePercent}%</span>
                              </div>
                              <Progress
                                value={usagePercent}
                                className={`h-2 ${isSoldOut ? "[&>div]:bg-destructive" : ""}`}
                              />
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                                <p className="text-xl font-bold">
                                  {allocation.allocated_quantity}
                                </p>
                                <p className="text-xs text-muted-foreground">Allocated</p>
                              </div>
                              <div className="space-y-1 p-2 rounded-lg bg-green-500/10">
                                <p className="text-xl font-bold text-green-600">
                                  {allocation.used_quantity}
                                </p>
                                <p className="text-xs text-muted-foreground">Sold</p>
                              </div>
                              <div
                                className={`space-y-1 p-2 rounded-lg ${isSoldOut ? "bg-destructive/10" : "bg-blue-500/10"}`}
                              >
                                <p
                                  className={`text-xl font-bold ${isSoldOut ? "text-destructive" : "text-blue-600"}`}
                                >
                                  {remaining}
                                </p>
                                <p className="text-xs text-muted-foreground">Left</p>
                              </div>
                            </div>

                            {/* Price info */}
                            <div className="flex items-center justify-between text-sm pt-2 border-t">
                              <span className="text-muted-foreground">Ticket Price</span>
                              <span className="font-semibold">
                                ${allocation.ticket_types.price.toFixed(2)}
                              </span>
                            </div>

                            {/* Warnings */}
                            {isLowStock && (
                              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-500/10 rounded-lg px-3 py-2">
                                <Clock className="h-4 w-4" />
                                <span>Only {remaining} tickets remaining</span>
                              </div>
                            )}
                            {isSoldOut && (
                              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                                <Ticket className="h-4 w-4" />
                                <span>Sold out</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No sales yet</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                      When members purchase tickets through your group, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sales.map((sale) => (
                      <Card key={sale.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold truncate">{sale.customer_name}</h4>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {sale.events.name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{sale.customer_email}</span>
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(sale.created_at)}
                                  </span>
                                </div>
                                {sale.promo_code_id && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs mt-1.5 bg-green-100 text-green-700"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    Used Promo Code
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xl font-bold">
                                ${sale.total_amount.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sale.order_items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                                {sale.order_items.reduce((sum, item) => sum + item.quantity, 0) ===
                                1
                                  ? "ticket"
                                  : "tickets"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
