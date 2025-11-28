import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Mail, Clock, Percent, Send, Eye, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AbandonedCartSettingsProps {
  eventId: string;
  enabled: boolean;
  delayMinutes: number;
  emailSubject: string;
  emailContent: string | null;
  discountEnabled: boolean;
  discountCode: string | null;
  discountPercent: number;
  onSave: (settings: AbandonedCartConfig) => void;
}

interface AbandonedCartConfig {
  abandoned_cart_enabled: boolean;
  abandoned_cart_delay_minutes: number;
  abandoned_cart_email_subject: string;
  abandoned_cart_email_content: string | null;
  abandoned_cart_discount_enabled: boolean;
  abandoned_cart_discount_code: string | null;
  abandoned_cart_discount_percent: number;
}

interface AbandonedCart {
  id: string;
  customer_email: string;
  customer_name: string | null;
  cart_total: number;
  cart_items: any[];
  status: string;
  emails_sent: number;
  created_at: string;
  recovered_at: string | null;
}

export const AbandonedCartSettings = ({
  eventId,
  enabled,
  delayMinutes,
  emailSubject,
  emailContent,
  discountEnabled,
  discountCode,
  discountPercent,
  onSave,
}: AbandonedCartSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AbandonedCartConfig>({
    abandoned_cart_enabled: enabled,
    abandoned_cart_delay_minutes: delayMinutes || 60,
    abandoned_cart_email_subject: emailSubject || "You left something behind!",
    abandoned_cart_email_content: emailContent || "",
    abandoned_cart_discount_enabled: discountEnabled,
    abandoned_cart_discount_code: discountCode || "",
    abandoned_cart_discount_percent: discountPercent || 10,
  });

  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [loadingCarts, setLoadingCarts] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    emailSent: 0,
    recovered: 0,
    recoveredValue: 0,
  });

  // Load abandoned carts for this event
  useEffect(() => {
    loadAbandonedCarts();
  }, [eventId]);

  const loadAbandonedCarts = async () => {
    setLoadingCarts(true);
    try {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setAbandonedCarts(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(c => c.status === "pending").length || 0;
      const emailSent = data?.filter(c => c.status === "email_sent").length || 0;
      const recovered = data?.filter(c => c.status === "recovered").length || 0;
      const recoveredValue = data?.filter(c => c.status === "recovered").reduce((sum, c) => sum + (c.cart_total || 0), 0) || 0;

      setStats({ total, pending, emailSent, recovered, recoveredValue });
    } catch (error) {
      console.error("Error loading abandoned carts:", error);
    } finally {
      setLoadingCarts(false);
    }
  };

  const handleSave = () => {
    onSave(settings);
    toast({
      title: "Settings Saved",
      description: "Abandoned cart recovery settings have been updated.",
    });
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      // Get current user's email for test
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("No user email found");
      }

      const { error } = await supabase.functions.invoke("send-abandoned-cart-email", {
        body: {
          test_mode: true,
          cart_id: abandonedCarts[0]?.id, // Use first cart as template
        },
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `A test recovery email has been sent to ${user.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "email_sent":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Mail className="h-3 w-3 mr-1" />Email Sent</Badge>;
      case "recovered":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Recovered</Badge>;
      case "expired":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Abandoned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.emailSent}</p>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.recovered}</p>
                <p className="text-xs text-muted-foreground">Recovered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">${stats.recoveredValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Revenue Recovered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recovery Settings
          </CardTitle>
          <CardDescription>
            Automatically send emails to customers who abandon their cart before completing purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Abandoned Cart Recovery</Label>
              <p className="text-sm text-muted-foreground">
                Send up to 3 reminder emails to customers who don't complete checkout
              </p>
            </div>
            <Switch
              checked={settings.abandoned_cart_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, abandoned_cart_enabled: checked })
              }
            />
          </div>

          {settings.abandoned_cart_enabled && (
            <>
              {/* Delay */}
              <div className="space-y-2">
                <Label>First Email Delay</Label>
                <Select
                  value={String(settings.abandoned_cart_delay_minutes)}
                  onValueChange={(value) =>
                    setSettings({ ...settings, abandoned_cart_delay_minutes: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long to wait before sending the first recovery email
                </p>
              </div>

              {/* Email Subject */}
              <div className="space-y-2">
                <Label>Email Subject Line</Label>
                <Input
                  value={settings.abandoned_cart_email_subject}
                  onChange={(e) =>
                    setSettings({ ...settings, abandoned_cart_email_subject: e.target.value })
                  }
                  placeholder="You left something behind!"
                />
              </div>

              {/* Additional Content */}
              <div className="space-y-2">
                <Label>Additional Message (Optional)</Label>
                <Textarea
                  value={settings.abandoned_cart_email_content || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, abandoned_cart_email_content: e.target.value })
                  }
                  placeholder="Add a personal message to encourage completion..."
                  rows={3}
                />
              </div>

              {/* Discount Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Include Discount in Follow-up Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Offer a discount in the 2nd and 3rd recovery emails to increase conversions
                    </p>
                  </div>
                  <Switch
                    checked={settings.abandoned_cart_discount_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, abandoned_cart_discount_enabled: checked })
                    }
                  />
                </div>

                {settings.abandoned_cart_discount_enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Discount Code</Label>
                      <Input
                        value={settings.abandoned_cart_discount_code || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, abandoned_cart_discount_code: e.target.value.toUpperCase() })
                        }
                        placeholder="COMEBACK10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a valid promo code for this event
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={settings.abandoned_cart_discount_percent}
                          onChange={(e) =>
                            setSettings({ ...settings, abandoned_cart_discount_percent: parseInt(e.target.value) || 10 })
                          }
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <Button onClick={handleSave}>
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={sendTestEmail}
                  disabled={sendingTestEmail || abandonedCarts.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingTestEmail ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Abandoned Carts List */}
      {settings.abandoned_cart_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Abandoned Carts
              </span>
              <Button variant="ghost" size="sm" onClick={loadAbandonedCarts}>
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCarts ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : abandonedCarts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No abandoned carts yet</p>
                <p className="text-sm">Carts will appear here when customers leave without completing purchase</p>
              </div>
            ) : (
              <div className="space-y-3">
                {abandonedCarts.slice(0, 10).map((cart) => (
                  <div
                    key={cart.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{cart.customer_email}</p>
                        <p className="text-sm text-muted-foreground">
                          {cart.customer_name || "No name"} • {cart.cart_items?.length || 0} items
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(cart.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${cart.cart_total?.toFixed(2) || "0.00"}</p>
                        {cart.emails_sent > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {cart.emails_sent} email{cart.emails_sent > 1 ? "s" : ""} sent
                          </p>
                        )}
                      </div>
                      {getStatusBadge(cart.status)}
                    </div>
                  </div>
                ))}
                {abandonedCarts.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Showing 10 of {abandonedCarts.length} abandoned carts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
