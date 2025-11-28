import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Copy, Plus, Trash2, Edit, RefreshCw, Clock, Repeat, FileText, ChevronRight } from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO } from "date-fns";

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  template_data: {
    name?: string;
    description?: string;
    venue?: string;
    venue_address?: string;
    capacity?: number;
    default_time?: string;
    default_duration_hours?: number;
  };
  recurrence_enabled: boolean;
  recurrence_pattern: string | null;
  recurrence_days_of_week: number[] | null;
  auto_create_enabled: boolean;
  auto_create_days_ahead: number;
  ticket_types: any[];
  widget_customization: Record<string, unknown>;
  times_used: number;
  created_at: string;
}

interface EventTemplatesManagerProps {
  organizationId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const EventTemplatesManager = ({ organizationId }: EventTemplatesManagerProps) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Form state for new template
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    eventName: "",
    eventDescription: "",
    venue: "",
    venueAddress: "",
    capacity: 100,
    defaultTime: "19:00",
    defaultDuration: 3,
    recurrenceEnabled: false,
    recurrencePattern: "weekly" as "daily" | "weekly" | "biweekly" | "monthly",
    recurrenceDays: [5] as number[], // Friday by default
    autoCreateEnabled: false,
    autoCreateDaysAhead: 30,
  });

  // Form state for creating event from template
  const [newEventData, setNewEventData] = useState({
    eventDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    eventTime: "19:00",
    customName: "",
    useCustomName: false,
  });

  useEffect(() => {
    loadTemplates();
    loadEvents();
  }, [organizationId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const createTemplate = async () => {
    try {
      const templateData = {
        name: newTemplate.eventName,
        description: newTemplate.eventDescription,
        venue: newTemplate.venue,
        venue_address: newTemplate.venueAddress,
        capacity: newTemplate.capacity,
        default_time: newTemplate.defaultTime,
        default_duration_hours: newTemplate.defaultDuration,
      };

      const { error } = await supabase.from("event_templates").insert({
        organization_id: organizationId,
        name: newTemplate.name,
        description: newTemplate.description,
        template_data: templateData,
        recurrence_enabled: newTemplate.recurrenceEnabled,
        recurrence_pattern: newTemplate.recurrenceEnabled ? newTemplate.recurrencePattern : null,
        recurrence_days_of_week: newTemplate.recurrenceEnabled ? newTemplate.recurrenceDays : null,
        auto_create_enabled: newTemplate.autoCreateEnabled,
        auto_create_days_ahead: newTemplate.autoCreateDaysAhead,
        ticket_types: [],
        widget_customization: {},
      });

      if (error) throw error;

      toast({
        title: "Template Created",
        description: "Your event template has been saved.",
      });

      setShowCreateDialog(false);
      resetNewTemplate();
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const createTemplateFromEvent = async (eventId: string) => {
    try {
      // Load the event data
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;

      // Load ticket types for the event
      const { data: ticketTypes } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId);

      const templateData = {
        name: event.name,
        description: event.description,
        venue: event.venue,
        venue_address: event.venue_address,
        venue_lat: event.venue_lat,
        venue_lng: event.venue_lng,
        capacity: event.capacity,
        default_time: event.event_date ? format(parseISO(event.event_date), "HH:mm") : "19:00",
        default_duration_hours: 3,
      };

      const { error } = await supabase.from("event_templates").insert({
        organization_id: organizationId,
        name: `${event.name} Template`,
        description: `Template created from ${event.name}`,
        template_data: templateData,
        ticket_types: ticketTypes || [],
        widget_customization: event.widget_customization || {},
        ticket_customization: event.ticket_customization || {},
        email_customization: event.email_customization || {},
      });

      if (error) throw error;

      toast({
        title: "Template Created",
        description: `Template created from "${event.name}"`,
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template from event",
        variant: "destructive",
      });
    }
  };

  const createEventFromTemplate = async () => {
    if (!selectedTemplate) return;

    setCreatingEvent(true);
    try {
      const templateData = selectedTemplate.template_data;
      const eventDateTime = `${newEventData.eventDate}T${newEventData.eventTime}:00`;

      // Calculate end date based on duration
      const durationHours = templateData.default_duration_hours || 3;
      const eventDate = new Date(eventDateTime);
      const endDate = new Date(eventDate.getTime() + durationHours * 60 * 60 * 1000);

      const eventName = newEventData.useCustomName && newEventData.customName
        ? newEventData.customName
        : templateData.name || selectedTemplate.name;

      // Create the event
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          organization_id: organizationId,
          name: eventName,
          description: templateData.description,
          venue: templateData.venue,
          venue_address: templateData.venue_address,
          capacity: templateData.capacity || 100,
          event_date: eventDateTime,
          event_end_date: endDate.toISOString(),
          status: "draft",
          widget_customization: selectedTemplate.widget_customization,
          ticket_customization: selectedTemplate.ticket_customization || {},
          email_customization: selectedTemplate.email_customization || {},
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create ticket types from template
      if (selectedTemplate.ticket_types && selectedTemplate.ticket_types.length > 0) {
        const ticketTypesToCreate = selectedTemplate.ticket_types.map((tt: any) => ({
          event_id: newEvent.id,
          name: tt.name,
          description: tt.description,
          price: tt.price,
          quantity: tt.quantity,
          max_per_order: tt.max_per_order,
          sales_start: tt.sales_start,
          sales_end: tt.sales_end,
          is_active: true,
        }));

        await supabase.from("ticket_types").insert(ticketTypesToCreate);
      }

      // Link event to template
      await supabase.from("template_events").insert({
        template_id: selectedTemplate.id,
        event_id: newEvent.id,
      });

      // Update template usage count
      await supabase
        .from("event_templates")
        .update({ times_used: (selectedTemplate.times_used || 0) + 1 })
        .eq("id", selectedTemplate.id);

      toast({
        title: "Event Created",
        description: `"${eventName}" has been created from the template.`,
      });

      setShowCreateEventDialog(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event from template",
        variant: "destructive",
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("event_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "The template has been removed.",
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      name: "",
      description: "",
      eventName: "",
      eventDescription: "",
      venue: "",
      venueAddress: "",
      capacity: 100,
      defaultTime: "19:00",
      defaultDuration: 3,
      recurrenceEnabled: false,
      recurrencePattern: "weekly",
      recurrenceDays: [5],
      autoCreateEnabled: false,
      autoCreateDaysAhead: 30,
    });
  };

  const getRecurrenceLabel = (template: EventTemplate) => {
    if (!template.recurrence_enabled) return null;

    switch (template.recurrence_pattern) {
      case "daily":
        return "Daily";
      case "weekly": {
        const days = template.recurrence_days_of_week?.map(
          (d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.slice(0, 3)
        ).join(", ");
        return `Weekly on ${days}`;
      }
      case "biweekly":
        return "Every 2 weeks";
      case "monthly":
        return "Monthly";
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Templates</h2>
          <p className="text-muted-foreground">
            Create reusable templates for recurring events
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Event Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for recurring events
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Template Info */}
                <div className="space-y-4">
                  <h4 className="font-medium">Template Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, name: e.target.value })
                        }
                        placeholder="e.g., Friday Night Show"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template Description</Label>
                      <Input
                        value={newTemplate.description}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Default Event Details</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Event Name</Label>
                      <Input
                        value={newTemplate.eventName}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, eventName: e.target.value })
                        }
                        placeholder="e.g., Comedy Night"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Event Description</Label>
                      <Textarea
                        value={newTemplate.eventDescription}
                        onChange={(e) =>
                          setNewTemplate({ ...newTemplate, eventDescription: e.target.value })
                        }
                        placeholder="Describe the event..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Venue</Label>
                        <Input
                          value={newTemplate.venue}
                          onChange={(e) =>
                            setNewTemplate({ ...newTemplate, venue: e.target.value })
                          }
                          placeholder="Venue name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input
                          type="number"
                          value={newTemplate.capacity}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              capacity: parseInt(e.target.value) || 100,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Start Time</Label>
                        <Input
                          type="time"
                          value={newTemplate.defaultTime}
                          onChange={(e) =>
                            setNewTemplate({ ...newTemplate, defaultTime: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (hours)</Label>
                        <Input
                          type="number"
                          value={newTemplate.defaultDuration}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              defaultDuration: parseInt(e.target.value) || 3,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurrence Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Recurring Event</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure recurrence pattern for this template
                      </p>
                    </div>
                    <Switch
                      checked={newTemplate.recurrenceEnabled}
                      onCheckedChange={(checked) =>
                        setNewTemplate({ ...newTemplate, recurrenceEnabled: checked })
                      }
                    />
                  </div>

                  {newTemplate.recurrenceEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label>Recurrence Pattern</Label>
                        <Select
                          value={newTemplate.recurrencePattern}
                          onValueChange={(value: any) =>
                            setNewTemplate({ ...newTemplate, recurrencePattern: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newTemplate.recurrencePattern === "weekly" && (
                        <div className="space-y-2">
                          <Label>Days of Week</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <label
                                key={day.value}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={newTemplate.recurrenceDays.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNewTemplate({
                                        ...newTemplate,
                                        recurrenceDays: [
                                          ...newTemplate.recurrenceDays,
                                          day.value,
                                        ].sort(),
                                      });
                                    } else {
                                      setNewTemplate({
                                        ...newTemplate,
                                        recurrenceDays: newTemplate.recurrenceDays.filter(
                                          (d) => d !== day.value
                                        ),
                                      });
                                    }
                                  }}
                                />
                                <span className="text-sm">{day.label.slice(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <Label>Auto-Create Events</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically create upcoming events
                          </p>
                        </div>
                        <Switch
                          checked={newTemplate.autoCreateEnabled}
                          onCheckedChange={(checked) =>
                            setNewTemplate({ ...newTemplate, autoCreateEnabled: checked })
                          }
                        />
                      </div>

                      {newTemplate.autoCreateEnabled && (
                        <div className="space-y-2">
                          <Label>Days Ahead</Label>
                          <Input
                            type="number"
                            value={newTemplate.autoCreateDaysAhead}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                autoCreateDaysAhead: parseInt(e.target.value) || 30,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Create events this many days in advance
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createTemplate} disabled={!newTemplate.name}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Create from existing event */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Create from Existing Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {events.slice(0, 5).map((event) => (
                <Button
                  key={event.id}
                  variant="outline"
                  size="sm"
                  onClick={() => createTemplateFromEvent(event.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {event.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first template to quickly generate recurring events
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template details */}
                <div className="space-y-2 text-sm">
                  {template.template_data.venue && (
                    <p className="text-muted-foreground">
                      Venue: {template.template_data.venue}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    {template.template_data.default_time && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {template.template_data.default_time}
                      </span>
                    )}
                    {template.template_data.capacity && (
                      <span className="text-muted-foreground">
                        Capacity: {template.template_data.capacity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recurrence badge */}
                {template.recurrence_enabled && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <Repeat className="h-3 w-3 mr-1" />
                    {getRecurrenceLabel(template)}
                  </Badge>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Used {template.times_used} time{template.times_used !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setNewEventData({
                        eventDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                        eventTime: template.template_data.default_time || "19:00",
                        customName: "",
                        useCustomName: false,
                      });
                      setShowCreateEventDialog(true);
                    }}
                  >
                    Create Event
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Event from Template Dialog */}
      <Dialog open={showCreateEventDialog} onOpenChange={setShowCreateEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event from Template</DialogTitle>
            <DialogDescription>
              Create a new event using "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={newEventData.eventDate}
                  onChange={(e) =>
                    setNewEventData({ ...newEventData, eventDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEventData.eventTime}
                  onChange={(e) =>
                    setNewEventData({ ...newEventData, eventTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="customName"
                  checked={newEventData.useCustomName}
                  onCheckedChange={(checked) =>
                    setNewEventData({ ...newEventData, useCustomName: !!checked })
                  }
                />
                <Label htmlFor="customName">Use custom event name</Label>
              </div>
              {newEventData.useCustomName && (
                <Input
                  value={newEventData.customName}
                  onChange={(e) =>
                    setNewEventData({ ...newEventData, customName: e.target.value })
                  }
                  placeholder={selectedTemplate?.template_data.name || selectedTemplate?.name}
                />
              )}
            </div>

            {/* Quick date buttons */}
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate?.recurrence_enabled &&
                selectedTemplate.recurrence_pattern === "weekly" &&
                selectedTemplate.recurrence_days_of_week ? (
                  // Show next occurrences based on recurrence pattern
                  selectedTemplate.recurrence_days_of_week.slice(0, 3).map((dayOfWeek) => {
                    const today = new Date();
                    const currentDay = today.getDay();
                    const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
                    const nextDate = new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000);

                    return (
                      <Button
                        key={dayOfWeek}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewEventData({
                            ...newEventData,
                            eventDate: format(nextDate, "yyyy-MM-dd"),
                          })
                        }
                      >
                        {format(nextDate, "EEE, MMM d")}
                      </Button>
                    );
                  })
                ) : (
                  // Default quick dates
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewEventData({
                          ...newEventData,
                          eventDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                        })
                      }
                    >
                      Next Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewEventData({
                          ...newEventData,
                          eventDate: format(addWeeks(new Date(), 2), "yyyy-MM-dd"),
                        })
                      }
                    >
                      2 Weeks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewEventData({
                          ...newEventData,
                          eventDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
                        })
                      }
                    >
                      Next Month
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateEventDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={createEventFromTemplate} disabled={creatingEvent}>
              {creatingEvent ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
