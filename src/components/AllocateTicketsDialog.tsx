import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AllocateTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  preSelectedGroupId?: string;
  preSelectedEventId?: string;
  onSuccess?: () => void;
}

interface Group {
  id: string;
  name: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
}

export const AllocateTicketsDialog: React.FC<AllocateTicketsDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  preSelectedGroupId,
  preSelectedEventId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const [formData, setFormData] = useState({
    groupId: preSelectedGroupId || "",
    eventId: preSelectedEventId || "",
    ticketTypeId: "",
    allocatedQuantity: "",
    fullPrice: "",
    minimumPrice: "",
    notes: "",
  });

  useEffect(() => {
    if (open && organizationId) {
      loadGroups();
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId]);

  useEffect(() => {
    if (formData.eventId) {
      loadTicketTypes(formData.eventId);
    } else {
      setTicketTypes([]);
      setFormData((prev) => ({ ...prev, ticketTypeId: "", fullPrice: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.eventId]);

  useEffect(() => {
    // Auto-populate full price from selected ticket type
    if (formData.ticketTypeId) {
      const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);
      if (selectedTicketType) {
        setFormData((prev) => ({
          ...prev,
          fullPrice: selectedTicketType.price.toFixed(2),
        }));
      }
    }
  }, [formData.ticketTypeId, ticketTypes]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date")
        .eq("organization_id", organizationId)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    }
  };

  const loadTicketTypes = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("id, name, price, quantity_available")
        .eq("event_id", eventId)
        .order("name");

      if (error) throw error;
      setTicketTypes(data || []);
    } catch (error) {
      console.error("Error loading ticket types:", error);
      toast({
        title: "Error",
        description: "Failed to load ticket types",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.groupId || !formData.eventId || !formData.ticketTypeId) {
      toast({
        title: "Validation Error",
        description: "Please select group, event, and ticket type",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.allocatedQuantity);
    const fullPrice = parseFloat(formData.fullPrice);
    const minimumPrice = formData.minimumPrice ? parseFloat(formData.minimumPrice) : null;

    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(fullPrice) || fullPrice < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid full price",
        variant: "destructive",
      });
      return;
    }

    if (minimumPrice !== null && (isNaN(minimumPrice) || minimumPrice < 0 || minimumPrice > fullPrice)) {
      toast({
        title: "Validation Error",
        description: "Minimum price must be between 0 and full price",
        variant: "destructive",
      });
      return;
    }

    // Check if ticket type has enough inventory
    const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);
    if (selectedTicketType && quantity > selectedTicketType.quantity_available) {
      toast({
        title: "Validation Error",
        description: `Only ${selectedTicketType.quantity_available} tickets available for this type`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("group_ticket_allocations").insert({
        group_id: formData.groupId,
        event_id: formData.eventId,
        ticket_type_id: formData.ticketTypeId,
        allocated_quantity: quantity,
        full_price: fullPrice,
        minimum_price: minimumPrice,
        notes: formData.notes || null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Allocated ${quantity} tickets to group`,
      });

      // Reset form
      setFormData({
        groupId: preSelectedGroupId || "",
        eventId: preSelectedEventId || "",
        ticketTypeId: "",
        allocatedQuantity: "",
        fullPrice: "",
        minimumPrice: "",
        notes: "",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating allocation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to allocate tickets";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate Tickets to Group</DialogTitle>
          <DialogDescription>
            Assign ticket inventory from an event to a group. The group will be able to sell these
            tickets to their members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="group">Group *</Label>
            <Select
              value={formData.groupId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, groupId: value }))}
              disabled={!!preSelectedGroupId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="event">Event *</Label>
            <Select
              value={formData.eventId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, eventId: value }))}
              disabled={!!preSelectedEventId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} - {new Date(event.event_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ticket Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="ticketType">Ticket Type *</Label>
            <Select
              value={formData.ticketTypeId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, ticketTypeId: value }))}
              disabled={!formData.eventId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a ticket type" />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map((ticketType) => (
                  <SelectItem key={ticketType.id} value={ticketType.id}>
                    {ticketType.name} - ${ticketType.price.toFixed(2)} ({ticketType.quantity_available}{" "}
                    available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.eventId && (
              <p className="text-xs text-muted-foreground">Select an event first</p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Allocate *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.allocatedQuantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, allocatedQuantity: e.target.value }))
              }
              placeholder="150"
            />
            {selectedTicketType && (
              <p className="text-xs text-muted-foreground">
                {selectedTicketType.quantity_available} tickets available
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullPrice">Full Price (per ticket) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="fullPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fullPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullPrice: e.target.value }))}
                  placeholder="200.00"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Amount the group owes back to you per ticket
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumPrice">Minimum Price (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="minimumPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimumPrice: e.target.value }))
                  }
                  placeholder="50.00"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum price groups can charge (sets discount limit)
              </p>
            </div>
          </div>

          {/* Price Summary */}
          {formData.fullPrice && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Pricing Summary:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span>Full Price:</span>
                  <span className="ml-2 font-semibold text-foreground">
                    ${parseFloat(formData.fullPrice).toFixed(2)}
                  </span>
                </div>
                {formData.minimumPrice && (
                  <>
                    <div>
                      <span>Minimum Price:</span>
                      <span className="ml-2 font-semibold text-foreground">
                        ${parseFloat(formData.minimumPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span>Max Discount per Ticket:</span>
                      <span className="ml-2 font-semibold text-destructive">
                        $
                        {(
                          parseFloat(formData.fullPrice) - parseFloat(formData.minimumPrice)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions or notes for this allocation"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Allocate Tickets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocateTicketsDialog;
