import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  Clock,
  Mail,
  MoreVertical,
  Send,
  Trash2,
  UserPlus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface WaitlistEntry {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  email: string;
  name: string;
  phone: string | null;
  quantity: number;
  status: "waiting" | "offered" | "converted" | "expired" | "cancelled";
  offer_sent_at: string | null;
  offer_expires_at: string | null;
  position: number | null;
  created_at: string;
}

interface WaitlistSettings {
  waitlist_enabled: boolean;
  waitlist_message: string | null;
  waitlist_offer_hours: number;
  waitlist_auto_offer: boolean;
}

interface WaitlistManagerProps {
  eventId: string;
  ticketTypes: { id: string; name: string; quantity_available: number; quantity_sold: number }[];
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting: { label: "Waiting", variant: "secondary" },
  offered: { label: "Offer Sent", variant: "default" },
  converted: { label: "Purchased", variant: "default" },
  expired: { label: "Expired", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export const WaitlistManager = ({ eventId, ticketTypes }: WaitlistManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [settings, setSettings] = useState<WaitlistSettings>({
    waitlist_enabled: false,
    waitlist_message: null,
    waitlist_offer_hours: 24,
    waitlist_auto_offer: true,
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: "", email: "", phone: "", quantity: 1 });
  const [saving, setSaving] = useState(false);

  const loadWaitlist = useCallback(async () => {
    try {
      // Load settings
      const { data: eventData } = await supabase
        .from("events")
        .select("waitlist_enabled, waitlist_message, waitlist_offer_hours, waitlist_auto_offer")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setSettings({
          waitlist_enabled: eventData.waitlist_enabled || false,
          waitlist_message: eventData.waitlist_message,
          waitlist_offer_hours: eventData.waitlist_offer_hours || 24,
          waitlist_auto_offer: eventData.waitlist_auto_offer !== false,
        });
      }

      // Load entries
      const { data: entriesData, error } = await supabase
        .from("waitlist_entries")
        .select("*")
        .eq("event_id", eventId)
        .order("position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setEntries(entriesData || []);
    } catch (error) {
      console.error("Error loading waitlist:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const updateSettings = async (updates: Partial<WaitlistSettings>) => {
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

  const addToWaitlist = async () => {
    if (!newEntry.name || !newEntry.email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get next position
      const maxPosition = entries.length > 0
        ? Math.max(...entries.filter(e => e.position).map(e => e.position || 0))
        : 0;

      const { error } = await supabase.from("waitlist_entries").insert({
        event_id: eventId,
        name: newEntry.name,
        email: newEntry.email,
        phone: newEntry.phone || null,
        quantity: newEntry.quantity,
        status: "waiting",
        position: maxPosition + 1,
      });

      if (error) throw error;

      toast({ title: "Added to waitlist" });
      setShowAddDialog(false);
      setNewEntry({ name: "", email: "", phone: "", quantity: 1 });
      loadWaitlist();
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      toast({ title: "Error adding to waitlist", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendOffer = async (entryId: string) => {
    setSaving(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + settings.waitlist_offer_hours);

      const { error } = await supabase
        .from("waitlist_entries")
        .update({
          status: "offered",
          offer_sent_at: new Date().toISOString(),
          offer_expires_at: expiresAt.toISOString(),
          offer_token: crypto.randomUUID(),
        })
        .eq("id", entryId);

      if (error) throw error;

      toast({ title: "Offer sent successfully" });
      loadWaitlist();
    } catch (error) {
      console.error("Error sending offer:", error);
      toast({ title: "Error sending offer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({ title: "Entry removed" });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error("Error removing entry:", error);
      toast({ title: "Error removing entry", variant: "destructive" });
    }
  };

  const waitingCount = entries.filter((e) => e.status === "waiting").length;
  const offeredCount = entries.filter((e) => e.status === "offered").length;
  const convertedCount = entries.filter((e) => e.status === "converted").length;

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
            <Users className="h-5 w-5" />
            Waitlist Settings
          </CardTitle>
          <CardDescription>
            Configure how the waitlist works when tickets sell out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Waitlist</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to join a waitlist when tickets are sold out
              </p>
            </div>
            <Switch
              checked={settings.waitlist_enabled}
              onCheckedChange={(checked) => updateSettings({ waitlist_enabled: checked })}
              disabled={saving}
            />
          </div>

          {settings.waitlist_enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Offer Tickets</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send offers when tickets become available
                  </p>
                </div>
                <Switch
                  checked={settings.waitlist_auto_offer}
                  onCheckedChange={(checked) => updateSettings({ waitlist_auto_offer: checked })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Offer Expiry (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.waitlist_offer_hours}
                  onChange={(e) => updateSettings({ waitlist_offer_hours: parseInt(e.target.value) || 24 })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  How long customers have to accept a waitlist offer
                </p>
              </div>

              <div className="space-y-2">
                <Label>Waitlist Message</Label>
                <Textarea
                  placeholder="Custom message shown to customers joining the waitlist..."
                  value={settings.waitlist_message || ""}
                  onChange={(e) => updateSettings({ waitlist_message: e.target.value || null })}
                  rows={3}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {settings.waitlist_enabled && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-bold">{waitingCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{offeredCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Offers Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{convertedCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Converted</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Waitlist Entries */}
      {settings.waitlist_enabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Waitlist Entries</CardTitle>
              <CardDescription>
                {entries.length} {entries.length === 1 ? "person" : "people"} on the waitlist
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadWaitlist}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No one on the waitlist yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.position || index + 1}</TableCell>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>{entry.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[entry.status]?.variant || "outline"}>
                          {STATUS_BADGES[entry.status]?.label || entry.status}
                        </Badge>
                        {entry.status === "offered" && entry.offer_expires_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires {formatDistanceToNow(new Date(entry.offer_expires_at), { addSuffix: true })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {entry.status === "waiting" && (
                              <DropdownMenuItem onClick={() => sendOffer(entry.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Offer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => removeEntry(entry.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add to Waitlist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
            <DialogDescription>
              Manually add someone to the waitlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newEntry.name}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newEntry.email}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newEntry.phone}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={newEntry.quantity}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addToWaitlist} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
