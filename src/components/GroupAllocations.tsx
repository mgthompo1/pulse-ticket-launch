import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Calendar,
  Ticket,
  TrendingUp,
  Edit2,
  Trash2,
  MoreHorizontal,
  Package,
  Clock,
  ChevronRight,
  Percent,
  FileText,
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  Users,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AllocateTicketsDialog from "./AllocateTicketsDialog";
import GroupDiscountCodes from "./GroupDiscountCodes";
import GroupInvoices from "./GroupInvoices";

interface GroupAllocationsProps {
  groupId: string;
  groupName: string;
  organizationId: string;
  onBack?: () => void;
  groupPortalUrl?: string;
  groupPasskey?: string;
}

interface Allocation {
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
  onBack,
  groupPortalUrl,
  groupPasskey,
}) => {
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      setAllocations((data as Allocation[]) || []);
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

  const handleEditAllocation = (allocation: Allocation) => {
    setEditingAllocation(allocation);
    setShowAllocateDialog(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setShowAllocateDialog(open);
    if (!open) {
      setEditingAllocation(null);
    }
  };

  const confirmDeleteAllocation = (allocationId: string) => {
    setAllocationToDelete(allocationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return;

    try {
      const { error } = await supabase
        .from("group_ticket_allocations")
        .delete()
        .eq("id", allocationToDelete);

      if (error) throw error;

      toast({
        title: "Allocation deleted",
        description: "The ticket allocation has been removed.",
      });

      loadAllocations();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete allocation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAllocationToDelete(null);
    }
  };

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
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
        totalRevenue: acc.totalRevenue + allocation.used_quantity * allocation.full_price,
      }),
      { totalAllocated: 0, totalUsed: 0, totalReserved: 0, totalRevenue: 0 }
    );
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const stats = getTotalStats();
  const totalRemaining = stats.totalAllocated - stats.totalUsed - stats.totalReserved;
  const overallProgress = getUsagePercentage(stats.totalUsed, stats.totalAllocated);

  return (
    <div className="space-y-6">
      {/* Header with Back Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{groupName}</h2>
              <Badge variant="outline" className="text-xs">
                Group
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage allocations, discount codes, and invoices
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAllocateDialog(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Allocate Tickets
        </Button>
      </div>

      {/* Quick Access - Portal URL & Passkey */}
      {(groupPortalUrl || groupPasskey) && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Group Portal:</span>
              </div>
              {groupPortalUrl && (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded border font-mono">
                    {groupPortalUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(groupPortalUrl, "URL")}
                  >
                    {copiedField === "URL" ? (
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(groupPortalUrl, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {groupPasskey && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-muted-foreground">Passkey:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded border font-mono font-bold">
                    {groupPasskey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(groupPasskey, "Passkey")}
                  >
                    {copiedField === "Passkey" ? (
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="allocations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="allocations" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Allocations</span>
            <span className="sm:hidden">Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Discount Codes</span>
            <span className="sm:hidden">Codes</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Allocated</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalAllocated}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across {allocations.length} allocation{allocations.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sold</p>
                    <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{stats.totalUsed}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <Progress value={overallProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">{overallProgress}% of allocation</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Checkout</p>
                    <p className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{stats.totalReserved}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Pending purchase</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                    <p className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalRemaining}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Available to sell</p>
              </CardContent>
            </Card>
          </div>

          {/* Allocations Cards */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allocations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No allocations yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                      Allocate ticket inventory from your events to this group so they can sell to
                      their members.
                    </p>
                  </div>
                  <Button onClick={() => setShowAllocateDialog(true)} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Allocate Tickets
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allocations.map((allocation) => {
                const remaining = getRemainingQuantity(allocation);
                const usagePercent = getUsagePercentage(
                  allocation.used_quantity,
                  allocation.allocated_quantity
                );
                const isLowStock = remaining <= 5 && remaining > 0;
                const isSoldOut = remaining === 0;

                return (
                  <Card
                    key={allocation.id}
                    className={`overflow-hidden transition-all hover:shadow-md ${
                      !allocation.is_active ? "opacity-60" : ""
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base truncate">
                            {allocation.events.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatEventDate(allocation.events.event_date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              isSoldOut ? "destructive" : isLowStock ? "secondary" : "default"
                            }
                            className="shrink-0"
                          >
                            {allocation.ticket_types.name}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAllocation(allocation)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Allocation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => confirmDeleteAllocation(allocation.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Allocation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-6 space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sales Progress</span>
                          <span className="font-medium">{usagePercent}%</span>
                        </div>
                        <Progress
                          value={usagePercent}
                          className={`h-2 ${isSoldOut ? "[&>div]:bg-destructive" : ""}`}
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">{allocation.allocated_quantity}</p>
                          <p className="text-xs text-muted-foreground">Allocated</p>
                        </div>
                        <div className="space-y-1 p-2 rounded-lg bg-green-500/10">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {allocation.used_quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">Sold</p>
                        </div>
                        <div className="space-y-1 p-2 rounded-lg bg-orange-500/10">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {allocation.reserved_quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">Reserved</p>
                        </div>
                        <div
                          className={`space-y-1 p-2 rounded-lg ${
                            isSoldOut ? "bg-destructive/10" : "bg-blue-500/10"
                          }`}
                        >
                          <p
                            className={`text-2xl font-bold ${
                              isSoldOut ? "text-destructive" : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {remaining}
                          </p>
                          <p className="text-xs text-muted-foreground">Left</p>
                        </div>
                      </div>

                      {/* Pricing Info */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              ${allocation.full_price.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">/ticket</span>
                          </div>
                          {allocation.minimum_price && (
                            <div className="text-muted-foreground">
                              Min: ${allocation.minimum_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                        {!allocation.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {/* Low stock warning */}
                      {isLowStock && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2">
                          <Clock className="h-4 w-4" />
                          <span>Only {remaining} tickets remaining</span>
                        </div>
                      )}

                      {/* Sold out */}
                      {isSoldOut && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          <Ticket className="h-4 w-4" />
                          <span>Allocation sold out</span>
                        </div>
                      )}

                      {/* Notes */}
                      {allocation.notes && (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                          <span className="font-medium">Note:</span> {allocation.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <GroupDiscountCodes
            groupId={groupId}
            groupName={groupName}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <GroupInvoices
            groupId={groupId}
            groupName={groupName}
            organizationId={organizationId}
          />
        </TabsContent>
      </Tabs>

      {/* Allocate Dialog */}
      <AllocateTicketsDialog
        open={showAllocateDialog}
        onOpenChange={handleCloseDialog}
        organizationId={organizationId}
        preSelectedGroupId={groupId}
        editingAllocation={
          editingAllocation
            ? {
                id: editingAllocation.id,
                group_id: editingAllocation.group_id,
                event_id: editingAllocation.event_id,
                ticket_type_id: editingAllocation.ticket_type_id,
                allocated_quantity: editingAllocation.allocated_quantity,
                used_quantity: editingAllocation.used_quantity,
                reserved_quantity: editingAllocation.reserved_quantity,
                full_price: editingAllocation.full_price,
                minimum_price: editingAllocation.minimum_price,
                notes: editingAllocation.notes,
              }
            : null
        }
        onSuccess={loadAllocations}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket allocation? This action cannot be undone.
              Any sold tickets will remain valid but no new tickets can be purchased from this
              allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Allocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupAllocations;
