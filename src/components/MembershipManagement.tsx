import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembershipTiersManager } from "./MembershipTiersManager";
import { format, formatDistanceToNow, addDays } from "date-fns";
import {
  Plus,
  MoreVertical,
  Search,
  Users,
  Crown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Mail,
  Download,
  RefreshCw,
  UserPlus,
  Edit,
  Trash2,
  CreditCard,
  Calendar,
  Clock,
  Filter,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Pause,
} from "lucide-react";
import {
  Membership,
  MembershipTier,
  MembershipStatus,
  MembershipStats,
  CreateMembershipInput,
} from "@/types/membership";

interface MembershipManagementProps {
  organizationId: string;
}

const STATUS_CONFIG: Record<MembershipStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: XCircle },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  paused: { label: "Paused", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Pause },
};

export const MembershipManagement = ({ organizationId }: MembershipManagementProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("members");
  const [members, setMembers] = useState<Membership[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [stats, setStats] = useState<MembershipStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    newThisMonth: 0,
    churnedThisMonth: 0,
    recurringRevenue: 0,
    revenueByTier: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<Membership | null>(null);

  // Add member form state
  const [newMember, setNewMember] = useState<CreateMembershipInput>({
    tier_id: "",
    customer_email: "",
    customer_name: "",
    customer_phone: "",
    auto_renew: true,
    notes: "",
    send_welcome_email: true,
  });

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load tiers from Supabase
      const { data: tiersData, error: tiersError } = await supabase
        .from("membership_tiers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });

      if (tiersError) throw tiersError;

      // Load benefits for tiers
      const tierIds = tiersData?.map(t => t.id) || [];
      let benefitsData: any[] = [];
      if (tierIds.length > 0) {
        const { data: benefits, error: benefitsError } = await supabase
          .from("membership_benefits")
          .select("*")
          .in("tier_id", tierIds);
        if (benefitsError) throw benefitsError;
        benefitsData = benefits || [];
      }

      const loadedTiers: MembershipTier[] = (tiersData || []).map(tier => ({
        ...tier,
        current_members: 0,
        benefits: benefitsData.filter(b => b.tier_id === tier.id),
      }));
      setTiers(loadedTiers);

      // Load members from Supabase
      const { data: membersData, error: membersError } = await supabase
        .from("memberships")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      const loadedMembers: Membership[] = (membersData || []).map(m => ({
        ...m,
        tier: loadedTiers.find(t => t.id === m.tier_id),
      }));
      setMembers(loadedMembers);

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = addDays(now, 30);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeMembers = loadedMembers.filter((m) => m.status === "active");
      const expiringSoon = loadedMembers.filter(
        (m) =>
          m.status === "active" &&
          m.end_date &&
          new Date(m.end_date) <= thirtyDaysFromNow &&
          new Date(m.end_date) > now
      );
      const newThisMonth = loadedMembers.filter(
        (m) => new Date(m.created_at) >= startOfMonth
      );
      const churnedThisMonth = loadedMembers.filter(
        (m) =>
          m.status === "cancelled" &&
          m.cancelled_at &&
          new Date(m.cancelled_at) >= startOfMonth
      );

      // Calculate recurring revenue
      const recurringRevenue = activeMembers.reduce((sum, m) => {
        const tier = loadedTiers.find((t: MembershipTier) => t.id === m.tier_id);
        if (!tier) return sum;
        // Normalize to monthly
        const monthlyRate =
          tier.interval === "monthly"
            ? tier.price
            : tier.interval === "quarterly"
            ? tier.price / 3
            : tier.interval === "yearly"
            ? tier.price / 12
            : 0;
        return sum + monthlyRate;
      }, 0);

      // Revenue by tier
      const revenueByTier = loadedTiers.map((tier: MembershipTier) => {
        const tierMembers = activeMembers.filter((m) => m.tier_id === tier.id);
        return {
          tier: tier.name,
          revenue: tierMembers.length * tier.price,
          count: tierMembers.length,
        };
      });

      setStats({
        totalMembers: loadedMembers.length,
        activeMembers: activeMembers.length,
        expiringSoon: expiringSoon.length,
        newThisMonth: newThisMonth.length,
        churnedThisMonth: churnedThisMonth.length,
        recurringRevenue,
        revenueByTier,
      });
    } catch (error) {
      console.error("Error loading membership data:", error);
      toast({
        title: "Error",
        description: "Failed to load membership data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.tier_id || !newMember.customer_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate email
    if (members.some((m) => m.customer_email === newMember.customer_email && m.status === "active")) {
      toast({
        title: "Duplicate Member",
        description: "A member with this email already exists",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const tier = tiers.find((t) => t.id === newMember.tier_id);
      const now = new Date();
      const endDate = new Date(now);
      if (tier?.interval === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (tier?.interval === "quarterly") {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (tier?.interval === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { data: newMemberData, error } = await supabase
        .from("memberships")
        .insert({
          organization_id: organizationId,
          tier_id: newMember.tier_id,
          customer_email: newMember.customer_email,
          customer_name: newMember.customer_name || null,
          customer_phone: newMember.customer_phone || null,
          contact_id: newMember.contact_id || null,
          status: "active",
          start_date: now.toISOString(),
          end_date: tier?.interval === "lifetime" ? null : endDate.toISOString(),
          auto_renew: newMember.auto_renew ?? true,
          next_payment_date: tier?.interval === "lifetime" ? null : endDate.toISOString(),
          notes: newMember.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setIsAddMemberOpen(false);
      setNewMember({
        tier_id: "",
        customer_email: "",
        customer_name: "",
        customer_phone: "",
        auto_renew: true,
        notes: "",
        send_welcome_email: true,
      });

      toast({
        title: "Member Added",
        description: `${newMember.customer_email} has been added as a member`,
      });

      loadData(); // Refresh data
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMembership = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Membership Cancelled",
        description: "The membership has been cancelled",
      });
      loadData();
    } catch (error) {
      console.error("Error cancelling membership:", error);
      toast({
        title: "Error",
        description: "Failed to cancel membership",
        variant: "destructive",
      });
    }
  };

  const handleReactivateMembership = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const tier = tiers.find((t) => t.id === member.tier_id);
    const now = new Date();
    const endDate = new Date(now);
    if (tier?.interval === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (tier?.interval === "quarterly") {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (tier?.interval === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    try {
      const { error } = await supabase
        .from("memberships")
        .update({
          status: "active",
          start_date: now.toISOString(),
          end_date: tier?.interval === "lifetime" ? null : endDate.toISOString(),
          cancelled_at: null,
          cancellation_reason: null,
        })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Membership Reactivated",
        description: "The membership has been reactivated",
      });
      loadData();
    } catch (error) {
      console.error("Error reactivating membership:", error);
      toast({
        title: "Error",
        description: "Failed to reactivate membership",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member Deleted",
        description: "The member has been removed",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.member_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesTier = tierFilter === "all" || member.tier_id === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const getTierName = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.name || "Unknown";
  };

  const getTierColor = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.color || "#666";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.recurringRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {stats.churnedThisMonth} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membership Management</CardTitle>
                <CardDescription>
                  Manage your membership tiers and members
                </CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="tiers">Tiers</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent>
            <TabsContent value="members" className="mt-0 space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>

              {/* Members Table */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No members found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all" || tierFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first member to get started"}
                  </p>
                  {!searchQuery && statusFilter === "all" && tierFilter === "all" && (
                    <Button onClick={() => setIsAddMemberOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Renewal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => {
                        const statusConfig = STATUS_CONFIG[member.status];
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {member.customer_name || member.customer_email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.customer_email}
                                </div>
                                {member.member_number && (
                                  <div className="text-xs text-muted-foreground">
                                    {member.member_number}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-medium"
                                style={{
                                  borderColor: getTierColor(member.tier_id),
                                  color: getTierColor(member.tier_id),
                                }}
                              >
                                {getTierName(member.tier_id)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(member.start_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {member.end_date ? (
                                <div>
                                  <div>{format(new Date(member.end_date), "MMM d, yyyy")}</div>
                                  {member.auto_renew && member.status === "active" && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <RefreshCw className="h-3 w-3" />
                                      Auto-renew
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Lifetime</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {member.status === "active" ? (
                                    <DropdownMenuItem
                                      className="text-amber-600"
                                      onClick={() => handleCancelMembership(member.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Membership
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="text-emerald-600"
                                      onClick={() => handleReactivateMembership(member.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Reactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteMember(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tiers" className="mt-0">
              <MembershipTiersManager organizationId={organizationId} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Add a new member to your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tier">Membership Tier *</Label>
              <Select
                value={newMember.tier_id}
                onValueChange={(value) => setNewMember({ ...newMember, tier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers
                    .filter((t) => t.is_active)
                    .map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tier.color || "#666" }}
                          />
                          {tier.name} - ${tier.price}/{tier.interval}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newMember.customer_email}
                onChange={(e) =>
                  setNewMember({ ...newMember, customer_email: e.target.value })
                }
                placeholder="member@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newMember.customer_name}
                onChange={(e) =>
                  setNewMember({ ...newMember, customer_name: e.target.value })
                }
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={newMember.customer_phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, customer_phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newMember.notes}
                onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="auto_renew">Auto-Renew</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically renew membership
                </p>
              </div>
              <Switch
                id="auto_renew"
                checked={newMember.auto_renew}
                onCheckedChange={(checked) =>
                  setNewMember({ ...newMember, auto_renew: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="welcome_email">Send Welcome Email</Label>
                <p className="text-sm text-muted-foreground">
                  Notify member via email
                </p>
              </div>
              <Switch
                id="welcome_email"
                checked={newMember.send_welcome_email}
                onCheckedChange={(checked) =>
                  setNewMember({ ...newMember, send_welcome_email: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
