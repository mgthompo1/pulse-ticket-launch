import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, DollarSign, Mail, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface RecoveryAnalyticsProps {
  eventId: string;
}

interface AbandonedCart {
  id: string;
  customer_email: string;
  customer_name: string | null;
  cart_total: number;
  status: string;
  emails_sent: number;
  created_at: string;
  recovered_at: string | null;
  device_type: string | null;
}

interface RecoveryStats {
  totalAbandoned: number;
  totalRecovered: number;
  recoveryRate: number;
  totalAbandonedValue: number;
  totalRecoveredValue: number;
  emailsSent: number;
  pendingCarts: number;
}

export const RecoveryAnalytics: React.FC<RecoveryAnalyticsProps> = ({ eventId }) => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecoveryData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("abandoned_carts")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const cartsData = data || [];
        setCarts(cartsData);

        // Calculate stats
        const totalAbandoned = cartsData.length;
        const recovered = cartsData.filter(c => c.status === "recovered");
        const totalRecovered = recovered.length;
        const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;
        const totalAbandonedValue = cartsData.reduce((sum, c) => sum + (c.cart_total || 0), 0);
        const totalRecoveredValue = recovered.reduce((sum, c) => sum + (c.cart_total || 0), 0);
        const emailsSent = cartsData.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
        const pendingCarts = cartsData.filter(c => c.status === "pending" || c.status === "email_sent").length;

        setStats({
          totalAbandoned,
          totalRecovered,
          recoveryRate,
          totalAbandonedValue,
          totalRecoveredValue,
          emailsSent,
          pendingCarts,
        });
      } catch (err) {
        console.error("Error loading recovery data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadRecoveryData();
    }
  }, [eventId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recovered":
        return <Badge className="bg-green-500">Recovered</Badge>;
      case "email_sent":
        return <Badge className="bg-blue-500">Email Sent</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats || stats.totalAbandoned === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No abandoned cart data available for this event yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recovery Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Carts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAbandoned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalRecovered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recoveryRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAbandonedValue.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovered Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalRecoveredValue.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsSent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Recovery */}
      {stats.pendingCarts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-orange-700">
                {stats.pendingCarts} cart{stats.pendingCarts !== 1 ? 's' : ''} pending recovery
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abandoned Carts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Abandoned Cart Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cart Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emails Sent</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Recovered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map((cart) => (
                  <TableRow key={cart.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cart.customer_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{cart.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">${cart.cart_total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(cart.status)}</TableCell>
                    <TableCell>{cart.emails_sent}</TableCell>
                    <TableCell className="capitalize">{cart.device_type || "-"}</TableCell>
                    <TableCell>{format(new Date(cart.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      {cart.recovered_at
                        ? format(new Date(cart.recovered_at), "MMM d, HH:mm")
                        : "-"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
