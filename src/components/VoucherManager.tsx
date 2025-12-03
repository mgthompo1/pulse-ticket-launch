import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Gift,
  Ticket,
  DollarSign,
  Loader2,
  RefreshCw,
  Plus,
  MoreVertical,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Voucher {
  id: string;
  organization_id: string;
  code: string;
  voucher_type: "credit" | "percentage" | "free_ticket";
  value: number;
  remaining_value: number | null;
  max_uses: number | null;
  times_used: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  source_type: "manual" | "refund" | "compensation" | "promotion" | "referral";
  source_id: string | null;
  issued_to_email: string | null;
  notes: string | null;
  created_at: string;
  event_id: string | null;
}

interface VoucherUsage {
  id: string;
  voucher_id: string;
  order_id: string;
  amount_used: number;
  used_at: string;
  used_by_email: string | null;
}

interface VoucherManagerProps {
  organizationId: string;
  eventId?: string;
}

const TYPE_BADGES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  credit: { label: "Credit", icon: <DollarSign className="h-3 w-3" />, color: "bg-green-100 text-green-800" },
  percentage: { label: "Discount", icon: <Percent className="h-3 w-3" />, color: "bg-blue-100 text-blue-800" },
  free_ticket: { label: "Free Ticket", icon: <Ticket className="h-3 w-3" />, color: "bg-purple-100 text-purple-800" },
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  refund: "Refund",
  compensation: "Compensation",
  promotion: "Promotion",
  referral: "Referral",
};

export const VoucherManager = ({ organizationId, eventId }: VoucherManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [usageHistory, setUsageHistory] = useState<VoucherUsage[]>([]);
  const [newVoucher, setNewVoucher] = useState({
    code: "",
    voucher_type: "credit" as Voucher["voucher_type"],
    value: 0,
    max_uses: 1,
    issued_to_email: "",
    valid_until: "",
    notes: "",
    source_type: "manual" as Voucher["source_type"],
  });

  const loadVouchers = useCallback(async () => {
    try {
      let query = supabase
        .from("vouchers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.or(`event_id.eq.${eventId},event_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error("Error loading vouchers:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, eventId]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewVoucher((prev) => ({ ...prev, code }));
  };

  const createVoucher = async () => {
    if (!newVoucher.code || newVoucher.value <= 0) {
      toast({ title: "Code and value are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("vouchers").insert({
        organization_id: organizationId,
        event_id: eventId || null,
        code: newVoucher.code.toUpperCase(),
        voucher_type: newVoucher.voucher_type,
        value: newVoucher.value,
        remaining_value: newVoucher.voucher_type === "credit" ? newVoucher.value : null,
        max_uses: newVoucher.max_uses || null,
        issued_to_email: newVoucher.issued_to_email || null,
        valid_until: newVoucher.valid_until || null,
        notes: newVoucher.notes || null,
        source_type: newVoucher.source_type,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Voucher created" });
      setShowCreateDialog(false);
      setNewVoucher({
        code: "",
        voucher_type: "credit",
        value: 0,
        max_uses: 1,
        issued_to_email: "",
        valid_until: "",
        notes: "",
        source_type: "manual",
      });
      loadVouchers();
    } catch (error: any) {
      console.error("Error creating voucher:", error);
      if (error.code === "23505") {
        toast({ title: "A voucher with this code already exists", variant: "destructive" });
      } else {
        toast({ title: "Error creating voucher", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleVoucherStatus = async (voucherId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .update({ is_active: isActive })
        .eq("id", voucherId);

      if (error) throw error;

      setVouchers((prev) =>
        prev.map((v) => (v.id === voucherId ? { ...v, is_active: isActive } : v))
      );
      toast({ title: isActive ? "Voucher activated" : "Voucher deactivated" });
    } catch (error) {
      console.error("Error updating voucher:", error);
      toast({ title: "Error updating voucher", variant: "destructive" });
    }
  };

  const deleteVoucher = async (voucherId: string) => {
    try {
      const { error } = await supabase.from("vouchers").delete().eq("id", voucherId);

      if (error) throw error;

      toast({ title: "Voucher deleted" });
      setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
    } catch (error) {
      console.error("Error deleting voucher:", error);
      toast({ title: "Error deleting voucher", variant: "destructive" });
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Code copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy code", variant: "destructive" });
    }
  };

  const viewUsage = async (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    try {
      const { data, error } = await supabase
        .from("voucher_usage")
        .select("*")
        .eq("voucher_id", voucher.id)
        .order("used_at", { ascending: false });

      if (error) throw error;
      setUsageHistory(data || []);
      setShowUsageDialog(true);
    } catch (error) {
      console.error("Error loading usage:", error);
    }
  };

  const activeCount = vouchers.filter((v) => v.is_active).length;
  const totalValue = vouchers
    .filter((v) => v.is_active && v.voucher_type === "credit")
    .reduce((sum, v) => sum + (v.remaining_value || v.value), 0);
  const redeemedCount = vouchers.filter((v) => v.times_used > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">${totalValue.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Outstanding Credits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{redeemedCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Redeemed</p>
          </CardContent>
        </Card>
      </div>

      {/* Vouchers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Vouchers & Credits
            </CardTitle>
            <CardDescription>
              Manage discount codes, credits, and promotional vouchers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadVouchers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Voucher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vouchers created yet</p>
              <p className="text-sm">Create vouchers for promotions, refunds, or compensation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => {
                  const typeInfo = TYPE_BADGES[voucher.voucher_type];
                  const isExpired = voucher.valid_until && new Date(voucher.valid_until) < new Date();
                  const isFullyUsed = voucher.max_uses && voucher.times_used >= voucher.max_uses;

                  return (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono bg-muted px-2 py-1 rounded">
                            {voucher.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(voucher.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {voucher.issued_to_email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {voucher.issued_to_email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${typeInfo?.color || ""}`}>
                          {typeInfo?.icon}
                          {typeInfo?.label || voucher.voucher_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        {voucher.voucher_type === "percentage" ? (
                          `${voucher.value}%`
                        ) : voucher.voucher_type === "free_ticket" ? (
                          `${voucher.value} ticket${voucher.value > 1 ? "s" : ""}`
                        ) : (
                          <div>
                            <p>${voucher.value.toFixed(2)}</p>
                            {voucher.remaining_value !== null && voucher.remaining_value !== voucher.value && (
                              <p className="text-xs text-muted-foreground">
                                ${voucher.remaining_value.toFixed(2)} left
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => viewUsage(voucher)}
                        >
                          {voucher.times_used}
                          {voucher.max_uses && `/${voucher.max_uses}`}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[voucher.source_type] || voucher.source_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!voucher.is_active ? (
                          <Badge variant="outline">Inactive</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : isFullyUsed ? (
                          <Badge variant="secondary">Used Up</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {voucher.valid_until
                          ? format(new Date(voucher.valid_until), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyCode(voucher.code)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewUsage(voucher)}>
                              <Clock className="h-4 w-4 mr-2" />
                              View Usage
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleVoucherStatus(voucher.id, !voucher.is_active)}
                            >
                              {voucher.is_active ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {voucher.times_used === 0 && (
                              <DropdownMenuItem
                                onClick={() => deleteVoucher(voucher.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Voucher Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Voucher</DialogTitle>
            <DialogDescription>
              Create a new voucher or discount code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Voucher Code</Label>
              <div className="flex gap-2">
                <Input
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER2024"
                  className="font-mono"
                />
                <Button variant="outline" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newVoucher.voucher_type}
                  onValueChange={(value) => setNewVoucher((prev) => ({ ...prev, voucher_type: value as Voucher["voucher_type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Store Credit ($)</SelectItem>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="free_ticket">Free Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                <div className="flex items-center gap-2">
                  {newVoucher.voucher_type !== "percentage" && (
                    <span className="text-muted-foreground">
                      {newVoucher.voucher_type === "credit" ? "$" : ""}
                    </span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    step={newVoucher.voucher_type === "credit" ? 0.01 : 1}
                    value={newVoucher.value}
                    onChange={(e) => setNewVoucher((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  />
                  {newVoucher.voucher_type === "percentage" && (
                    <span className="text-muted-foreground">%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min={1}
                  value={newVoucher.max_uses}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, max_uses: parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={newVoucher.source_type}
                  onValueChange={(value) => setNewVoucher((prev) => ({ ...prev, source_type: value as Voucher["source_type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="compensation">Compensation</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Issue to Email (optional)</Label>
              <Input
                type="email"
                value={newVoucher.issued_to_email}
                onChange={(e) => setNewVoucher((prev) => ({ ...prev, issued_to_email: e.target.value }))}
                placeholder="customer@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Restrict voucher to a specific email address
              </p>
            </div>

            <div className="space-y-2">
              <Label>Expires On (optional)</Label>
              <Input
                type="date"
                value={newVoucher.valid_until}
                onChange={(e) => setNewVoucher((prev) => ({ ...prev, valid_until: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={newVoucher.notes}
                onChange={(e) => setNewVoucher((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes about this voucher..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createVoucher} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage History Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usage History</DialogTitle>
            <DialogDescription>
              {selectedVoucher && (
                <>
                  Voucher <code className="font-mono bg-muted px-2 py-0.5 rounded">{selectedVoucher.code}</code>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {usageHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                This voucher hasn't been used yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Used By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageHistory.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>{usage.used_by_email || "Unknown"}</TableCell>
                      <TableCell>${usage.amount_used.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(usage.used_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
