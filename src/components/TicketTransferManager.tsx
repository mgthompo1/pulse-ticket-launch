import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRightLeft,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TicketTransfer {
  id: string;
  ticket_id: string;
  from_email: string;
  to_email: string;
  to_name: string | null;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  transfer_fee: number;
  initiated_at: string;
  accepted_at: string | null;
  expires_at: string;
  ticket?: {
    ticket_number: string;
    ticket_type?: {
      name: string;
    };
  };
}

interface TransferSettings {
  transfers_enabled: boolean;
  transfer_deadline_hours: number;
  transfer_fee: number;
  transfer_fee_type: "none" | "fixed" | "percentage";
}

interface TicketTransferManagerProps {
  eventId: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export const TicketTransferManager = ({ eventId }: TicketTransferManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<TicketTransfer[]>([]);
  const [settings, setSettings] = useState<TransferSettings>({
    transfers_enabled: false,
    transfer_deadline_hours: 24,
    transfer_fee: 0,
    transfer_fee_type: "none",
  });
  const [saving, setSaving] = useState(false);

  const loadTransfers = useCallback(async () => {
    try {
      // Load settings
      const { data: eventData } = await supabase
        .from("events")
        .select("transfers_enabled, transfer_deadline_hours, transfer_fee, transfer_fee_type")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setSettings({
          transfers_enabled: eventData.transfers_enabled || false,
          transfer_deadline_hours: eventData.transfer_deadline_hours || 24,
          transfer_fee: eventData.transfer_fee || 0,
          transfer_fee_type: eventData.transfer_fee_type || "none",
        });
      }

      // Load transfers with ticket info
      const { data: transfersData, error } = await supabase
        .from("ticket_transfers")
        .select(`
          *,
          ticket:tickets (
            ticket_number,
            ticket_type:ticket_types (name)
          )
        `)
        .eq("ticket.event_id", eventId)
        .order("initiated_at", { ascending: false });

      if (error) throw error;
      setTransfers(transfersData || []);
    } catch (error) {
      console.error("Error loading transfers:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const updateSettings = async (updates: Partial<TransferSettings>) => {
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

  const cancelTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from("ticket_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);

      if (error) throw error;

      toast({ title: "Transfer cancelled" });
      loadTransfers();
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      toast({ title: "Error cancelling transfer", variant: "destructive" });
    }
  };

  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const acceptedCount = transfers.filter((t) => t.status === "accepted").length;
  const expiredCount = transfers.filter((t) => t.status === "expired").length;

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
            <ArrowRightLeft className="h-5 w-5" />
            Ticket Transfer Settings
          </CardTitle>
          <CardDescription>
            Allow attendees to transfer their tickets to someone else
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Transfers</Label>
              <p className="text-sm text-muted-foreground">
                Allow ticket holders to transfer their tickets
              </p>
            </div>
            <Switch
              checked={settings.transfers_enabled}
              onCheckedChange={(checked) => updateSettings({ transfers_enabled: checked })}
              disabled={saving}
            />
          </div>

          {settings.transfers_enabled && (
            <>
              <div className="space-y-2">
                <Label>Transfer Deadline (hours before event)</Label>
                <Input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.transfer_deadline_hours}
                  onChange={(e) => updateSettings({ transfer_deadline_hours: parseInt(e.target.value) || 24 })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Transfers must be completed this many hours before the event
                </p>
              </div>

              <div className="space-y-2">
                <Label>Transfer Fee</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.transfer_fee_type}
                    onValueChange={(value) => updateSettings({ transfer_fee_type: value as TransferSettings["transfer_fee_type"] })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Fee</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                  {settings.transfer_fee_type !== "none" && (
                    <Input
                      type="number"
                      min={0}
                      step={settings.transfer_fee_type === "percentage" ? 1 : 0.01}
                      value={settings.transfer_fee}
                      onChange={(e) => updateSettings({ transfer_fee: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                  )}
                  {settings.transfer_fee_type === "percentage" && (
                    <span className="text-muted-foreground self-center">%</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Charge a fee for processing transfers
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {settings.transfers_enabled && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{acceptedCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-500" />
                <span className="text-2xl font-bold">{expiredCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer History */}
      {settings.transfers_enabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transfer History</CardTitle>
              <CardDescription>
                {transfers.length} {transfers.length === 1 ? "transfer" : "transfers"} recorded
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadTransfers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transfers yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transfer.ticket?.ticket_number || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">
                            {transfer.ticket?.ticket_type?.name || "Unknown type"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{transfer.from_email}</TableCell>
                      <TableCell>
                        <div>
                          <p>{transfer.to_email}</p>
                          {transfer.to_name && (
                            <p className="text-xs text-muted-foreground">{transfer.to_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transfer.transfer_fee > 0 ? `$${transfer.transfer_fee.toFixed(2)}` : "Free"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[transfer.status]?.variant || "outline"}>
                          {STATUS_BADGES[transfer.status]?.label || transfer.status}
                        </Badge>
                        {transfer.status === "pending" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires {formatDistanceToNow(new Date(transfer.expires_at), { addSuffix: true })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(transfer.initiated_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {transfer.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelTransfer(transfer.id)}
                          >
                            Cancel
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
      )}
    </div>
  );
};
