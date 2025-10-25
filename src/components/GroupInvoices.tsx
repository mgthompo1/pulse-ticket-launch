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
} from "lucide-react";
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
  events: {
    name: string;
  };
}

export const GroupInvoices: React.FC<GroupInvoicesProps> = ({
  groupId,
  groupName,
  organizationId,
}) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    eventId: "",
    periodStart: "",
    periodEnd: "",
    dueDate: "",
  });

  const [availableEvents, setAvailableEvents] = useState<Array<{ id: string; name: string }>>([]);

  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    paidDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadInvoices();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

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
      // Call edge function to generate invoice
      const { data, error } = await supabase.functions.invoke('generate-group-invoice', {
        body: {
          groupId,
          eventId: generateForm.eventId,
          periodStart: generateForm.periodStart,
          periodEnd: generateForm.periodEnd,
          dueDate: generateForm.dueDate || null,
        }
      });

      if (error) throw error;

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
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          groupId,
        }
      });

      if (error) throw error;

      // Update invoice status
      await supabase
        .from("group_invoices")
        .update({ status: 'sent' })
        .eq("id", invoice.id);

      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });

      loadInvoices();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Info",
        description: "Email functionality not yet configured",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    type LucideIcon = typeof Clock;
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

    const statusConfig: Record<string, { variant: BadgeVariant; icon: LucideIcon; label: string }> = {
      draft: { variant: "secondary", icon: Clock, label: "Draft" },
      sent: { variant: "default", icon: Send, label: "Sent" },
      viewed: { variant: "default", icon: FileText, label: "Viewed" },
      partial: { variant: "default", icon: DollarSign, label: "Partial" },
      paid: { variant: "default", icon: CheckCircle, label: "Paid" },
      overdue: { variant: "destructive", icon: AlertCircle, label: "Overdue" },
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
          <h3 className="text-xl font-bold">Invoices</h3>
          <p className="text-muted-foreground">
            Manage invoices for {groupName}
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Invoice
        </Button>
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
                  Generate invoices to bill this group for discounted tickets
                </p>
              </div>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate First Invoice
              </Button>
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
                      <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendInvoice(invoice)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                        {invoice.status !== 'paid' && (
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
                  <SelectItem value="">All events</SelectItem>
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
