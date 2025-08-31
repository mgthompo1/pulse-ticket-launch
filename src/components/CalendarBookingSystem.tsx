import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  Clock, 
  Plus,
  RefreshCw,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";

interface CalendarBookingSystemProps {
  attractionId: string;
  attractionData: {
    name: string;
    duration_minutes: number;
    base_price: number;
    max_concurrent_bookings: number;
    advance_booking_days: number | null;
  };
}

interface BookingSlot {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  max_capacity: number;
  current_bookings: number;
  price_override?: number;
}

interface AttractionResource {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
}

const CalendarBookingSystem: React.FC<CalendarBookingSystemProps> = ({ 
  attractionId, 
  attractionData 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedResource, setSelectedResource] = useState<string>("all");
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [resources, setResources] = useState<AttractionResource[]>([]);
  
  // Bulk slot creation state
  const [bulkCreateForm, setBulkCreateForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ahead
    startTime: "09:00",
    endTime: "17:00",
    resourceId: "",
    priceOverride: ""
  });

  useEffect(() => {
    loadResources();
    loadBookingSlots();
  }, [attractionId, selectedDate, selectedResource]);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from("attraction_resources")
        .select("*")
        .eq("attraction_id", attractionId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setResources(data || []);
    } catch (error) {
      console.error("Error loading resources:", error);
    }
  };

  const loadBookingSlots = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("booking_slots")
        .select("*")
        .eq("attraction_id", attractionId)
        .gte("start_time", `${selectedDate}T00:00:00`)
        .lt("start_time", `${selectedDate}T23:59:59`)
        .order("start_time");

      if (selectedResource !== "all") {
        query = query.eq("resource_id", selectedResource);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookingSlots(data || []);
    } catch (error) {
      console.error("Error loading booking slots:", error);
      toast({
        title: "Error",
        description: "Failed to load booking slots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBulkSlots = async () => {
    if (!bulkCreateForm.startDate || !bulkCreateForm.endDate || !bulkCreateForm.startTime || !bulkCreateForm.endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const startDate = new Date(bulkCreateForm.startDate);
      const endDate = new Date(bulkCreateForm.endDate);
      const slotsToCreate = [];

      // Generate slots for each day in the range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Generate time slots for this day
        const startTime = bulkCreateForm.startTime;
        const endTime = bulkCreateForm.endTime;
        
        let currentTime = new Date(`${dateStr}T${startTime}:00`);
        const dayEndTime = new Date(`${dateStr}T${endTime}:00`);
        
        while (currentTime < dayEndTime) {
          const slotEndTime = new Date(currentTime.getTime() + attractionData.duration_minutes * 60000);
          
          if (slotEndTime <= dayEndTime) {
            slotsToCreate.push({
              attraction_id: attractionId,
              resource_id: bulkCreateForm.resourceId || null,
              start_time: currentTime.toISOString(),
              end_time: slotEndTime.toISOString(),
              status: 'available',
              max_capacity: bulkCreateForm.resourceId 
                ? resources.find(r => r.id === bulkCreateForm.resourceId)?.capacity || 1
                : attractionData.max_concurrent_bookings,
              current_bookings: 0,
              price_override: bulkCreateForm.priceOverride ? parseFloat(bulkCreateForm.priceOverride) : null
            });
          }
          
          // Move to next slot
          currentTime = new Date(slotEndTime.getTime());
        }
      }

      if (slotsToCreate.length === 0) {
        toast({
          title: "Error",
          description: "No valid time slots to create",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("booking_slots")
        .insert(slotsToCreate);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${slotsToCreate.length} booking slots successfully!`
      });

      // Reset form
      setBulkCreateForm({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "17:00",
        resourceId: "",
        priceOverride: ""
      });

      // Reload slots
      loadBookingSlots();
    } catch (error) {
      console.error("Error creating booking slots:", error);
      toast({
        title: "Error",
        description: "Failed to create booking slots",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleSlotStatus = async (slotId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'available' ? 'blocked' : 'available';
      
      const { error } = await supabase
        .from("booking_slots")
        .update({ status: newStatus })
        .eq("id", slotId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Slot ${newStatus === 'blocked' ? 'blocked' : 'made available'}`
      });

      loadBookingSlots();
    } catch (error) {
      console.error("Error updating slot:", error);
      toast({
        title: "Error",
        description: "Failed to update slot",
        variant: "destructive"
      });
    }
  };

  const getSlotStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'booked': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const getResourceName = (resourceId: string | null) => {
    if (!resourceId) return "Any Resource";
    const resource = resources.find(r => r.id === resourceId);
    return resource?.name || "Unknown Resource";
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Calendar - {attractionData.name}
          </CardTitle>
          <CardDescription>
            Manage available time slots for customer bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Resource:</Label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {resources.map(resource => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name} (Cap: {resource.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={loadBookingSlots}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Slot Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Booking Slots
          </CardTitle>
          <CardDescription>
            Generate multiple time slots at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={bulkCreateForm.startDate}
                onChange={(e) => setBulkCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={bulkCreateForm.endDate}
                onChange={(e) => setBulkCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={bulkCreateForm.startTime}
                onChange={(e) => setBulkCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={bulkCreateForm.endTime}
                onChange={(e) => setBulkCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resource (Optional)</Label>
              <Select
                value={bulkCreateForm.resourceId || "any"}
                onValueChange={(value) => setBulkCreateForm(prev => ({ ...prev, resourceId: value === "any" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Resource</SelectItem>
                  {resources.map(resource => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name} (Capacity: {resource.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price Override (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={`Default: $${attractionData.base_price}`}
                value={bulkCreateForm.priceOverride}
                onChange={(e) => setBulkCreateForm(prev => ({ ...prev, priceOverride: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-700">
              Slots will be created every {attractionData.duration_minutes} minutes between the specified times.
              Each slot will have a capacity of {attractionData.max_concurrent_bookings} booking(s).
            </p>
          </div>
          
          <Button onClick={createBulkSlots} disabled={creating} className="w-full">
            {creating ? "Creating Slots..." : "Create Time Slots"}
          </Button>
        </CardContent>
      </Card>

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle>
            Available Slots - {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
          <CardDescription>
            Click on slots to toggle availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading slots...</div>
          ) : bookingSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No booking slots available for this date.</p>
              <p className="text-sm">Create some slots using the form above.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {bookingSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors hover:shadow-md ${getSlotStatusColor(slot.status)}`}
                  onClick={() => toggleSlotStatus(slot.id, slot.status)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="font-medium">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {slot.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {slot.current_bookings}/{slot.max_capacity}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${slot.price_override || attractionData.base_price}
                        </span>
                        <span>{getResourceName(slot.resource_id)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarBookingSystem;
