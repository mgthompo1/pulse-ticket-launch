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
  ArrowUpCircle,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

interface UpgradePath {
  id: string;
  from_ticket_type_id: string;
  to_ticket_type_id: string;
  price_difference: number;
  upgrade_fee: number;
  is_active: boolean;
  from_ticket_type?: TicketType;
  to_ticket_type?: TicketType;
}

interface TicketUpgrade {
  id: string;
  ticket_id: string;
  from_ticket_type_id: string;
  to_ticket_type_id: string;
  price_difference: number;
  upgrade_fee: number;
  total_charged: number;
  status: "pending" | "completed" | "cancelled" | "failed";
  created_at: string;
  completed_at: string | null;
  ticket?: {
    ticket_number: string;
    attendee_email: string;
  };
  from_ticket_type?: TicketType;
  to_ticket_type?: TicketType;
}

interface UpgradeSettings {
  upgrades_enabled: boolean;
  upgrade_deadline_hours: number;
  upgrade_fee: number;
  upgrade_fee_type: "none" | "fixed" | "percentage";
}

interface TicketUpgradeManagerProps {
  eventId: string;
  ticketTypes: TicketType[];
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

export const TicketUpgradeManager = ({ eventId, ticketTypes }: TicketUpgradeManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [upgrades, setUpgrades] = useState<TicketUpgrade[]>([]);
  const [paths, setPaths] = useState<UpgradePath[]>([]);
  const [settings, setSettings] = useState<UpgradeSettings>({
    upgrades_enabled: false,
    upgrade_deadline_hours: 24,
    upgrade_fee: 0,
    upgrade_fee_type: "none",
  });
  const [saving, setSaving] = useState(false);
  const [showAddPathDialog, setShowAddPathDialog] = useState(false);
  const [newPath, setNewPath] = useState({
    from_ticket_type_id: "",
    to_ticket_type_id: "",
    upgrade_fee: 0,
  });

  const loadData = useCallback(async () => {
    try {
      // Load settings
      const { data: eventData } = await supabase
        .from("events")
        .select("upgrades_enabled, upgrade_deadline_hours, upgrade_fee, upgrade_fee_type")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setSettings({
          upgrades_enabled: eventData.upgrades_enabled || false,
          upgrade_deadline_hours: eventData.upgrade_deadline_hours || 24,
          upgrade_fee: eventData.upgrade_fee || 0,
          upgrade_fee_type: eventData.upgrade_fee_type || "none",
        });
      }

      // Load upgrade paths
      const { data: pathsData } = await supabase
        .from("ticket_upgrade_paths")
        .select(`
          *,
          from_ticket_type:ticket_types!ticket_upgrade_paths_from_ticket_type_id_fkey (id, name, price),
          to_ticket_type:ticket_types!ticket_upgrade_paths_to_ticket_type_id_fkey (id, name, price)
        `)
        .eq("event_id", eventId);

      setPaths(pathsData || []);

      // Load upgrade requests
      const { data: upgradesData, error } = await supabase
        .from("ticket_upgrades")
        .select(`
          *,
          ticket:tickets (ticket_number, attendee_email),
          from_ticket_type:ticket_types!ticket_upgrades_from_ticket_type_id_fkey (id, name, price),
          to_ticket_type:ticket_types!ticket_upgrades_to_ticket_type_id_fkey (id, name, price)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUpgrades(upgradesData || []);
    } catch (error) {
      console.error("Error loading upgrade data:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = async (updates: Partial<UpgradeSettings>) => {
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

  const addUpgradePath = async () => {
    if (!newPath.from_ticket_type_id || !newPath.to_ticket_type_id) {
      toast({ title: "Please select both ticket types", variant: "destructive" });
      return;
    }

    if (newPath.from_ticket_type_id === newPath.to_ticket_type_id) {
      toast({ title: "Cannot upgrade to the same ticket type", variant: "destructive" });
      return;
    }

    const fromType = ticketTypes.find((t) => t.id === newPath.from_ticket_type_id);
    const toType = ticketTypes.find((t) => t.id === newPath.to_ticket_type_id);

    if (!fromType || !toType) return;

    const priceDiff = toType.price - fromType.price;

    setSaving(true);
    try {
      const { error } = await supabase.from("ticket_upgrade_paths").insert({
        event_id: eventId,
        from_ticket_type_id: newPath.from_ticket_type_id,
        to_ticket_type_id: newPath.to_ticket_type_id,
        price_difference: priceDiff,
        upgrade_fee: newPath.upgrade_fee,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Upgrade path added" });
      setShowAddPathDialog(false);
      setNewPath({ from_ticket_type_id: "", to_ticket_type_id: "", upgrade_fee: 0 });
      loadData();
    } catch (error) {
      console.error("Error adding upgrade path:", error);
      toast({ title: "Error adding upgrade path", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePathStatus = async (pathId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("ticket_upgrade_paths")
        .update({ is_active: isActive })
        .eq("id", pathId);

      if (error) throw error;

      setPaths((prev) =>
        prev.map((p) => (p.id === pathId ? { ...p, is_active: isActive } : p))
      );
    } catch (error) {
      console.error("Error updating path:", error);
      toast({ title: "Error updating path", variant: "destructive" });
    }
  };

  const deletePath = async (pathId: string) => {
    try {
      const { error } = await supabase
        .from("ticket_upgrade_paths")
        .delete()
        .eq("id", pathId);

      if (error) throw error;

      toast({ title: "Upgrade path removed" });
      setPaths((prev) => prev.filter((p) => p.id !== pathId));
    } catch (error) {
      console.error("Error deleting path:", error);
      toast({ title: "Error deleting path", variant: "destructive" });
    }
  };

  const completedCount = upgrades.filter((u) => u.status === "completed").length;
  const totalRevenue = upgrades
    .filter((u) => u.status === "completed")
    .reduce((sum, u) => sum + u.total_charged, 0);

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
            <ArrowUpCircle className="h-5 w-5" />
            Ticket Upgrade Settings
          </CardTitle>
          <CardDescription>
            Allow attendees to upgrade their tickets to higher tiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Upgrades</Label>
              <p className="text-sm text-muted-foreground">
                Allow ticket holders to upgrade to premium tickets
              </p>
            </div>
            <Switch
              checked={settings.upgrades_enabled}
              onCheckedChange={(checked) => updateSettings({ upgrades_enabled: checked })}
              disabled={saving}
            />
          </div>

          {settings.upgrades_enabled && (
            <>
              <div className="space-y-2">
                <Label>Upgrade Deadline (hours before event)</Label>
                <Input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.upgrade_deadline_hours}
                  onChange={(e) => updateSettings({ upgrade_deadline_hours: parseInt(e.target.value) || 24 })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Upgrades must be completed this many hours before the event
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Upgrade Fee</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.upgrade_fee_type}
                    onValueChange={(value) => updateSettings({ upgrade_fee_type: value as UpgradeSettings["upgrade_fee_type"] })}
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
                  {settings.upgrade_fee_type !== "none" && (
                    <Input
                      type="number"
                      min={0}
                      step={settings.upgrade_fee_type === "percentage" ? 1 : 0.01}
                      value={settings.upgrade_fee}
                      onChange={(e) => updateSettings({ upgrade_fee: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                  )}
                  {settings.upgrade_fee_type === "percentage" && (
                    <span className="text-muted-foreground self-center">%</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Additional fee charged for processing upgrades (on top of price difference)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Paths */}
      {settings.upgrades_enabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upgrade Paths</CardTitle>
              <CardDescription>
                Define which ticket types can be upgraded to which
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddPathDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Path
            </Button>
          </CardHeader>
          <CardContent>
            {paths.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upgrade paths defined</p>
                <p className="text-sm">Add paths to allow ticket upgrades</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Price Diff</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paths.map((path) => (
                    <TableRow key={path.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{path.from_ticket_type?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            ${path.from_ticket_type?.price?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{path.to_ticket_type?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            ${path.to_ticket_type?.price?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>${path.price_difference.toFixed(2)}</TableCell>
                      <TableCell>
                        {path.upgrade_fee > 0 ? `$${path.upgrade_fee.toFixed(2)}` : "None"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={path.is_active}
                          onCheckedChange={(checked) => togglePathStatus(path.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePath(path.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {settings.upgrades_enabled && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-bold">
                  {upgrades.filter((u) => u.status === "pending").length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{completedCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">${totalRevenue.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Upgrade Revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade History */}
      {settings.upgrades_enabled && upgrades.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upgrade History</CardTitle>
              <CardDescription>
                {upgrades.length} {upgrades.length === 1 ? "upgrade" : "upgrades"} recorded
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Charged</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upgrades.map((upgrade) => (
                  <TableRow key={upgrade.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{upgrade.ticket?.ticket_number || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          {upgrade.ticket?.attendee_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{upgrade.from_ticket_type?.name || "Unknown"}</TableCell>
                    <TableCell>{upgrade.to_ticket_type?.name || "Unknown"}</TableCell>
                    <TableCell>${upgrade.total_charged.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGES[upgrade.status]?.variant || "outline"}>
                        {STATUS_BADGES[upgrade.status]?.label || upgrade.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(upgrade.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Path Dialog */}
      <Dialog open={showAddPathDialog} onOpenChange={setShowAddPathDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Upgrade Path</DialogTitle>
            <DialogDescription>
              Define which ticket type can be upgraded to which
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From Ticket Type</Label>
              <Select
                value={newPath.from_ticket_type_id}
                onValueChange={(value) => setNewPath((prev) => ({ ...prev, from_ticket_type_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket type" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} (${type.price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Ticket Type</Label>
              <Select
                value={newPath.to_ticket_type_id}
                onValueChange={(value) => setNewPath((prev) => ({ ...prev, to_ticket_type_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket type" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes
                    .filter((t) => t.id !== newPath.from_ticket_type_id)
                    .map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} (${type.price.toFixed(2)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {newPath.from_ticket_type_id && newPath.to_ticket_type_id && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  Price difference:{" "}
                  <span className="font-medium">
                    $
                    {(
                      (ticketTypes.find((t) => t.id === newPath.to_ticket_type_id)?.price || 0) -
                      (ticketTypes.find((t) => t.id === newPath.from_ticket_type_id)?.price || 0)
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Upgrade Fee</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPath.upgrade_fee}
                  onChange={(e) => setNewPath((prev) => ({ ...prev, upgrade_fee: parseFloat(e.target.value) || 0 }))}
                  className="w-32"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Extra fee on top of the price difference
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPathDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addUpgradePath} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Path
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
