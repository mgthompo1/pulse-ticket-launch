import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllocateTicketsDialog from "./AllocateTicketsDialog";
import GroupDiscountCodes from "./GroupDiscountCodes";

interface GroupAllocationsProps {
  groupId: string;
  groupName: string;
  organizationId: string;
}

interface Allocation {
  id: string;
  event_id: string;
  ticket_type_id: string;
  allocated_quantity: number;
  used_quantity: number;
  reserved_quantity: number;
  full_price: number;
  minimum_price: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  events: {
    name: string;
    event_date: string;
  };
  ticket_types: {
    name: string;
  };
}

export const GroupAllocations: React.FC<GroupAllocationsProps> = ({
  groupId,
  groupName,
  organizationId,
}) => {
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);

  useEffect(() => {
    loadAllocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_ticket_allocations")
        .select(
          `
          *,
          events (
            name,
            event_date
          ),
          ticket_types (
            name
          )
        `
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllocations(data as Allocation[] || []);
    } catch (error) {
      console.error("Error loading allocations:", error);
      toast({
        title: "Error",
        description: "Failed to load allocations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this allocation? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("group_ticket_allocations")
        .delete()
        .eq("id", allocationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Allocation deleted successfully",
      });

      loadAllocations();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete allocation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getUsagePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const getRemainingQuantity = (allocation: Allocation) => {
    return allocation.allocated_quantity - allocation.used_quantity - allocation.reserved_quantity;
  };

  const getTotalStats = () => {
    return allocations.reduce(
      (acc, allocation) => ({
        totalAllocated: acc.totalAllocated + allocation.allocated_quantity,
        totalUsed: acc.totalUsed + allocation.used_quantity,
        totalReserved: acc.totalReserved + allocation.reserved_quantity,
      }),
      { totalAllocated: 0, totalUsed: 0, totalReserved: 0 }
    );
  };

  const stats = getTotalStats();
  const totalRemaining = stats.totalAllocated - stats.totalUsed - stats.totalReserved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{groupName}</h3>
          <p className="text-muted-foreground">
            Manage allocations and discount codes
          </p>
        </div>
        <Button onClick={() => setShowAllocateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Allocate Tickets
        </Button>
      </div>

      <Tabs defaultValue="allocations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAllocated}</div>
            <p className="text-xs text-muted-foreground">Total tickets assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalUsed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAllocated > 0
                ? `${getUsagePercentage(stats.totalUsed, stats.totalAllocated)}% of total`
                : "0% of total"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalReserved}</div>
            <p className="text-xs text-muted-foreground">In cart/checkout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalRemaining}</div>
            <p className="text-xs text-muted-foreground">Available to sell</p>
          </CardContent>
        </Card>
      </div>

      {/* Allocations Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading allocations...</p>
          </CardContent>
        </Card>
      ) : allocations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Allocations Yet</h3>
                <p className="text-muted-foreground">
                  Click "Allocate Tickets" to assign ticket inventory to this group
                </p>
              </div>
              <Button onClick={() => setShowAllocateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Allocate Tickets
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Allocations</CardTitle>
            <CardDescription>
              Ticket inventory assigned to this group across all events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => {
                  const remaining = getRemainingQuantity(allocation);
                  const usagePercent = getUsagePercentage(
                    allocation.used_quantity,
                    allocation.allocated_quantity
                  );

                  return (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{allocation.events.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(allocation.events.event_date).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{allocation.ticket_types.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{allocation.allocated_quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-green-600">
                            {allocation.used_quantity}
                          </div>
                          <Progress value={usagePercent} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-orange-600">
                          {allocation.reserved_quantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`font-semibold ${
                            remaining === 0 ? "text-destructive" : "text-blue-600"
                          }`}
                        >
                          {remaining}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-semibold">
                              {allocation.full_price.toFixed(2)}
                            </span>
                          </div>
                          {allocation.minimum_price && (
                            <div className="text-muted-foreground">
                              Min: ${allocation.minimum_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={allocation.is_active ? "default" : "secondary"}>
                          {allocation.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteAllocation(allocation.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Allocation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <GroupDiscountCodes groupId={groupId} groupName={groupName} />
        </TabsContent>
      </Tabs>

      {/* Allocate Dialog */}
      <AllocateTicketsDialog
        open={showAllocateDialog}
        onOpenChange={setShowAllocateDialog}
        organizationId={organizationId}
        preSelectedGroupId={groupId}
        onSuccess={loadAllocations}
      />
    </div>
  );
};

export default GroupAllocations;
