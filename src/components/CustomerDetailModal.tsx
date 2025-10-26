import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Calendar, DollarSign, Ticket, Heart, Tag, Send, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[] | null;
  total_orders: number;
  total_spent: number;
  total_donations: number;
  lifetime_value: number;
  events_attended: number;
  last_order_date: string | null;
  created_at: string;
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  donation_amount: number;
  stripe_session_id: string | null;
  windcave_session_id: string | null;
  events: {
    name: string;
    event_date: string;
  };
}

interface CustomerDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  contact,
  open,
  onOpenChange,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (contact && open) {
      loadOrderHistory();
    }
  }, [contact, open]);

  const loadOrderHistory = async () => {
    if (!contact) return;

    console.log("🔍 Loading orders for contact:", contact.email);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          created_at,
          status,
          donation_amount,
          stripe_session_id,
          windcave_session_id,
          events!inner (
            name,
            event_date,
            organization_id
          )
        `)
        .eq("customer_email", contact.email)
        .eq("events.organization_id", contact.organization_id)
        .in("status", ["paid", "completed"])
        .order("created_at", { ascending: false });

      console.log("🔍 Orders query result:", { data, error, count: data?.length });

      if (error) throw error;

      if (data) {
        setOrders(data as any);
      }
    } catch (error) {
      console.error("Error loading order history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendReceipt = async (order: Order) => {
    setResendingReceipt(order.id);
    try {
      const { error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          orderId: order.id,
          customerEmail: contact?.email,
          customerName: contact?.full_name || contact?.email,
          eventName: (order.events as any)?.name,
          totalAmount: order.total_amount,
          paymentDate: order.created_at,
        }
      });

      if (error) throw error;

      toast({
        title: "Receipt Sent",
        description: `Receipt emailed to ${contact?.email}`,
      });
    } catch (error) {
      console.error("Error sending receipt:", error);
      toast({
        title: "Error",
        description: "Failed to send receipt email",
        variant: "destructive"
      });
    } finally {
      setResendingReceipt(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!contact) return null;

  const displayName = contact.full_name ||
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
    contact.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{displayName}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {contact.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.phone}</span>
                </div>
              )}

              {(contact.city || contact.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {contact.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Lifetime Value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(contact.lifetime_value)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Ticket className="h-4 w-4" />
                  Total Orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contact.total_orders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  Donations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(contact.total_donations)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Events Attended
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contact.events_attended}</div>
              </CardContent>
            </Card>
          </div>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                {contact.total_orders} {contact.total_orders === 1 ? 'order' : 'orders'} • Last order: {contact.last_order_date ? formatDate(contact.last_order_date) : 'Never'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders found</div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-md p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {(order.events as any)?.name || 'Event'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(order.created_at)}
                            </div>
                            {(order.stripe_session_id || order.windcave_session_id) && (
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {order.stripe_session_id ? 'Stripe' : 'Windcave'}
                              </div>
                            )}
                            {order.donation_amount > 0 && (
                              <div className="flex items-center gap-1 text-pink-600">
                                <Heart className="h-3 w-3" />
                                +{formatCurrency(order.donation_amount)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(order.total_amount)}
                            </div>
                            <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendReceipt(order);
                            }}
                            disabled={resendingReceipt === order.id}
                            className="h-8"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Since */}
          <div className="text-sm text-muted-foreground text-center pb-2">
            Customer since {new Date(contact.created_at).toLocaleDateString('en-NZ', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
