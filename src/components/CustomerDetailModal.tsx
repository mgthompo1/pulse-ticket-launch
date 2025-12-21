import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Calendar, DollarSign, Ticket, Heart, Tag, Send, CreditCard, FileText, Link as LinkIcon, Edit, Trash2, StickyNote, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ComposeEmailModal } from "@/components/ComposeEmailModal";
import { EditCustomerModal } from "@/components/EditCustomerModal";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  tags: string[] | null;
  organization_id: string;
  total_orders: number;
  total_spent: number;
  total_donations: number;
  lifetime_value: number;
  events_attended: number;
  last_order_date: string | null;
  created_at: string;
  payment_methods?: {
    stripe?: {
      customer_id: string;
      payment_method_id: string;
      last4: string;
      brand: string;
      exp_month: number;
      exp_year: number;
    };
    windcave?: {
      customer_id: string;
      token: string;
    };
  };
  membership?: {
    id: string;
    tier_name: string;
    tier_color: string;
    status: string;
    expires_at: string | null;
  } | null;
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

interface CRMEmail {
  id: string;
  subject: string;
  body_html: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  sender_name: string | null;
  created_at: string;
}

interface CustomerDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendEventLink?: () => void;
  onCreateCustomOrder?: () => void;
  onCreateInvoice?: () => void;
  onCustomerUpdated?: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  contact,
  open,
  onOpenChange,
  onSendEventLink,
  onCreateCustomOrder,
  onCreateInvoice,
  onCustomerUpdated,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<CRMEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [resendingReceipt, setResendingReceipt] = useState<string | null>(null);
  const [composeEmailOpen, setComposeEmailOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<CRMEmail | null>(null);
  const [emailDetailOpen, setEmailDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contact && open) {
      loadOrderHistory();
      loadEmailHistory();
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

  const loadEmailHistory = async () => {
    if (!contact) return;

    console.log("📧 Loading email history for contact:", contact.email);
    setLoadingEmails(true);
    try {
      const { data, error } = await supabase
        .from("crm_emails")
        .select("id, subject, body_html, status, sent_at, opened_at, clicked_at, sender_name, created_at")
        .eq("contact_id", contact.id)
        .eq("organization_id", contact.organization_id)
        .order("created_at", { ascending: false })
        .limit(20);

      console.log("📧 Email history result:", { data, error, count: data?.length, emails: data });

      if (error) {
        console.error("❌ Error loading emails:", error);
        throw error;
      }

      if (data) {
        setEmails(data);
      }
    } catch (error) {
      console.error("Error loading email history:", error);
    } finally {
      setLoadingEmails(false);
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

  const handleDeleteCustomer = async () => {
    if (!contact) return;

    setDeleting(true);
    try {
      // Delete the contact
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);

      if (error) throw error;

      toast({
        title: "Customer Deleted",
        description: `${contact.email} has been removed from your CRM`,
      });

      // Close the modal and refresh the parent
      onOpenChange(false);
      onCustomerUpdated?.();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
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
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{displayName}</DialogTitle>
              <DialogDescription>
                Customer since {new Date(contact.created_at).toLocaleDateString()}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                onClick={() => setEditCustomerOpen(true)}
                size="sm"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => setComposeEmailOpen(true)}
                size="sm"
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              {onSendEventLink && (
                <Button
                  onClick={() => {
                    onSendEventLink();
                    onOpenChange(false);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Send Event Link
                </Button>
              )}
              {onCreateCustomOrder && (
                <Button
                  onClick={() => {
                    onCreateCustomOrder();
                    onOpenChange(false);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Custom Order
                </Button>
              )}
              {onCreateInvoice && (
                <Button
                  onClick={() => {
                    onCreateInvoice();
                    onOpenChange(false);
                  }}
                  size="sm"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invoice
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information and Notes - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>

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

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contact.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes added</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Membership Status */}
          <Card className={contact.membership?.status === 'active' ? 'border-2' : ''} style={contact.membership?.status === 'active' ? { borderColor: contact.membership.tier_color } : {}}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" style={contact.membership?.status === 'active' ? { color: contact.membership.tier_color } : {}} />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.membership ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-sm px-3 py-1"
                        style={{
                          backgroundColor: contact.membership.tier_color + '20',
                          color: contact.membership.tier_color,
                          borderColor: contact.membership.tier_color + '40'
                        }}
                      >
                        <Crown className="h-3.5 w-3.5 mr-1.5" />
                        {contact.membership.tier_name}
                      </Badge>
                      <Badge variant={contact.membership.status === 'active' ? 'default' : 'secondary'}>
                        {contact.membership.status === 'active' ? 'Active' : contact.membership.status}
                      </Badge>
                    </div>
                  </div>
                  {contact.membership.expires_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {contact.membership.status === 'active' ? 'Renews' : 'Expired'}: {new Date(contact.membership.expires_at).toLocaleDateString('en-NZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Member pricing enabled</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Crown className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Not a member</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Membership can be added from the Members tab
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          {contact.payment_methods && (contact.payment_methods.stripe || contact.payment_methods.windcave) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Saved Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.payment_methods.stripe && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {contact.payment_methods.stripe.brand} •••• {contact.payment_methods.stripe.last4}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Expires {contact.payment_methods.stripe.exp_month}/{contact.payment_methods.stripe.exp_year}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Stripe</Badge>
                  </div>
                )}
                {contact.payment_methods.windcave && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          Card on file
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Token: {contact.payment_methods.windcave.token.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Windcave</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Email History */}
          <Card>
            <CardHeader>
              <CardTitle>Email History</CardTitle>
              <CardDescription>
                {emails.length} {emails.length === 1 ? 'email' : 'emails'} sent from CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEmails ? (
                <div className="text-center py-8 text-muted-foreground">Loading emails...</div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No emails sent yet</p>
                  <Button
                    onClick={() => setComposeEmailOpen(true)}
                    size="sm"
                    className="mt-3"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send First Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="border rounded-md p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEmail(email);
                        setEmailDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {email.subject}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {email.sent_at ? formatDate(email.sent_at) : formatDate(email.created_at)}
                            </div>
                            {email.sender_name && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {email.sender_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={
                              email.status === 'sent' || email.status === 'delivered'
                                ? 'default'
                                : email.status === 'failed' || email.status === 'bounced'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {email.status}
                          </Badge>
                          {email.opened_at && (
                            <Badge variant="outline" className="text-xs">
                              Opened
                            </Badge>
                          )}
                          {email.clicked_at && (
                            <Badge variant="outline" className="text-xs">
                              Clicked
                            </Badge>
                          )}
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

          {/* Danger Zone */}
          <Separator />
          <div className="pt-6 pb-2">
            <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-destructive mb-1">Delete Customer</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove this customer from your CRM. This action cannot be undone.
                  </p>
                </div>
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                  size="sm"
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Customer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        contact={contact}
        open={composeEmailOpen}
        onOpenChange={setComposeEmailOpen}
        onSuccess={() => {
          // Reload email history to show the newly sent email
          loadEmailHistory();
          toast({
            title: "Email Sent",
            description: `Email sent to ${contact.email}`,
          });
        }}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        contact={contact}
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        onSuccess={() => {
          onCustomerUpdated?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{contact.email}</strong> from your CRM.
              This action cannot be undone.
              {orders.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This customer has {orders.length} order{orders.length !== 1 ? 's' : ''} in your system.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Detail Modal */}
      <Dialog open={emailDetailOpen} onOpenChange={setEmailDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Details
            </DialogTitle>
            {selectedEmail && (
              <DialogDescription>
                Sent {selectedEmail.sent_at ? formatDate(selectedEmail.sent_at) : formatDate(selectedEmail.created_at)}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4">
              {/* Email Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">From</div>
                  <div className="text-sm">{selectedEmail.sender_name || 'System'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge
                    variant={
                      selectedEmail.status === 'sent' || selectedEmail.status === 'delivered'
                        ? 'default'
                        : selectedEmail.status === 'failed' || selectedEmail.status === 'bounced'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {selectedEmail.status}
                  </Badge>
                </div>
                {selectedEmail.opened_at && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Opened</div>
                    <div className="text-sm">{formatDate(selectedEmail.opened_at)}</div>
                  </div>
                )}
                {selectedEmail.clicked_at && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Clicked</div>
                    <div className="text-sm">{formatDate(selectedEmail.clicked_at)}</div>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Subject</div>
                <div className="text-base font-semibold">{selectedEmail.subject}</div>
              </div>

              <Separator />

              {/* Email Body */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Message</div>
                <div
                  className="prose prose-sm max-w-none p-4 bg-white border rounded-lg"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
