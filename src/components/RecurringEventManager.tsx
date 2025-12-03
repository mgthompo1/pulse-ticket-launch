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
  Calendar,
  CalendarDays,
  Repeat,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Ticket,
  Users,
  Eye,
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO } from "date-fns";

interface EventSeries {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  recurrence_type: "daily" | "weekly" | "monthly" | "custom";
  recurrence_interval: number;
  recurrence_days: number[] | null;
  series_start_date: string;
  series_end_date: string | null;
  max_occurrences: number | null;
  is_active: boolean;
  created_at: string;
}

interface SeriesPass {
  id: string;
  series_id: string;
  name: string;
  description: string | null;
  pass_type: "unlimited" | "fixed_count" | "date_range";
  included_events: number | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  is_active: boolean;
}

interface SeriesEvent {
  id: string;
  name: string;
  start_date: string;
  series_occurrence_number: number | null;
}

interface RecurringEventManagerProps {
  organizationId: string;
  eventId?: string;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const RecurringEventManager = ({ organizationId, eventId }: RecurringEventManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<EventSeries[]>([]);
  const [passes, setPasses] = useState<SeriesPass[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false);
  const [showCreatePassDialog, setShowCreatePassDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<EventSeries | null>(null);
  const [seriesEvents, setSeriesEvents] = useState<SeriesEvent[]>([]);
  const [showEventsDialog, setShowEventsDialog] = useState(false);

  const [newSeries, setNewSeries] = useState({
    name: "",
    description: "",
    recurrence_type: "weekly" as EventSeries["recurrence_type"],
    recurrence_interval: 1,
    recurrence_days: [] as number[],
    series_start_date: "",
    series_end_date: "",
    max_occurrences: 10,
  });

  const [newPass, setNewPass] = useState({
    name: "",
    description: "",
    pass_type: "unlimited" as SeriesPass["pass_type"],
    included_events: 5,
    price: 0,
    quantity_available: 100,
  });

  const loadData = useCallback(async () => {
    try {
      // Load series
      const { data: seriesData, error: seriesError } = await supabase
        .from("event_series")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (seriesError) throw seriesError;
      setSeries(seriesData || []);

      // Load passes for all series
      if (seriesData && seriesData.length > 0) {
        const seriesIds = seriesData.map((s) => s.id);
        const { data: passesData } = await supabase
          .from("series_passes")
          .select("*")
          .in("series_id", seriesIds);

        setPasses(passesData || []);
      }
    } catch (error) {
      console.error("Error loading series data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createSeries = async () => {
    if (!newSeries.name || !newSeries.series_start_date) {
      toast({ title: "Name and start date are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("event_series")
        .insert({
          organization_id: organizationId,
          name: newSeries.name,
          description: newSeries.description || null,
          recurrence_type: newSeries.recurrence_type,
          recurrence_interval: newSeries.recurrence_interval,
          recurrence_days: newSeries.recurrence_days.length > 0 ? newSeries.recurrence_days : null,
          series_start_date: newSeries.series_start_date,
          series_end_date: newSeries.series_end_date || null,
          max_occurrences: newSeries.max_occurrences || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Event series created" });
      setShowCreateSeriesDialog(false);
      setNewSeries({
        name: "",
        description: "",
        recurrence_type: "weekly",
        recurrence_interval: 1,
        recurrence_days: [],
        series_start_date: "",
        series_end_date: "",
        max_occurrences: 10,
      });
      loadData();
    } catch (error) {
      console.error("Error creating series:", error);
      toast({ title: "Error creating series", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createPass = async () => {
    if (!selectedSeries || !newPass.name || newPass.price < 0) {
      toast({ title: "Name and valid price are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("series_passes").insert({
        series_id: selectedSeries.id,
        name: newPass.name,
        description: newPass.description || null,
        pass_type: newPass.pass_type,
        included_events: newPass.pass_type === "fixed_count" ? newPass.included_events : null,
        price: newPass.price,
        quantity_available: newPass.quantity_available,
        quantity_sold: 0,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Series pass created" });
      setShowCreatePassDialog(false);
      setNewPass({
        name: "",
        description: "",
        pass_type: "unlimited",
        included_events: 5,
        price: 0,
        quantity_available: 100,
      });
      loadData();
    } catch (error) {
      console.error("Error creating pass:", error);
      toast({ title: "Error creating pass", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleSeriesStatus = async (seriesId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("event_series")
        .update({ is_active: isActive })
        .eq("id", seriesId);

      if (error) throw error;

      setSeries((prev) =>
        prev.map((s) => (s.id === seriesId ? { ...s, is_active: isActive } : s))
      );
    } catch (error) {
      console.error("Error updating series:", error);
      toast({ title: "Error updating series", variant: "destructive" });
    }
  };

  const deleteSeries = async (seriesId: string) => {
    try {
      const { error } = await supabase.from("event_series").delete().eq("id", seriesId);

      if (error) throw error;

      toast({ title: "Event series deleted" });
      setSeries((prev) => prev.filter((s) => s.id !== seriesId));
    } catch (error) {
      console.error("Error deleting series:", error);
      toast({ title: "Error deleting series", variant: "destructive" });
    }
  };

  const viewSeriesEvents = async (eventSeries: EventSeries) => {
    setSelectedSeries(eventSeries);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, start_date, series_occurrence_number")
        .eq("series_id", eventSeries.id)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setSeriesEvents(data || []);
      setShowEventsDialog(true);
    } catch (error) {
      console.error("Error loading series events:", error);
    }
  };

  const generatePreviewDates = () => {
    if (!newSeries.series_start_date) return [];

    const dates: Date[] = [];
    let currentDate = parseISO(newSeries.series_start_date);
    const maxDates = Math.min(newSeries.max_occurrences || 10, 10);

    for (let i = 0; i < maxDates; i++) {
      if (newSeries.series_end_date && currentDate > parseISO(newSeries.series_end_date)) {
        break;
      }

      dates.push(currentDate);

      switch (newSeries.recurrence_type) {
        case "daily":
          currentDate = addDays(currentDate, newSeries.recurrence_interval);
          break;
        case "weekly":
          currentDate = addWeeks(currentDate, newSeries.recurrence_interval);
          break;
        case "monthly":
          currentDate = addMonths(currentDate, newSeries.recurrence_interval);
          break;
        default:
          currentDate = addWeeks(currentDate, newSeries.recurrence_interval);
      }
    }

    return dates;
  };

  const previewDates = generatePreviewDates();
  const activeSeriesCount = series.filter((s) => s.is_active).length;
  const totalPasses = passes.reduce((sum, p) => sum + p.quantity_sold, 0);

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
              <Repeat className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{activeSeriesCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Series</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{series.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Series</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{totalPasses}</span>
            </div>
            <p className="text-sm text-muted-foreground">Passes Sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Series List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Event Series
            </CardTitle>
            <CardDescription>
              Create recurring events with a single setup
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreateSeriesDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Series
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No event series created yet</p>
              <p className="text-sm">Create a series to schedule recurring events</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Passes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((s) => {
                  const seriesPasses = passes.filter((p) => p.series_id === s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{RECURRENCE_LABELS[s.recurrence_type]}</span>
                          {s.recurrence_interval > 1 && (
                            <span className="text-muted-foreground">
                              (every {s.recurrence_interval})
                            </span>
                          )}
                        </div>
                        {s.recurrence_days && s.recurrence_days.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {s.recurrence_days.map((d) => DAY_NAMES[d]).join(", ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(s.series_start_date), "MMM d, yyyy")}
                        {s.series_end_date && (
                          <p className="text-xs text-muted-foreground">
                            to {format(parseISO(s.series_end_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{seriesPasses.length}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSeries(s);
                              setShowCreatePassDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(checked) => toggleSeriesStatus(s.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewSeriesEvents(s)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSeries(s.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Series Passes */}
      {passes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Series Passes</CardTitle>
            <CardDescription>Multi-event passes across all series</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pass Name</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passes.map((pass) => {
                  const parentSeries = series.find((s) => s.id === pass.series_id);
                  return (
                    <TableRow key={pass.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pass.name}</p>
                          {pass.description && (
                            <p className="text-xs text-muted-foreground">{pass.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{parentSeries?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {pass.pass_type === "unlimited"
                          ? "Unlimited"
                          : pass.pass_type === "fixed_count"
                          ? `${pass.included_events} events`
                          : "Date Range"}
                      </TableCell>
                      <TableCell>${pass.price.toFixed(2)}</TableCell>
                      <TableCell>
                        {pass.quantity_sold} / {pass.quantity_available}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pass.is_active ? "default" : "outline"}>
                          {pass.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Series Dialog */}
      <Dialog open={showCreateSeriesDialog} onOpenChange={setShowCreateSeriesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event Series</DialogTitle>
            <DialogDescription>
              Set up a recurring event pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Series Name</Label>
              <Input
                value={newSeries.name}
                onChange={(e) => setNewSeries((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Weekly Yoga Class"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newSeries.description}
                onChange={(e) => setNewSeries((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Join us every week for relaxing yoga"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recurrence Type</Label>
                <Select
                  value={newSeries.recurrence_type}
                  onValueChange={(value) =>
                    setNewSeries((prev) => ({ ...prev, recurrence_type: value as EventSeries["recurrence_type"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Interval</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newSeries.recurrence_interval}
                    onChange={(e) =>
                      setNewSeries((prev) => ({
                        ...prev,
                        recurrence_interval: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">
                    {newSeries.recurrence_type === "daily"
                      ? "day(s)"
                      : newSeries.recurrence_type === "weekly"
                      ? "week(s)"
                      : "month(s)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newSeries.series_start_date}
                  onChange={(e) => setNewSeries((prev) => ({ ...prev, series_start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={newSeries.series_end_date}
                  onChange={(e) => setNewSeries((prev) => ({ ...prev, series_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Occurrences</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={newSeries.max_occurrences}
                onChange={(e) =>
                  setNewSeries((prev) => ({ ...prev, max_occurrences: parseInt(e.target.value) || 10 }))
                }
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of events to generate
              </p>
            </div>

            {previewDates.length > 0 && (
              <div className="space-y-2">
                <Label>Preview Dates</Label>
                <div className="bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                  {previewDates.map((date, index) => (
                    <div key={index} className="text-sm flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(date, "EEEE, MMMM d, yyyy")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSeriesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createSeries} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Pass Dialog */}
      <Dialog open={showCreatePassDialog} onOpenChange={setShowCreatePassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Series Pass</DialogTitle>
            <DialogDescription>
              {selectedSeries && (
                <>
                  Create a pass for <strong>{selectedSeries.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pass Name</Label>
              <Input
                value={newPass.name}
                onChange={(e) => setNewPass((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Season Pass"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newPass.description}
                onChange={(e) => setNewPass((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Access to all events in this series"
              />
            </div>

            <div className="space-y-2">
              <Label>Pass Type</Label>
              <Select
                value={newPass.pass_type}
                onValueChange={(value) => setNewPass((prev) => ({ ...prev, pass_type: value as SeriesPass["pass_type"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited - All events</SelectItem>
                  <SelectItem value="fixed_count">Fixed Count - Specific number</SelectItem>
                  <SelectItem value="date_range">Date Range - Time period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newPass.pass_type === "fixed_count" && (
              <div className="space-y-2">
                <Label>Number of Events</Label>
                <Input
                  type="number"
                  min={1}
                  value={newPass.included_events}
                  onChange={(e) => setNewPass((prev) => ({ ...prev, included_events: parseInt(e.target.value) || 5 }))}
                  className="w-24"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newPass.price}
                    onChange={(e) => setNewPass((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantity Available</Label>
                <Input
                  type="number"
                  min={1}
                  value={newPass.quantity_available}
                  onChange={(e) =>
                    setNewPass((prev) => ({ ...prev, quantity_available: parseInt(e.target.value) || 100 }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePassDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createPass} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Series Events Dialog */}
      <Dialog open={showEventsDialog} onOpenChange={setShowEventsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Series Events</DialogTitle>
            <DialogDescription>
              {selectedSeries && (
                <>
                  Events in <strong>{selectedSeries.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {seriesEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No events generated yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seriesEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.series_occurrence_number || "-"}</TableCell>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>
                        {format(parseISO(event.start_date), "MMM d, yyyy h:mm a")}
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
