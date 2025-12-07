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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2,
  Users,
  Calendar,
  Ticket,
  DollarSign,
  Check,
  AlertCircle,
  ChevronRight,
  Package,
  Info,
} from "lucide-react";

interface AllocationToEdit {
  id: string;
  group_id: string;
  event_id: string;
  ticket_type_id: string;
  allocated_quantity: number;
  used_quantity: number;
  reserved_quantity: number;
  full_price: number;
  minimum_price: number | null;
  notes: string | null;
}

interface AllocateTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  preSelectedGroupId?: string;
  preSelectedEventId?: string;
  editingAllocation?: AllocationToEdit | null;
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
  editingAllocation,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const isEditing = !!editingAllocation;

  const [formData, setFormData] = useState({
    groupId: preSelectedGroupId || "",
    eventId: preSelectedEventId || "",
    ticketTypeId: "",
    allocatedQuantity: "",
    fullPrice: "",
    minimumPrice: "",
    notes: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (open && editingAllocation) {
      setFormData({
        groupId: editingAllocation.group_id,
        eventId: editingAllocation.event_id,
        ticketTypeId: editingAllocation.ticket_type_id,
        allocatedQuantity: editingAllocation.allocated_quantity.toString(),
        fullPrice: editingAllocation.full_price.toFixed(2),
        minimumPrice: editingAllocation.minimum_price?.toFixed(2) || "",
        notes: editingAllocation.notes || "",
      });
    } else if (open && !editingAllocation) {
      setFormData({
        groupId: preSelectedGroupId || "",
        eventId: preSelectedEventId || "",
        ticketTypeId: "",
        allocatedQuantity: "",
        fullPrice: "",
        minimumPrice: "",
        notes: "",
      });
    }
  }, [open, editingAllocation, preSelectedGroupId, preSelectedEventId]);

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
    if (formData.ticketTypeId && !isEditing) {
      const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);
      if (selectedTicketType) {
        setFormData((prev) => ({
          ...prev,
          fullPrice: selectedTicketType.price.toFixed(2),
        }));
      }
    }
  }, [formData.ticketTypeId, ticketTypes, isEditing]);

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
    if (!formData.groupId || !formData.eventId || !formData.ticketTypeId) {
      toast({
        title: "Missing information",
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
        title: "Invalid quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(fullPrice) || fullPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid full price",
        variant: "destructive",
      });
      return;
    }

    if (minimumPrice !== null && (isNaN(minimumPrice) || minimumPrice < 0 || minimumPrice > fullPrice)) {
      toast({
        title: "Invalid minimum price",
        description: "Minimum price must be between $0 and the full price",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing) {
      const { data: existingAllocation, error: checkError } = await supabase
        .from("group_ticket_allocations")
        .select("id")
        .eq("group_id", formData.groupId)
        .eq("event_id", formData.eventId)
        .eq("ticket_type_id", formData.ticketTypeId)
        .eq("is_active", true)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for duplicate:", checkError);
      }

      if (existingAllocation) {
        toast({
          title: "Allocation exists",
          description:
            "This group already has an allocation for this ticket type. Please edit the existing allocation instead.",
          variant: "destructive",
        });
        return;
      }
    }

    const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);
    if (!isEditing && selectedTicketType && quantity > selectedTicketType.quantity_available) {
      toast({
        title: "Not enough inventory",
        description: `Only ${selectedTicketType.quantity_available} tickets available for this type`,
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingAllocation) {
      const minRequired = editingAllocation.used_quantity + editingAllocation.reserved_quantity;
      if (quantity < minRequired) {
        toast({
          title: "Cannot reduce allocation",
          description: `Minimum ${minRequired} tickets required (${editingAllocation.used_quantity} sold + ${editingAllocation.reserved_quantity} reserved)`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing && editingAllocation) {
        const { error } = await supabase
          .from("group_ticket_allocations")
          .update({
            allocated_quantity: quantity,
            full_price: fullPrice,
            minimum_price: minimumPrice,
            notes: formData.notes || null,
          })
          .eq("id", editingAllocation.id);

        if (error) throw error;

        toast({
          title: "Allocation updated",
          description: "The allocation has been updated successfully",
        });
      } else {
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
          title: "Tickets allocated",
          description: `${quantity} tickets allocated to the group`,
        });
      }

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

  const selectedGroup = groups.find((g) => g.id === formData.groupId);
  const selectedEvent = events.find((e) => e.id === formData.eventId);
  const selectedTicketType = ticketTypes.find((tt) => tt.id === formData.ticketTypeId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isFormValid =
    formData.groupId &&
    formData.eventId &&
    formData.ticketTypeId &&
    formData.allocatedQuantity &&
    parseInt(formData.allocatedQuantity) > 0 &&
    formData.fullPrice &&
    parseFloat(formData.fullPrice) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Allocation" : "Allocate Tickets to Group"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the quantity and pricing for this allocation"
              : "Assign ticket inventory from an event to a group for them to sell to their members"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1: Group Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  formData.groupId
                    ? "bg-green-100 text-green-700"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {formData.groupId ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <Label className="text-base font-medium">Select Group</Label>
            </div>
            <Select
              value={formData.groupId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, groupId: value }))}
              disabled={!!preSelectedGroupId || isEditing}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose a group..." />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Event Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  formData.eventId
                    ? "bg-green-100 text-green-700"
                    : formData.groupId
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {formData.eventId ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <Label className="text-base font-medium">Select Event</Label>
            </div>
            <Select
              value={formData.eventId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, eventId: value }))}
              disabled={!!preSelectedEventId || isEditing || !formData.groupId}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{event.name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-sm">
                        {formatDate(event.event_date)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Ticket Type Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  formData.ticketTypeId
                    ? "bg-green-100 text-green-700"
                    : formData.eventId
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {formData.ticketTypeId ? <Check className="h-4 w-4" /> : "3"}
              </div>
              <Label className="text-base font-medium">Select Ticket Type</Label>
            </div>
            <Select
              value={formData.ticketTypeId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, ticketTypeId: value }))}
              disabled={!formData.eventId || isEditing}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose a ticket type..." />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map((ticketType) => (
                  <SelectItem key={ticketType.id} value={ticketType.id}>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>{ticketType.name}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        ${ticketType.price.toFixed(2)}
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        ({ticketType.quantity_available} available)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.eventId && formData.groupId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Select an event first to see available ticket types
              </p>
            )}
          </div>

          {/* Step 4: Quantity & Pricing */}
          {formData.ticketTypeId && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                    isFormValid
                      ? "bg-green-100 text-green-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {isFormValid ? <Check className="h-4 w-4" /> : "4"}
                </div>
                <Label className="text-base font-medium">Set Quantity & Pricing</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.allocatedQuantity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, allocatedQuantity: e.target.value }))
                      }
                      placeholder="100"
                      className="pl-10 h-11"
                    />
                  </div>
                  {selectedTicketType && (
                    <p className="text-xs text-muted-foreground">
                      Max: {selectedTicketType.quantity_available}
                    </p>
                  )}
                </div>

                {/* Full Price */}
                <div className="space-y-2">
                  <Label htmlFor="fullPrice" className="text-sm">
                    Full Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fullPrice}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fullPrice: e.target.value }))
                      }
                      placeholder="150.00"
                      className="pl-10 h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Per ticket to group</p>
                </div>

                {/* Minimum Price */}
                <div className="space-y-2">
                  <Label htmlFor="minimumPrice" className="text-sm">
                    Min Price <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      className="pl-10 h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Discount limit</p>
                </div>
              </div>

              {/* Summary Card */}
              {formData.allocatedQuantity && formData.fullPrice && (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Summary</span>
                      <div className="flex items-center gap-4">
                        <span>
                          <strong>{formData.allocatedQuantity}</strong> tickets
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span>
                          <strong>${parseFloat(formData.fullPrice || "0").toFixed(2)}</strong>
                          /ticket
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-primary">
                          $
                          {(
                            parseInt(formData.allocatedQuantity || "0") *
                            parseFloat(formData.fullPrice || "0")
                          ).toFixed(2)}{" "}
                          total
                        </span>
                      </div>
                    </div>
                    {formData.minimumPrice && (
                      <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                        Max discount allowed: $
                        {(
                          parseFloat(formData.fullPrice) - parseFloat(formData.minimumPrice)
                        ).toFixed(2)}{" "}
                        per ticket
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or notes for this allocation..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Edit mode warning */}
          {isEditing && editingAllocation && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-amber-800">
                <strong>Editing existing allocation.</strong> Group, event, and ticket type cannot
                be changed. {editingAllocation.used_quantity} tickets have been sold and{" "}
                {editingAllocation.reserved_quantity} are reserved.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isFormValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Allocate Tickets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocateTicketsDialog;
