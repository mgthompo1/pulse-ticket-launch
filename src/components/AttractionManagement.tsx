import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Plus,
  Settings,
  Eye,
  Activity,
  CheckCircle
} from "lucide-react";

interface Attraction {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  max_concurrent_bookings: number;
  status: string;
  created_at: string;
  resource_label: string | null;
  bookings_count?: number;
  revenue?: number;
}

interface AttractionManagementProps {
  organizationId: string;
  onAttractionSelect?: (attraction: Attraction) => void;
}

// Predefined attraction types
const ATTRACTION_TYPES = [
  { value: "golf_simulator", label: "Golf Simulator", icon: "🏌️" },
  { value: "karaoke_room", label: "Karaoke Room", icon: "🎤" },
  { value: "escape_room", label: "Escape Room", icon: "🗝️" },
  { value: "vr_experience", label: "VR Experience", icon: "🥽" },
  { value: "bowling_lane", label: "Bowling Lane", icon: "🎳" },
  { value: "conference_room", label: "Conference Room", icon: "💼" },
  { value: "studio", label: "Studio", icon: "🎨" },
  { value: "tour", label: "Tour", icon: "🚶" },
  { value: "workshop", label: "Workshop", icon: "🔧" },
  { value: "other", label: "Other", icon: "📍" }
];

const AttractionManagement: React.FC<AttractionManagementProps> = ({ 
  organizationId, 
  onAttractionSelect 
}) => {
  const { toast } = useToast();
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);

  // Form state for creating new attraction
  const [attractionForm, setAttractionForm] = useState({
    name: "",
    description: "",
    venue: "",
    attraction_type: "",
    duration_minutes: 60,
    base_price: 0,
    max_concurrent_bookings: 1,
    resource_label: ""
  });

  useEffect(() => {
    if (organizationId) {
      loadAttractions();
    }
  }, [organizationId]);

  const loadAttractions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attractions")
        .select(`
          *,
          attraction_bookings (
            id,
            total_amount,
            booking_status
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate stats for each attraction
      const attractionsWithStats = data?.map(attraction => ({
        ...attraction,
        bookings_count: attraction.attraction_bookings?.length || 0,
        revenue: attraction.attraction_bookings?.reduce((sum: number, booking: any) => 
          booking.booking_status === 'confirmed' ? sum + parseFloat(booking.total_amount) : sum, 0
        ) || 0
      })) || [];

      setAttractions(attractionsWithStats as Attraction[]);
    } catch (error) {
      console.error("Error loading attractions:", error);
      toast({
        title: "Error",
        description: "Failed to load attractions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttraction = async () => {
    if (!attractionForm.name || !attractionForm.attraction_type) {
      toast({
        title: "Error",
        description: "Please fill in the required fields",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      if (isEditing && selectedAttraction) {
        // Update existing attraction
        const { error } = await supabase
          .from("attractions")
          .update({
            name: attractionForm.name,
            description: attractionForm.description || null,
            venue: attractionForm.venue || null,
            attraction_type: attractionForm.attraction_type,
            duration_minutes: attractionForm.duration_minutes,
            base_price: attractionForm.base_price,
            max_concurrent_bookings: attractionForm.max_concurrent_bookings,
            resource_label: attractionForm.resource_label || null
          })
          .eq("id", selectedAttraction.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Attraction updated successfully!"
        });
      } else {
        // Create new attraction
        const { error } = await supabase
          .from("attractions")
          .insert({
            organization_id: organizationId,
            name: attractionForm.name,
            description: attractionForm.description || null,
            venue: attractionForm.venue || null,
            attraction_type: attractionForm.attraction_type,
            duration_minutes: attractionForm.duration_minutes,
            base_price: attractionForm.base_price,
            max_concurrent_bookings: attractionForm.max_concurrent_bookings,
            resource_label: attractionForm.resource_label || null,
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Attraction created successfully!"
        });
      }

      // Reset form
      handleCancelEdit();

      // Reload attractions
      loadAttractions();
    } catch (error) {
      console.error("Error saving attraction:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} attraction`,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAttractionClick = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    onAttractionSelect?.(attraction);
  };

  const handleEditAttraction = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    setAttractionForm({
      name: attraction.name,
      description: attraction.description || "",
      venue: attraction.venue || "",
      attraction_type: attraction.attraction_type,
      duration_minutes: attraction.duration_minutes,
      base_price: attraction.base_price,
      max_concurrent_bookings: attraction.max_concurrent_bookings,
      resource_label: attraction.resource_label || ""
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedAttraction(null);
    setAttractionForm({
      name: "",
      description: "",
      venue: "",
      attraction_type: "",
      duration_minutes: 60,
      base_price: 0,
      max_concurrent_bookings: 1,
      resource_label: ""
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttractionTypeEmoji = (type: string) => {
    const attractionType = ATTRACTION_TYPES.find(t => t.value === type);
    return attractionType?.icon || '📍';
  };

  const getAttractionTypeLabel = (type: string) => {
    const attractionType = ATTRACTION_TYPES.find(t => t.value === type);
    return attractionType?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Attraction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {isEditing ? `Edit ${selectedAttraction?.name}` : 'Create New Attraction'}
          </CardTitle>
          <CardDescription>
            {isEditing ? 'Update attraction details and settings' : 'Set up a new bookable attraction or experience'}
          </CardDescription>
          {isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelEdit}
              className="w-fit"
            >
              ← Back to Create New
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attraction-name">Attraction Name *</Label>
              <Input
                id="attraction-name"
                value={attractionForm.name}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Golf Simulator 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attraction-type">Type *</Label>
              <Select
                value={attractionForm.attraction_type}
                onValueChange={(value) => setAttractionForm(prev => ({ ...prev, attraction_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select attraction type" />
                </SelectTrigger>
                <SelectContent>
                  {ATTRACTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue/Location</Label>
              <Input
                id="venue"
                value={attractionForm.venue}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="e.g., Britomart Auckland, Room A, Building 1"
              />
              <p className="text-xs text-muted-foreground">
                This location will be displayed on your booking widget
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-label">Resource Label</Label>
              <Input
                id="resource-label"
                value={attractionForm.resource_label}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, resource_label: e.target.value }))}
                placeholder="e.g., Simulator, Room, Lane, Court"
              />
              <p className="text-xs text-muted-foreground">
                What do you call your bookable resources? (e.g., "Simulator" for golf simulators, "Room" for escape rooms)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Session Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={attractionForm.duration_minutes}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Base Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={attractionForm.base_price}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concurrent">Max Concurrent Bookings</Label>
              <Input
                id="concurrent"
                type="number"
                value={attractionForm.max_concurrent_bookings}
                onChange={(e) => setAttractionForm(prev => ({ ...prev, max_concurrent_bookings: parseInt(e.target.value) || 1 }))}
                placeholder="1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={attractionForm.description}
              onChange={(e) => setAttractionForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., 5x of the latest Golf Simulators available for booking. Clubs and balls provided for a $60min session"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This description will appear at the top of your booking widget to help customers understand what you offer.
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing && (
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSaveAttraction} 
              disabled={isCreating}
              className="flex-1 md:flex-none"
            >
              {isCreating ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Attraction" : "Create Attraction")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attractions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Your Attractions
          </CardTitle>
          <CardDescription>
            Manage your bookable attractions and experiences. Click on an attraction to customize it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading attractions...</div>
          ) : attractions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attractions created yet. Create your first attraction above!
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {attractions.map((attraction) => (
                <Card
                  key={attraction.id}
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                    selectedAttraction?.id === attraction.id 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleAttractionClick(attraction)}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className={getStatusColor(attraction.status)}>
                      {attraction.status}
                    </Badge>
                  </div>

                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center text-2xl">
                        {getAttractionTypeEmoji(attraction.attraction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
                          {attraction.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {getAttractionTypeLabel(attraction.attraction_type)}
                        </p>
                        {attraction.venue && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{attraction.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {attraction.description ? (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {attraction.description}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm mb-4 italic">
                        No description set - click "Edit Details" to add one
                      </p>
                    )}

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Duration</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {attraction.duration_minutes}min
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs font-medium">From</span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ${attraction.base_price}
                        </div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{attraction.bookings_count} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${attraction.revenue?.toFixed(0) || '0'} revenue</span>
                        </div>
                      </div>
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Max {attraction.max_concurrent_bookings}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Primary Action - Book Now */}
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/attraction/${attraction.id}`, '_blank');
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Open Booking Widget
                      </Button>
                      
                      {/* Secondary Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAttraction(attraction);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Details
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/attraction/${attraction.id}`, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {selectedAttraction?.id === attraction.id && (
                      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none">
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default AttractionManagement;
