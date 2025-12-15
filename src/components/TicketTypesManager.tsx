import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, DollarSign, MapPin, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TicketType {
  id?: string;
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  sale_start_date: string | null;
  sale_end_date: string | null;
  use_assigned_seating?: boolean;
  attendees_per_ticket?: number;
}

interface TicketTypesManagerProps {
  eventId: string;
}

// FREEMIUM: Maximum tickets allowed for free events
const FREE_EVENT_MAX_TICKETS = 50;

const TicketTypesManager: React.FC<TicketTypesManagerProps> = ({ eventId }) => {
  const { toast } = useToast();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [pricingType, setPricingType] = useState<'paid' | 'free' | 'donation' | null>(null);
  const [formData, setFormData] = useState<TicketType>({
    name: "",
    description: "",
    price: 0,
    quantity_available: 100,
    quantity_sold: 0,
    sale_start_date: null,
    sale_end_date: null,
    use_assigned_seating: false,
    attendees_per_ticket: 1,
  });

  const isFreeEvent = pricingType === 'free';

  // Calculate total tickets across all ticket types (excluding the one being edited)
  const getTotalTicketsExcluding = (excludeId?: string) => {
    return ticketTypes
      .filter(t => t.id !== excludeId)
      .reduce((sum, t) => sum + t.quantity_available, 0);
  };

  // Get remaining tickets available for free events
  const getRemainingFreeTickets = (excludeId?: string) => {
    return FREE_EVENT_MAX_TICKETS - getTotalTicketsExcluding(excludeId);
  };

  useEffect(() => {
    loadTicketTypes();
    loadEventPricingType();
  }, [eventId]);

  const loadEventPricingType = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("pricing_type")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setPricingType(data?.pricing_type || 'paid');
    } catch (error) {
      console.error("Error loading event pricing type:", error);
    }
  };

  const loadTicketTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTicketTypes((data || []).map(type => ({
        ...type,
        description: type.description || ''
      })));
    } catch (error) {
      console.error("Error loading ticket types:", error);
      toast({
        title: "Error",
        description: "Failed to load ticket types",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // FREEMIUM: Validate ticket quantity for free events
      if (isFreeEvent) {
        const remainingTickets = getRemainingFreeTickets(editingTicket?.id);
        if (formData.quantity_available > remainingTickets) {
          toast({
            title: "Free Event Limit",
            description: `Free events are limited to ${FREE_EVENT_MAX_TICKETS} total tickets. You can add up to ${remainingTickets} more tickets.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      if (editingTicket?.id) {
        // Update existing ticket type
        const { error } = await supabase
          .from("ticket_types")
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            quantity_available: formData.quantity_available,
            sale_start_date: formData.sale_start_date,
            sale_end_date: formData.sale_end_date,
            use_assigned_seating: formData.use_assigned_seating || false,
            attendees_per_ticket: formData.attendees_per_ticket || 1,
          })
          .eq("id", editingTicket.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Ticket type updated successfully!",
        });
      } else {
        // Create new ticket type
        const { error } = await supabase
          .from("ticket_types")
          .insert({
            event_id: eventId,
            name: formData.name,
            description: formData.description,
            price: formData.price,
            quantity_available: formData.quantity_available,
            sale_start_date: formData.sale_start_date,
            sale_end_date: formData.sale_end_date,
            use_assigned_seating: formData.use_assigned_seating || false,
            attendees_per_ticket: formData.attendees_per_ticket || 1,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Ticket type created successfully!",
        });
      }

      await loadTicketTypes();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving ticket type:", error);
      toast({
        title: "Error",
        description: "Failed to save ticket type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setFormData({
      name: ticket.name,
      description: ticket.description || "",
      price: ticket.price,
      quantity_available: ticket.quantity_available,
      quantity_sold: ticket.quantity_sold,
      sale_start_date: ticket.sale_start_date,
      sale_end_date: ticket.sale_end_date,
      use_assigned_seating: ticket.use_assigned_seating || false,
      attendees_per_ticket: ticket.attendees_per_ticket || 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket type? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ticket_types")
        .delete()
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket type deleted successfully!",
      });

      await loadTicketTypes();
    } catch (error) {
      console.error("Error deleting ticket type:", error);
      toast({
        title: "Error",
        description: "Failed to delete ticket type",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      quantity_available: 100,
      quantity_sold: 0,
      sale_start_date: null,
      sale_end_date: null,
      use_assigned_seating: false,
      attendees_per_ticket: 1,
    });
    setEditingTicket(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No limit";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Ticket Types & Pricing
            </CardTitle>
            <CardDescription>
              Manage different ticket classes and their pricing for your event
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Ticket Type
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingTicket ? "Edit Ticket Type" : "Create New Ticket Type"}
                </DialogTitle>
                <DialogDescription>
                  Configure the details, pricing, and availability for this ticket type.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ticket Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., General Admission, VIP, Early Bird"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what's included with this ticket type..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Available Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={isFreeEvent ? getRemainingFreeTickets(editingTicket?.id) : undefined}
                      value={formData.quantity_available}
                      onChange={(e) => setFormData({ ...formData, quantity_available: parseInt(e.target.value) || 0 })}
                      required
                    />
                    {isFreeEvent && (
                      <p className="text-xs text-amber-600">
                        Free event limit: {getRemainingFreeTickets(editingTicket?.id)} of {FREE_EVENT_MAX_TICKETS} remaining
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendees_per_ticket">Attendees per Ticket</Label>
                    <Input
                      id="attendees_per_ticket"
                      type="number"
                      min="1"
                      value={formData.attendees_per_ticket || 1}
                      onChange={(e) => setFormData({ ...formData, attendees_per_ticket: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of attendee forms to collect per ticket (e.g., 2 for parent + child)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-md border p-4">
                  <Checkbox
                    id="use_assigned_seating"
                    checked={formData.use_assigned_seating || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, use_assigned_seating: checked as boolean })
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="use_assigned_seating"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Require Assigned Seating
                      </div>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Customers must select specific seats from the event seat map when purchasing this ticket type
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DateTimePicker
                      id="saleStart"
                      label="Sale Start Date"
                      value={formData.sale_start_date}
                      onChange={(date) => setFormData({ ...formData, sale_start_date: date || null })}
                      placeholder="Select sale start date (optional)"
                    />
                  </div>
                  <div>
                    <DateTimePicker
                      id="saleEnd"
                      label="Sale End Date"
                      value={formData.sale_end_date}
                      onChange={(date) => setFormData({ ...formData, sale_end_date: date || null })}
                      placeholder="Select sale end date (optional)"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingTicket ? "Update Ticket Type" : "Create Ticket Type"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
      {ticketTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No ticket types yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first ticket type to start selling tickets for your event.
                </p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Ticket Type
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ticketTypes.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{ticket.name}</CardTitle>
                      {ticket.use_assigned_seating && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Assigned Seating
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{ticket.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ticket)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ticket.id && handleDelete(ticket.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-semibold text-lg">${ticket.price}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-medium">{ticket.quantity_available - ticket.quantity_sold} / {ticket.quantity_available}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sale Start</p>
                    <p className="font-medium">{formatDate(ticket.sale_start_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sale End</p>
                    <p className="font-medium">{formatDate(ticket.sale_end_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </CardContent>
    </Card>
  );
};

export default TicketTypesManager;