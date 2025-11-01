import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  MapPin,
  Ticket,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
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
      // 1. Load group by slug
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

      // 2. Load active allocations for this group
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

      // Filter to only allocations with remaining tickets
      const activeAllocations = (allocationsData as GroupAllocation[] || []).filter((allocation) => {
        const remaining =
          allocation.allocated_quantity -
          allocation.used_quantity -
          allocation.reserved_quantity;
        return remaining > 0 && allocation.events.status === "published";
      });

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
      allocation.allocated_quantity -
      allocation.used_quantity -
      allocation.reserved_quantity
    );
  };

  const handleBuyTickets = (eventId: string, groupId: string, allocationId: string) => {
    // Navigate to the normal ticket widget with group context
    navigate(
      `/widget/${eventId}?groupId=${groupId}&allocationId=${allocationId}&source=group`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading group information...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">
                  {error || "Group Not Found"}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {error ||
                    "The group you're looking for doesn't exist or has been deactivated."}
                </p>
              </div>
              <Button onClick={() => navigate("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            {group.logo_url && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={group.logo_url}
                  alt={group.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Group Portal
                </Badge>
              </div>
              {group.description && (
                <p className="text-muted-foreground mt-2">{group.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <span>Powered by {group.organizations.name}</span>
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {allocations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4 py-8">
                <Ticket className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-xl">No Tickets Available</h3>
                  <p className="text-muted-foreground mt-2">
                    There are currently no tickets available for this group.
                    <br />
                    Please check back later or contact your group coordinator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Available Events</h2>
              <p className="text-muted-foreground">
                Tickets exclusively for {group.name} members
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allocations.map((allocation) => {
                const remaining = getRemainingTickets(allocation);
                const usagePercent = Math.round(
                  (allocation.used_quantity / allocation.allocated_quantity) * 100
                );

                return (
                  <Card key={allocation.id} className="overflow-hidden">
                    {allocation.events.logo_url && (
                      <div className="h-48 overflow-hidden bg-gray-100">
                        <img
                          src={allocation.events.logo_url}
                          alt={allocation.events.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">
                        {allocation.events.name}
                      </CardTitle>
                      <CardDescription>
                        {allocation.events.description || "No description available"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Event Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(allocation.events.event_date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        {allocation.events.venue && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{allocation.events.venue}</span>
                          </div>
                        )}
                      </div>

                      {/* Ticket Type */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {allocation.ticket_types.name}
                            </p>
                            {allocation.ticket_types.description && (
                              <p className="text-xs text-muted-foreground">
                                {allocation.ticket_types.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            ${allocation.ticket_types.price.toFixed(2)}
                          </Badge>
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Availability</span>
                          <span className="font-semibold">
                            {remaining} of {allocation.allocated_quantity} remaining
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        {remaining < 10 && remaining > 0 && (
                          <p className="text-xs text-amber-600 font-medium">
                            Only {remaining} tickets left!
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        className="w-full"
                        onClick={() =>
                          handleBuyTickets(
                            allocation.events.id,
                            group.id,
                            allocation.id
                          )
                        }
                        disabled={remaining === 0}
                      >
                        {remaining === 0 ? (
                          "Sold Out"
                        ) : (
                          <>
                            <Ticket className="mr-2 h-4 w-4" />
                            Buy Tickets
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
      <div className="border-t bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              This is a dedicated portal for {group.name} members
            </p>
            <p className="mt-1">
              Questions? Contact your group coordinator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupPublicWidget;
