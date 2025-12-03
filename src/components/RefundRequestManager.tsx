import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  RotateCcw,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Gift,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RefundRequest {
  id: string;
  ticket_id: string;
  requested_by: string;
  reason_category: string;
  reason_details: string | null;
  amount: number;
  refund_type: "full" | "partial" | "voucher";
  status: "pending" | "approved" | "rejected" | "processed";
  processed_by: string | null;
  processed_at: string | null;
  admin_notes: string | null;
  voucher_id: string | null;
  created_at: string;
  ticket?: {
    ticket_number: string;
    attendee_email: string;
    ticket_type?: {
      name: string;
      price: number;
    };
  };
}

interface RefundSettings {
  refund_policy: "no_refunds" | "full_refund" | "deadline_based" | "tiered" | "request_only";
  refund_deadline_hours: number;
  refund_percentage: number;
  refund_to_voucher_enabled: boolean;
}

interface RefundRequestManagerProps {
  eventId: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  processed: { label: "Processed", variant: "default" },
};

const POLICY_LABELS: Record<string, string> = {
  no_refunds: "No Refunds",
  full_refund: "Full Refund Anytime",
  deadline_based: "Deadline Based",
  tiered: "Tiered Refund",
  request_only: "Request Only",
};

const REASON_CATEGORIES = [
  "cant_attend",
  "event_cancelled",
  "event_changed",
  "duplicate_purchase",
  "wrong_tickets",
  "other",
];

const REASON_LABELS: Record<string, string> = {
  cant_attend: "Can't Attend",
  event_cancelled: "Event Cancelled",
  event_changed: "Event Changed",
  duplicate_purchase: "Duplicate Purchase",
  wrong_tickets: "Wrong Tickets",
  other: "Other",
};

export const RefundRequestManager = ({ eventId }: RefundRequestManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [settings, setSettings] = useState<RefundSettings>({
    refund_policy: "request_only",
    refund_deadline_hours: 48,
    refund_percentage: 100,
    refund_to_voucher_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAction, setRefundAction] = useState<"approve" | "reject" | "voucher">("approve");

  const loadRequests = useCallback(async () => {
    try {
      // Load settings
      const { data: eventData } = await supabase
        .from("events")
        .select("refund_policy, refund_deadline_hours, refund_percentage, refund_to_voucher_enabled")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setSettings({
          refund_policy: eventData.refund_policy || "request_only",
          refund_deadline_hours: eventData.refund_deadline_hours || 48,
          refund_percentage: eventData.refund_percentage || 100,
          refund_to_voucher_enabled: eventData.refund_to_voucher_enabled !== false,
        });
      }

      // Load refund requests with ticket info
      const { data: requestsData, error } = await supabase
        .from("refund_requests")
        .select(`
          *,
          ticket:tickets (
            ticket_number,
            attendee_email,
            ticket_type:ticket_types (name, price)
          )
        `)
        .eq("ticket.event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error loading refund requests:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateSettings = async (updates: Partial<RefundSettings>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...updates }));
      toast({ title: "Settings updated" });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({ title: "Error updating settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const processRequest = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      const status = refundAction === "reject" ? "rejected" : "approved";
      const refundType = refundAction === "voucher" ? "voucher" : selectedRequest.refund_type;

      const { error } = await supabase
        .from("refund_requests")
        .update({
          status,
          refund_type: refundType,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // If approved with voucher, create the voucher
      if (refundAction === "voucher" && settings.refund_to_voucher_enabled) {
        const { data: org } = await supabase
          .from("events")
          .select("organization_id")
          .eq("id", eventId)
          .single();

        if (org) {
          await supabase.from("vouchers").insert({
            organization_id: org.organization_id,
            code: `REFUND-${selectedRequest.id.slice(0, 8).toUpperCase()}`,
            voucher_type: "credit",
            value: selectedRequest.amount,
            source_type: "refund",
            source_id: selectedRequest.id,
            issued_to_email: selectedRequest.requested_by,
          });
        }
      }

      toast({ title: `Refund request ${status}` });
      setProcessDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      loadRequests();
    } catch (error) {
      console.error("Error processing request:", error);
      toast({ title: "Error processing request", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved" || r.status === "processed").length;
  const totalRefunded = requests
    .filter((r) => r.status === "approved" || r.status === "processed")
    .reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Refund Policy Settings
          </CardTitle>
          <CardDescription>
            Configure how refunds are handled for this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Refund Policy</Label>
            <Select
              value={settings.refund_policy}
              onValueChange={(value) => updateSettings({ refund_policy: value as RefundSettings["refund_policy"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_refunds">No Refunds - All sales final</SelectItem>
                <SelectItem value="full_refund">Full Refund - Anytime before event</SelectItem>
                <SelectItem value="deadline_based">Deadline Based - Before cutoff date</SelectItem>
                <SelectItem value="tiered">Tiered - Decreasing refund over time</SelectItem>
                <SelectItem value="request_only">Request Only - Manual approval required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(settings.refund_policy === "deadline_based" || settings.refund_policy === "tiered") && (
            <div className="space-y-2">
              <Label>Refund Deadline (hours before event)</Label>
              <Input
                type="number"
                min={0}
                value={settings.refund_deadline_hours}
                onChange={(e) => updateSettings({ refund_deadline_hours: parseInt(e.target.value) || 48 })}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                {settings.refund_policy === "deadline_based"
                  ? "Full refunds available until this deadline"
                  : "After this deadline, no refunds available"}
              </p>
            </div>
          )}

          {settings.refund_policy === "tiered" && (
            <div className="space-y-2">
              <Label>Refund Percentage After Deadline</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.refund_percentage}
                  onChange={(e) => updateSettings({ refund_percentage: parseInt(e.target.value) || 50 })}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Percentage of ticket price refundable after the deadline passes
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label>Refund to Voucher Option</Label>
              <p className="text-sm text-muted-foreground">
                Offer customers store credit instead of cash refunds
              </p>
            </div>
            <Switch
              checked={settings.refund_to_voucher_enabled}
              onCheckedChange={(checked) => updateSettings({ refund_to_voucher_enabled: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{approvedCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">${totalRefunded.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Refunded</p>
          </CardContent>
        </Card>
      </div>

      {/* Refund Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Refund Requests</CardTitle>
            <CardDescription>
              {requests.length} {requests.length === 1 ? "request" : "requests"} total
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No refund requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.ticket?.ticket_number || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.ticket?.ticket_type?.name || "Unknown"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{request.requested_by}</TableCell>
                    <TableCell>
                      <div>
                        <p>{REASON_LABELS[request.reason_category] || request.reason_category}</p>
                        {request.reason_details && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {request.reason_details}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${request.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGES[request.status]?.variant || "outline"}>
                        {STATUS_BADGES[request.status]?.label || request.status}
                      </Badge>
                      {request.refund_type === "voucher" && request.status !== "pending" && (
                        <div className="flex items-center gap-1 mt-1">
                          <Gift className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-muted-foreground">As voucher</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setProcessDialogOpen(true);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund Request</DialogTitle>
            <DialogDescription>
              Review and process this refund request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ticket</p>
                  <p className="font-medium">{selectedRequest.ticket?.ticket_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">${selectedRequest.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">
                    {REASON_LABELS[selectedRequest.reason_category] || selectedRequest.reason_category}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.requested_by}</p>
                </div>
              </div>

              {selectedRequest.reason_details && (
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRequest.reason_details}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={refundAction} onValueChange={(v) => setRefundAction(v as typeof refundAction)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Approve Full Refund
                      </div>
                    </SelectItem>
                    {settings.refund_to_voucher_enabled && (
                      <SelectItem value="voucher">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Refund as Voucher
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="reject">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Reject Request
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processRequest} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {refundAction === "reject" ? "Reject" : "Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
