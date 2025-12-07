import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  MapPin,
  Ticket,
  Users,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Star,
  ChevronRight,
  Tag,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  organization_id: string;
  organizations: {
    name: string;
    logo_url: string | null;
  };
}

interface GroupAllocation {
  id: string;
  allocated_quantity: number;
  used_quantity: number;
  reserved_quantity: number;
  full_price: number;
  minimum_price: number | null;
  events: {
    id: string;
    name: string;
    description: string | null;
    event_date: string;
    venue: string | null;
    capacity: number;
    logo_url: string | null;
    status: string;
  };
  ticket_types: {
    id: string;
    name: string;
    price: number;
    description: string | null;
  };
}

export const GroupPublicWidget = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [allocations, setAllocations] = useState<GroupAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadGroupAndAllocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadGroupAndAllocations = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          *,
          organizations (
            name,
            logo_url
          )
        `)
        .eq("url_slug", slug)
        .eq("is_active", true)
        .single();

      if (groupError) {
        if (groupError.code === "PGRST116") {
          setError("Group not found. Please check the URL and try again.");
        } else {
          throw groupError;
        }
        return;
      }

      setGroup(groupData as Group);

      const { data: allocationsData, error: allocationsError } = await supabase
        .from("group_ticket_allocations")
        .select(`
          *,
          events (
            id,
            name,
            description,
            event_date,
            venue,
            capacity,
            logo_url,
            status
          ),
          ticket_types (
            id,
            name,
            price,
            description
          )
        `)
        .eq("group_id", groupData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (allocationsError) throw allocationsError;

      const activeAllocations = ((allocationsData as GroupAllocation[]) || []).filter(
        (allocation) => {
          const remaining =
            allocation.allocated_quantity -
            allocation.used_quantity -
            allocation.reserved_quantity;
          return remaining > 0 && allocation.events.status === "published";
        }
      );

      setAllocations(activeAllocations);
    } catch (err) {
      console.error("Error loading group data:", err);
      setError("Failed to load group information. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load group information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTickets = (allocation: GroupAllocation) => {
    return (
      allocation.allocated_quantity - allocation.used_quantity - allocation.reserved_quantity
    );
  };

  const handleBuyTickets = (eventId: string, groupId: string, allocationId: string) => {
    navigate(`/widget/${eventId}?groupId=${groupId}&allocationId=${allocationId}&source=group`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/40 to-background p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="pt-12 pb-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">{error ? "Error" : "Group Not Found"}</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {error || "The group you're looking for doesn't exist or has been deactivated."}
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="mt-4">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {group.logo_url ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-border">
                <img
                  src={group.logo_url}
                  alt={group.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-border">
                <Users className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <Badge className="bg-primary/10 text-primary border-0">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Exclusive Access
                </Badge>
              </div>
              {group.description && (
                <p className="text-muted-foreground mt-2 max-w-2xl">{group.description}</p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                  <span>Powered by</span>
                  <span className="font-medium text-foreground">{group.organizations.name}</span>
                  {group.organizations.logo_url && (
                    <img
                      src={group.organizations.logo_url}
                      alt={group.organizations.name}
                      className="h-5 w-5 rounded"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {allocations.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Ticket className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-2xl">No Tickets Available</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    There are currently no tickets available for this group. Please check back
                    later or contact your group coordinator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wide">
                    Member Exclusive
                  </span>
                </div>
                <h2 className="text-2xl font-bold">Available Events</h2>
                <p className="text-muted-foreground">
                  Special ticket access for {group.name} members
                </p>
              </div>
              <Badge variant="outline" className="text-sm py-1.5 px-3">
                {allocations.length} event{allocations.length !== 1 ? "s" : ""} available
              </Badge>
            </div>

            {/* Event Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allocations.map((allocation) => {
                const remaining = getRemainingTickets(allocation);
                const usagePercent = Math.round(
                  (allocation.used_quantity / allocation.allocated_quantity) * 100
                );
                const isLowStock = remaining <= 10 && remaining > 0;
                const isAlmostGone = remaining <= 5 && remaining > 0;

                return (
                  <Card
                    key={allocation.id}
                    className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300"
                  >
                    {/* Event Image */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                      {allocation.events.logo_url ? (
                        <img
                          src={allocation.events.logo_url}
                          alt={allocation.events.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Ticket className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      {/* Overlay badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {isAlmostGone && (
                          <Badge className="bg-red-500 text-white border-0 shadow-lg">
                            <Clock className="h-3 w-3 mr-1" />
                            Almost Gone!
                          </Badge>
                        )}
                        {isLowStock && !isAlmostGone && (
                          <Badge className="bg-orange-500 text-white border-0 shadow-lg">
                            <Clock className="h-3 w-3 mr-1" />
                            Selling Fast
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white text-gray-900 border-0 shadow-lg font-bold">
                          ${allocation.ticket_types.price.toFixed(2)}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 space-y-4">
                      {/* Event Title */}
                      <div>
                        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {allocation.events.name}
                        </h3>
                        {allocation.events.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {allocation.events.description}
                          </p>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatDate(allocation.events.event_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(allocation.events.event_date)}
                            </div>
                          </div>
                        </div>
                        {allocation.events.venue && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-muted-foreground line-clamp-1">
                              {allocation.events.venue}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ticket Type */}
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {allocation.ticket_types.name}
                          </span>
                          {allocation.ticket_types.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {allocation.ticket_types.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Availability Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Availability</span>
                          <span
                            className={`font-semibold ${isAlmostGone ? "text-red-600" : isLowStock ? "text-orange-600" : ""}`}
                          >
                            {remaining} left
                          </span>
                        </div>
                        <Progress
                          value={usagePercent}
                          className={`h-2 ${isAlmostGone ? "[&>div]:bg-red-500" : isLowStock ? "[&>div]:bg-orange-500" : ""}`}
                        />
                      </div>

                      {/* CTA Button */}
                      <Button
                        className="w-full h-12 text-base font-semibold group/btn"
                        onClick={() =>
                          handleBuyTickets(allocation.events.id, group.id, allocation.id)
                        }
                        disabled={remaining === 0}
                      >
                        {remaining === 0 ? (
                          "Sold Out"
                        ) : (
                          <>
                            Get Tickets
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-card mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              {group.logo_url && (
                <img
                  src={group.logo_url}
                  alt={group.name}
                  className="h-10 w-10 rounded-lg object-contain bg-muted"
                />
              )}
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-muted-foreground">Exclusive Member Portal</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions? Contact your group coordinator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupPublicWidget;
