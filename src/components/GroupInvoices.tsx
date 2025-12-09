import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  XCircle,
  MoreVertical,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupInvoicesProps {
  groupId: string;
  groupName: string;
  organizationId: string;
  readOnly?: boolean; // Set to true when viewed by group (not master org)
}

interface Invoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_tickets_sold: number;
  total_revenue: number;
  total_discounts_given: number;
  amount_owed: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  payment_link: string | null;
  events: {
    name: string;
  };
}

export const GroupInvoices: React.FC<GroupInvoicesProps> = ({
  groupId,
  groupName,
  organizationId,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    eventId: "all",
    periodStart: "",
    periodEnd: "",
    dueDate: "",
  });

  const [availableEvents, setAvailableEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [autoInvoiceFrequency, setAutoInvoiceFrequency] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    paidDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadInvoices();
    loadEvents();
    loadAutoInvoiceSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadAutoInvoiceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("group_auto_invoice_frequency")
        .eq("id", organizationId)
        .single();

      if (!error && data) {
        setAutoInvoiceFrequency(data.group_auto_invoice_frequency);
      }
    } catch (error) {
      console.error("Error loading auto-invoice settings:", error);
    }
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Daily",
    "3_days": "Every 3 Days",
    weekly: "Weekly",
    biweekly: "Every 2 Weeks",
    monthly: "Monthly",
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("group_ticket_allocations")
        .select("event_id, events(id, name)")
        .eq("group_id", groupId);

      if (error) throw error;

      // Get unique events
      interface InvoiceEvent {
        events: {
          id: string;
          name: string;
        };
      }

      const uniqueEvents = Array.from(
        new Map(
          data?.map((item: InvoiceEvent) => [item.events.id, { id: item.events.id, name: item.events.name }])
        ).values()
      );

      setAvailableEvents(uniqueEvents as Array<{ id: string; name: string }>);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_invoices")
        .select(`
          *,
          events (
            name
          )
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data as Invoice[] || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!generateForm.eventId || !generateForm.periodStart || !generateForm.periodEnd) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      console.log('Generating invoice with params:', {
        groupId,
        eventId: generateForm.eventId === 'all' ? null : generateForm.eventId,
        periodStart: generateForm.periodStart,
        periodEnd: generateForm.periodEnd,
        dueDate: generateForm.dueDate || null,
      });

      // Call edge function to generate invoice
      const { data, error } = await supabase.functions.invoke('generate-group-invoice', {
        body: {
          groupId,
          eventId: generateForm.eventId === 'all' ? null : generateForm.eventId,
          periodStart: generateForm.periodStart,
          periodEnd: generateForm.periodEnd,
          dueDate: generateForm.dueDate || null,
        }
      });

      console.log('Invoice generation response:', { data, error });

      if (error) {
        // Try to extract the actual error message from the response body
        let errorMessage = "Failed to generate invoice";

        if ((error as any).context) {
          try {
            const responseBody = await (error as any).context.json();
            console.log('Error response body:', responseBody);
            errorMessage = responseBody.error || responseBody.message || errorMessage;
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
        }

        if (!errorMessage || errorMessage === "Failed to generate invoice") {
          errorMessage = data?.error || error.message || errorMessage;
        }

        throw new Error(errorMessage);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to generate invoice");
      }

      toast({
        title: "Success",
        description: `Invoice ${data.invoice_number} generated successfully`,
      });

      setShowGenerateDialog(false);
      setGenerateForm({
        eventId: "",
        periodStart: "",
        periodEnd: "",
        dueDate: "",
      });
      loadInvoices();
    } catch (error) {
      console.error("Error generating invoice:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate invoice";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice || !paymentForm.amountPaid) {
      toast({
        title: "Validation Error",
        description: "Please enter payment amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amountPaid = parseFloat(paymentForm.amountPaid);
      const newTotalPaid = selectedInvoice.amount_paid + amountPaid;
      const newStatus = newTotalPaid >= selectedInvoice.amount_owed ? 'paid' : 'partial';

      const { error } = await supabase
        .from("group_invoices")
        .update({
          amount_paid: newTotalPaid,
          status: newStatus,
          paid_date: newStatus === 'paid' ? paymentForm.paidDate : null,
        })
        .eq("id", selectedInvoice.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      setPaymentForm({
        amountPaid: "",
        paidDate: new Date().toISOString().split('T')[0],
      });
      loadInvoices();
    } catch (error) {
      console.error("Error recording payment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to record payment";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-group-invoice-email', {
        body: {
          invoiceId: invoice.id,
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to send invoice");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send invoice");
      }

      toast({
        title: "Success",
        description: `Invoice sent to ${data.recipient}`,
      });

      loadInvoices();
    } catch (error) {
      console.error("Error sending invoice:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send invoice";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to cancel invoice ${invoice.invoice_number}? This action cannot be undone.`)) {
      return;
    }

    // Don't allow cancelling paid invoices
    if (invoice.status === "paid") {
      toast({
        title: "Cannot Cancel",
        description: "Cannot cancel a paid invoice. Refund the payment first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("group_invoices")
        .update({
          status: "cancelled",
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log the cancellation
      await supabase.from("group_activity_log").insert({
        group_id: groupId,
        action: "invoice_cancelled",
        entity_type: "invoice",
        entity_id: invoice.id,
        metadata: {
          invoice_number: invoice.invoice_number,
          amount_owed: invoice.amount_owed,
        },
      });

      toast({
        title: "Invoice Cancelled",
        description: `Invoice ${invoice.invoice_number} has been cancelled`,
      });

      loadInvoices();
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invoice",
        variant: "destructive",
      });
    }
  };

  const handleViewPDF = (invoice: Invoice) => {
    // Create a printable invoice view
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to view the invoice PDF",
        variant: "destructive",
      });
      return;
    }

    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #000; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; border: 1px solid #dee2e6; text-align: left; }
    th { background-color: #f8f9fa; }
    .header { background-color: #f8f9fa; padding: 20px; margin-bottom: 20px; }
    .total-row { background-color: #fff3cd; font-weight: bold; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Group Ticket Invoice</h1>
    <p>Invoice #${invoice.invoice_number}</p>
    <p>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
  </div>

  <h2>Bill To:</h2>
  <p><strong>${groupName}</strong></p>

  <table>
    <tr>
      <th>Event</th>
      <td>${invoice.events.name}</td>
    </tr>
    <tr>
      <th>Billing Period</th>
      <td>${new Date(invoice.billing_period_start).toLocaleDateString()} - ${new Date(invoice.billing_period_end).toLocaleDateString()}</td>
    </tr>
    <tr>
      <th>Tickets Sold</th>
      <td>${invoice.total_tickets_sold}</td>
    </tr>
    <tr>
      <th>Total Revenue</th>
      <td>$${invoice.total_revenue.toFixed(2)}</td>
    </tr>
    <tr>
      <th>Discounts Given</th>
      <td>$${invoice.total_discounts_given.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <th>Amount Owed</th>
      <td>$${invoice.amount_owed.toFixed(2)}</td>
    </tr>
    ${invoice.due_date ? `
    <tr>
      <th>Due Date</th>
      <td style="color: #dc3545;">${new Date(invoice.due_date).toLocaleDateString()}</td>
    </tr>
    ` : ''}
  </table>

  ${invoice.payment_link ? `
  <div style="background-color: #d1ecf1; padding: 15px; margin: 20px 0;">
    <p><strong>Pay Online:</strong></p>
    <p>Visit this link to pay: ${invoice.payment_link}</p>
  </div>
  ` : ''}

  <div class="no-print" style="margin-top: 30px;">
    <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Print Invoice
    </button>
    <button onclick="window.close()" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
      Close
    </button>
  </div>
</body>
</html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    type LucideIcon = typeof Clock;
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

    // For groups (readOnly), show simplified statuses
    if (readOnly) {
      if (status === "paid") {
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            PAID
          </Badge>
        );
      } else {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            UNPAID
          </Badge>
        );
      }
    }

    // For org admins, show detailed statuses
    const statusConfig: Record<string, { variant: BadgeVariant; icon: LucideIcon; label: string }> = {
      draft: { variant: "secondary", icon: Clock, label: "Draft" },
      sent: { variant: "default", icon: Send, label: "Sent" },
      viewed: { variant: "default", icon: FileText, label: "Viewed" },
      partial: { variant: "default", icon: DollarSign, label: "Partial" },
      paid: { variant: "default", icon: CheckCircle, label: "Paid" },
      overdue: { variant: "destructive", icon: AlertCircle, label: "Overdue" },
      pending: { variant: "default", icon: Clock, label: "Pending" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">Invoices</h3>
            {autoInvoiceFrequency && !readOnly && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <Zap className="h-3 w-3" />
                Auto: {frequencyLabels[autoInvoiceFrequency] || autoInvoiceFrequency}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {readOnly ? `Invoices for ${groupName}` : `Manage invoices for ${groupName}`}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading invoices...</p>
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3 py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Invoices Yet</h3>
                <p className="text-muted-foreground">
                  {readOnly
                    ? "No invoices have been generated for your group yet."
                    : "Generate invoices to bill this group for discounted tickets"}
                </p>
              </div>
              {!readOnly && (
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate First Invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              All invoices for {groupName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Amount Owed</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.events.name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(invoice.billing_period_start).toLocaleDateString()} -<br />
                      {new Date(invoice.billing_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{invoice.total_tickets_sold}</TableCell>
                    <TableCell className="font-semibold">
                      ${invoice.amount_owed.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      ${invoice.amount_paid.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPDF(invoice)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View PDF
                          </Button>
                          {!readOnly && invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendInvoice(invoice)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {!readOnly && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Record Payment
                            </Button>
                          )}
                          {!readOnly && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCancelInvoice(invoice)}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        {invoice.payment_link && (
                          <a
                            href={invoice.payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Payment Link
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Generate Invoice Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice for discounted tickets sold during a specific period
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event">Event (Optional)</Label>
              <Select
                value={generateForm.eventId}
                onValueChange={(value) =>
                  setGenerateForm((prev) => ({ ...prev, eventId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {availableEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to include all events
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodStart">Billing Period Start *</Label>
              <Input
                id="periodStart"
                type="date"
                value={generateForm.periodStart}
                onChange={(e) =>
                  setGenerateForm((prev) => ({ ...prev, periodStart: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodEnd">Billing Period End *</Label>
              <Input
                id="periodEnd"
                type="date"
                value={generateForm.periodEnd}
                onChange={(e) =>
                  setGenerateForm((prev) => ({ ...prev, periodEnd: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={generateForm.dueDate}
                onChange={(e) =>
                  setGenerateForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateInvoice} disabled={generating}>
              {generating ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Owed:</span>
                  <span className="font-semibold">${selectedInvoice.amount_owed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="text-green-600">${selectedInvoice.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Remaining:</span>
                  <span className="text-destructive">
                    ${(selectedInvoice.amount_owed - selectedInvoice.amount_paid).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Payment Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amountPaid}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, amountPaid: e.target.value }))
                    }
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidDate">Payment Date *</Label>
                <Input
                  id="paidDate"
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, paidDate: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                setSelectedInvoice(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupInvoices;
