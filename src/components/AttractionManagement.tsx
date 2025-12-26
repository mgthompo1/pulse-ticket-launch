/**
 * AttractionManagement - Modern attractions list and creation
 * Uses React Query for data management, premium V3 design
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Plus,
  Eye,
  Settings,
  Loader2,
  TrendingUp,
  Sparkles,
  Monitor,
  // Attraction type icons
  Target,
  Mic2,
  KeyRound,
  Glasses,
  CircleDot,
  Compass,
  GraduationCap,
  Heart,
  Bike,
  LayoutGrid,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const ATTRACTION_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "golf_simulator", label: "Golf Simulator", icon: Target },
  { value: "karaoke_room", label: "Karaoke Room", icon: Mic2 },
  { value: "escape_room", label: "Escape Room", icon: KeyRound },
  { value: "vr_experience", label: "VR Experience", icon: Glasses },
  { value: "bowling_lane", label: "Bowling Lane", icon: CircleDot },
  { value: "tour", label: "Tour / Activity", icon: Compass },
  { value: "workshop", label: "Workshop / Class", icon: GraduationCap },
  { value: "spa_service", label: "Spa / Wellness", icon: Heart },
  { value: "rental", label: "Equipment Rental", icon: Bike },
  { value: "other", label: "Other", icon: LayoutGrid }
];

const getAttractionType = (type: string) => ATTRACTION_TYPES.find(t => t.value === type);

const AttractionManagement: React.FC<AttractionManagementProps> = ({
  organizationId,
  onAttractionSelect
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    venue: "",
    attraction_type: "",
    duration_minutes: 60,
    base_price: 0,
    max_concurrent_bookings: 1
  });

  // Fetch attractions with React Query
  const { data: attractions = [], isLoading } = useQuery({
    queryKey: ['org-attractions', organizationId],
    queryFn: async () => {
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

      return (data || []).map(attraction => ({
        ...attraction,
        bookings_count: attraction.attraction_bookings?.length || 0,
        revenue: attraction.attraction_bookings?.reduce((sum: number, booking: any) =>
          booking.booking_status === 'confirmed' ? sum + parseFloat(booking.total_amount || 0) : sum, 0
        ) || 0
      })) as Attraction[];
    },
    enabled: !!organizationId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("attractions")
        .insert({
          organization_id: organizationId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          venue: formData.venue?.trim() || null,
          attraction_type: formData.attraction_type,
          duration_minutes: Math.max(1, formData.duration_minutes),
          base_price: Math.max(0, formData.base_price),
          max_concurrent_bookings: Math.max(1, formData.max_concurrent_bookings),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org-attractions', organizationId] });
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        venue: "",
        attraction_type: "",
        duration_minutes: 60,
        base_price: 0,
        max_concurrent_bookings: 1
      });
      toast({ title: "Attraction created!" });
      // Auto-select the new attraction to open editor
      if (onAttractionSelect) {
        onAttractionSelect(data as Attraction);
      }
    },
    onError: (error) => {
      console.error('❌ Failed to create attraction:', error);
      toast({ title: "Failed to create attraction", description: String(error), variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.attraction_type) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  // Calculate totals
  const totalBookings = attractions.reduce((sum, a) => sum + (a.bookings_count || 0), 0);
  const totalRevenue = attractions.reduce((sum, a) => sum + (a.revenue || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Attractions</h2>
          <p className="text-muted-foreground">Manage your bookable experiences</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Attraction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Create New Attraction
              </DialogTitle>
              <DialogDescription>
                Set up a new bookable experience for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sunset Kayak Tour"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.attraction_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, attraction_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRACTION_TYPES.map(type => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-muted-foreground" />
                              <span>{type.label}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="e.g., Marina Bay, Auckland"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Bookings</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.max_concurrent_bookings}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_concurrent_bookings: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your attraction..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Attraction
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {attractions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Attractions</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{attractions.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-emerald-500/10 border-green-200 dark:border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-emerald-400 font-medium">Total Bookings</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-emerald-100">{totalBookings}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-violet-500/10 border-purple-200 dark:border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-violet-400 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-violet-100">${totalRevenue.toFixed(0)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attractions Grid */}
      {attractions.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No attractions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first attraction to start accepting bookings
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Attraction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {attractions.map((attraction, index) => (
            <motion.div
              key={attraction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 cursor-pointer",
                  "bg-card hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-primary/5",
                  "border border-border/50 hover:border-primary/30",
                  attraction.status !== 'active' && "opacity-60"
                )}
                onClick={() => onAttractionSelect?.(attraction)}
              >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80" />

                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center shadow-sm">
                      {(() => {
                        const IconComponent = getAttractionType(attraction.attraction_type)?.icon || LayoutGrid;
                        return <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">{attraction.name}</h3>
                        <Badge
                          variant={attraction.status === 'active' ? 'default' : 'secondary'}
                          className={cn(
                            "text-xs shrink-0",
                            attraction.status === 'active' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                          )}
                        >
                          {attraction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getAttractionType(attraction.attraction_type)?.label}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {attraction.venue && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate uppercase tracking-wide text-xs font-medium">{attraction.venue}</span>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border/50">
                      <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
                      <p className="text-sm font-semibold text-foreground">{attraction.duration_minutes}m</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border/50">
                      <DollarSign className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${attraction.base_price}</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border/50">
                      <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
                      <p className="text-sm font-semibold text-foreground">{attraction.bookings_count}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/50 hover:bg-muted/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/attraction/${attraction.id}`, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      Preview
                    </Button>
                    {attraction.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border/50 hover:bg-muted/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/ticketflolive/attraction/${attraction.id}`, '_blank');
                        }}
                      >
                        <Monitor className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">TicketFloLIVE</span>
                        <span className="sm:hidden">Live</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAttractionSelect?.(attraction);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1.5" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttractionManagement;
