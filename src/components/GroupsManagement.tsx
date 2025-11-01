import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Search,
  UsersRound,
  Mail,
  Phone,
  ExternalLink,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  DollarSign,
  Ticket,
  ArrowLeft,
  Package,
  Copy,
  Check,
} from "lucide-react";
import GroupAllocations from "./GroupAllocations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Group {
  id: string;
  name: string;
  description: string | null;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  url_slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  // Stats from related tables
  total_allocations?: number;
  total_sold?: number;
  total_revenue?: number;
  total_discounts?: number;
}

interface GroupFormData {
  name: string;
  description: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_address: string;
  url_slug: string;
}

export const GroupsManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [selectedGroupForAllocations, setSelectedGroupForAllocations] = useState<Group | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    description: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    billing_contact_name: "",
    billing_contact_email: "",
    billing_address: "",
    url_slug: "",
  });

  useEffect(() => {
    loadOrganizationAndGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrganizationAndGroups = async () => {
    if (!user) return;

    try {
      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (orgError) throw orgError;

      setOrganizationId(orgData.id);
      await loadGroups(orgData.id);
    } catch (error) {
      console.error("Error loading organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    }
  };

  const loadGroups = async (orgId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_ticket_allocations (
            allocated_quantity,
            used_quantity
          ),
          group_ticket_sales (
            paid_price,
            discount_amount
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate stats for each group
      const groupsWithStats = (data || []).map((group: {
        id: string;
        name: string;
        description: string | null;
        contact_name: string | null;
        contact_email: string;
        contact_phone: string | null;
        url_slug: string | null;
        logo_url: string | null;
        is_active: boolean;
        created_at: string;
        group_ticket_allocations: { allocated_quantity: number; used_quantity: number }[];
        group_ticket_sales: { paid_price: number; discount_amount: number }[];
      }) => {
        const allocations = group.group_ticket_allocations || [];
        const sales = group.group_ticket_sales || [];

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          contact_name: group.contact_name,
          contact_email: group.contact_email,
          contact_phone: group.contact_phone,
          url_slug: group.url_slug,
          logo_url: group.logo_url,
          is_active: group.is_active,
          created_at: group.created_at,
          total_allocations: allocations.reduce(
            (sum, a) => sum + a.allocated_quantity,
            0
          ),
          total_sold: allocations.reduce((sum, a) => sum + a.used_quantity, 0),
          total_revenue: sales.reduce((sum, s) => sum + (s.paid_price || 0), 0),
          total_discounts: sales.reduce(
            (sum, s) => sum + (s.discount_amount || 0),
            0
          ),
        };
      });

      setGroups(groupsWithStats);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateUrlSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleInputChange = (field: keyof GroupFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate URL slug from name
    if (field === "name") {
      setFormData((prev) => ({
        ...prev,
        url_slug: generateUrlSlug(value),
      }));
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: "",
      description: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      billing_contact_name: "",
      billing_contact_email: "",
      billing_address: "",
      url_slug: "",
    });
    setShowGroupDialog(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      contact_name: group.contact_name || "",
      contact_email: group.contact_email,
      contact_phone: group.contact_phone || "",
      billing_contact_name: "",
      billing_contact_email: "",
      billing_address: "",
      url_slug: group.url_slug || "",
    });
    setShowGroupDialog(true);
  };

  const handleSaveGroup = async () => {
    if (!organizationId) return;

    if (!formData.name || !formData.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from("groups")
          .update({
            name: formData.name,
            description: formData.description,
            contact_name: formData.contact_name,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            billing_contact_name: formData.billing_contact_name,
            billing_contact_email: formData.billing_contact_email,
            billing_address: formData.billing_address,
            url_slug: formData.url_slug,
          })
          .eq("id", editingGroup.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Group updated successfully",
        });
      } else {
        // Create new group
        const { error } = await supabase.from("groups").insert({
          organization_id: organizationId,
          name: formData.name,
          description: formData.description,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          billing_contact_name: formData.billing_contact_name,
          billing_contact_email: formData.billing_contact_email,
          billing_address: formData.billing_address,
          url_slug: formData.url_slug,
          is_active: true,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Group created successfully",
        });
      }

      setShowGroupDialog(false);
      if (organizationId) {
        loadGroups(organizationId);
      }
    } catch (error) {
      console.error("Error saving group:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save group";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });

      if (organizationId) {
        loadGroups(organizationId);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete group";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const copyGroupUrl = (slug: string, groupId: string) => {
    const url = `${window.location.origin}/group/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedGroupId(groupId);
    toast({
      title: "URL Copied!",
      description: "Group URL has been copied to clipboard",
    });
    // Reset copied state after 2 seconds
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If viewing allocations for a specific group, show that view
  if (selectedGroupForAllocations && organizationId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedGroupForAllocations(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
        </div>
        <GroupAllocations
          groupId={selectedGroupForAllocations.id}
          groupName={selectedGroupForAllocations.name}
          organizationId={organizationId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Groups</h2>
          <p className="text-muted-foreground">
            Manage groups and allocate ticket inventory
          </p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading groups...</p>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <UsersRound className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No groups yet</h3>
                <p className="text-muted-foreground">
                  Create your first group to start allocating tickets
                </p>
              </div>
              <Button onClick={handleCreateGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {group.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedGroupForAllocations(group)}>
                        <Package className="mr-2 h-4 w-4" />
                        View Allocations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Group
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Badge variant={group.is_active ? "default" : "secondary"} className="w-fit mt-2">
                  {group.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{group.contact_email}</span>
                  </div>
                  {group.contact_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{group.contact_phone}</span>
                    </div>
                  )}
                </div>

                {/* Group URL with Copy Button */}
                {group.url_slug && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ExternalLink className="h-4 w-4 text-primary" />
                        <span>Group URL</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyGroupUrl(group.url_slug!, group.id)}
                        className="h-7 px-2"
                      >
                        {copiedGroupId === group.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-600" />
                            <span className="text-xs text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <code className="text-xs font-mono block truncate text-muted-foreground bg-background px-2 py-1 rounded">
                      {window.location.origin}/group/{group.url_slug}
                    </code>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Ticket className="h-3 w-3" />
                      <span className="text-xs">Allocated</span>
                    </div>
                    <p className="text-lg font-semibold">{group.total_allocations || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs">Sold</span>
                    </div>
                    <p className="text-lg font-semibold">{group.total_sold || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs">Revenue</span>
                    </div>
                    <p className="text-lg font-semibold">
                      ${(group.total_revenue || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-destructive">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs">Discounts</span>
                    </div>
                    <p className="text-lg font-semibold text-destructive">
                      ${(group.total_discounts || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update the group's information"
                : "Create a new group to allocate ticket inventory"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Auckland Youth Ministry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the group"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/group/</span>
                  <Input
                    id="url_slug"
                    value={formData.url_slug}
                    onChange={(e) => handleInputChange("url_slug", e.target.value)}
                    placeholder="auckland-youth"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for the group's custom ticket portal URL
                </p>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Primary Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange("contact_name", e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                    placeholder="john@aucklandyouth.org"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                  placeholder="+64 9 123 4567"
                />
              </div>
            </div>

            {/* Billing Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Billing Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_contact_name">Billing Contact Name</Label>
                  <Input
                    id="billing_contact_name"
                    value={formData.billing_contact_name}
                    onChange={(e) => handleInputChange("billing_contact_name", e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_contact_email">Billing Email</Label>
                  <Input
                    id="billing_contact_email"
                    type="email"
                    value={formData.billing_contact_email}
                    onChange={(e) => handleInputChange("billing_contact_email", e.target.value)}
                    placeholder="billing@aucklandyouth.org"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_address">Billing Address</Label>
                <Textarea
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => handleInputChange("billing_address", e.target.value)}
                  placeholder="123 Main Street, Auckland 1010"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGroup}>
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsManagement;
