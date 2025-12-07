import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  Plus,
  Search,
  UsersRound,
  Mail,
  Phone,
  ExternalLink,
  Edit,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Package,
  Copy,
  Check,
  Ticket,
  DollarSign,
  TrendingUp,
  Building2,
  User,
  CreditCard,
  Link,
  Key,
  ChevronRight,
  MoreHorizontal,
  Upload,
  X,
  Image,
  Loader2,
} from "lucide-react";
import GroupAllocations from "./GroupAllocations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  passkey: string | null;
  total_allocations?: number;
  total_sold?: number;
  total_revenue?: number;
  total_discounts?: number;
}

interface GroupFormData {
  name: string;
  description: string;
  logo_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_address: string;
  url_slug: string;
  passkey: string;
}

const WIZARD_STEPS = [
  { id: 1, title: "Group Details", icon: Building2, description: "Name and description" },
  { id: 2, title: "Contact Info", icon: User, description: "Primary contact" },
  { id: 3, title: "Billing", icon: CreditCard, description: "Billing details" },
  { id: 4, title: "Portal Access", icon: Key, description: "URL and passkey" },
];

export const GroupsManagement: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization, loading: orgLoading } = useOrganizations();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupForAllocations, setSelectedGroupForAllocations] = useState<Group | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    description: "",
    logo_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    billing_contact_name: "",
    billing_contact_email: "",
    billing_address: "",
    url_slug: "",
    passkey: "",
  });

  useEffect(() => {
    if (currentOrganization) {
      loadGroups(currentOrganization.id);
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [currentOrganization, orgLoading]);

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
        passkey: string | null;
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
          passkey: group.passkey,
          total_allocations: allocations.reduce((sum, a) => sum + a.allocated_quantity, 0),
          total_sold: allocations.reduce((sum, a) => sum + a.used_quantity, 0),
          total_revenue: sales.reduce((sum, s) => sum + (s.paid_price || 0), 0),
          total_discounts: sales.reduce((sum, s) => sum + (s.discount_amount || 0), 0),
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

  const generatePasskey = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleInputChange = (field: keyof GroupFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "name") {
      setFormData((prev) => ({
        ...prev,
        url_slug: generateUrlSlug(value),
      }));
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setWizardStep(1);
    setFormData({
      name: "",
      description: "",
      logo_url: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      billing_contact_name: "",
      billing_contact_email: "",
      billing_address: "",
      url_slug: "",
      passkey: generatePasskey(),
    });
    setShowGroupDialog(true);
  };

  const handleEditGroup = async (group: Group) => {
    setEditingGroup(group);
    setWizardStep(1);

    try {
      const { data: fullGroup, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", group.id)
        .single();

      if (error) throw error;

      setFormData({
        name: fullGroup.name,
        description: fullGroup.description || "",
        logo_url: fullGroup.logo_url || "",
        contact_name: fullGroup.contact_name || "",
        contact_email: fullGroup.contact_email,
        contact_phone: fullGroup.contact_phone || "",
        billing_contact_name: fullGroup.billing_contact_name || "",
        billing_contact_email: fullGroup.billing_contact_email || "",
        billing_address: fullGroup.billing_address || "",
        url_slug: fullGroup.url_slug || "",
        passkey: fullGroup.passkey || "",
      });
    } catch (error) {
      console.error("Error fetching group details:", error);
      setFormData({
        name: group.name,
        description: group.description || "",
        logo_url: group.logo_url || "",
        contact_name: group.contact_name || "",
        contact_email: group.contact_email,
        contact_phone: group.contact_phone || "",
        billing_contact_name: "",
        billing_contact_email: "",
        billing_address: "",
        url_slug: group.url_slug || "",
        passkey: group.passkey || "",
      });
    }

    setShowGroupDialog(true);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.contact_email.trim().length > 0;
      case 3:
        return true; // Billing is optional
      case 4:
        return formData.passkey.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => Math.min(prev + 1, 4));
    } else {
      toast({
        title: "Required Fields",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
      });
    }
  };

  const handlePrevStep = () => {
    setWizardStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveGroup = async () => {
    if (!currentOrganization) return;

    if (!formData.name || !formData.contact_email || !formData.passkey) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update({
            name: formData.name,
            description: formData.description,
            logo_url: formData.logo_url || null,
            contact_name: formData.contact_name,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            billing_contact_name: formData.billing_contact_name,
            billing_contact_email: formData.billing_contact_email,
            billing_address: formData.billing_address,
            url_slug: formData.url_slug,
            passkey: formData.passkey,
          })
          .eq("id", editingGroup.id);

        if (error) throw error;

        toast({
          title: "Group Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase.from("groups").insert({
          organization_id: currentOrganization.id,
          name: formData.name,
          description: formData.description,
          logo_url: formData.logo_url || null,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          billing_contact_name: formData.billing_contact_name,
          billing_contact_email: formData.billing_contact_email,
          billing_address: formData.billing_address,
          url_slug: formData.url_slug,
          passkey: formData.passkey,
          is_active: true,
        });

        if (error) throw error;

        toast({
          title: "Group Created",
          description: `${formData.name} has been created. You can now allocate tickets to this group.`,
        });
      }

      setShowGroupDialog(false);
      loadGroups(currentOrganization.id);
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save group",
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
        title: "Group Deleted",
        description: "The group has been deleted.",
      });

      if (currentOrganization) {
        loadGroups(currentOrganization.id);
      }
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, groupId: string, type: "url" | "passkey") => {
    navigator.clipboard.writeText(text);
    setCopiedGroupId(`${groupId}-${type}`);
    toast({
      title: "Copied!",
      description: type === "url" ? "Portal URL copied to clipboard" : "Passkey copied to clipboard",
    });
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show allocations view
  if (selectedGroupForAllocations && currentOrganization) {
    const portalUrl = selectedGroupForAllocations.url_slug
      ? `${window.location.origin}/group/${selectedGroupForAllocations.url_slug}`
      : undefined;

    return (
      <GroupAllocations
        groupId={selectedGroupForAllocations.id}
        groupName={selectedGroupForAllocations.name}
        organizationId={currentOrganization.id}
        onBack={() => setSelectedGroupForAllocations(null)}
        groupPortalUrl={portalUrl}
        groupPasskey={selectedGroupForAllocations.passkey || undefined}
      />
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `group-logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        logo_url: urlData.publicUrl,
      }));

      toast({
        title: "Logo uploaded",
        description: "Your group logo has been uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo_url: "",
    }));
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Auckland Youth Ministry"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of the group..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This helps you identify the group and its purpose.
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Group Logo</Label>
              {formData.logo_url ? (
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                    <img
                      src={formData.logo_url}
                      alt="Group logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Logo uploaded successfully
                    </p>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="pointer-events-none"
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                          ) : (
                            <><Upload className="h-4 w-4 mr-2" /> Replace</>
                          )}
                        </Button>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <div className="border-2 border-dashed rounded-xl p-6 hover:border-primary hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center gap-2 text-center">
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Click to upload logo</p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG up to 2MB
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                This logo will be displayed on the group's public widget page.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
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
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                  placeholder="+64 21 123 4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email <span className="text-destructive">*</span></Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange("contact_email", e.target.value)}
                placeholder="john@organization.org"
              />
              <p className="text-xs text-muted-foreground">
                This is where we'll send notifications and invoices.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Billing information is optional. You can add it later if needed for invoicing.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_contact_name">Billing Contact</Label>
                <Input
                  id="billing_contact_name"
                  value={formData.billing_contact_name}
                  onChange={(e) => handleInputChange("billing_contact_name", e.target.value)}
                  placeholder="Accounts Payable"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_contact_email">Billing Email</Label>
                <Input
                  id="billing_contact_email"
                  type="email"
                  value={formData.billing_contact_email}
                  onChange={(e) => handleInputChange("billing_contact_email", e.target.value)}
                  placeholder="billing@organization.org"
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
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url_slug">Portal URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-muted rounded-md border">
                  <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">
                    {window.location.origin}/group/
                  </span>
                  <Input
                    id="url_slug"
                    value={formData.url_slug}
                    onChange={(e) => handleInputChange("url_slug", e.target.value)}
                    placeholder="auckland-youth"
                    className="border-0 bg-transparent font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with group coordinators to access their portal.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="passkey">Portal Passkey <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange("passkey", generatePasskey())}
                  className="h-7 text-xs"
                >
                  Generate New
                </Button>
              </div>
              <Input
                id="passkey"
                value={formData.passkey}
                onChange={(e) => handleInputChange("passkey", e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="font-mono text-lg tracking-widest text-center"
              />
              <p className="text-xs text-muted-foreground">
                Group coordinators will need this passkey to access their admin portal.
              </p>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-3 text-sm">Share with Group Coordinator</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <div>
                    <span className="text-muted-foreground">Portal: </span>
                    <span className="font-mono">{window.location.origin}/group/{formData.url_slug || "..."}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <div>
                    <span className="text-muted-foreground">Passkey: </span>
                    <span className="font-mono font-bold">{formData.passkey || "..."}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">
            Manage group allocations for schools, churches, and organizations
          </p>
        </div>
        <Button onClick={handleCreateGroup} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Groups List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredGroups.length === 0 && groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <UsersRound className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Create Your First Group</h3>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                  Groups let you allocate ticket blocks to schools, churches, or organizations.
                  They get their own portal to manage their allocation.
                </p>
              </div>
              <Button onClick={handleCreateGroup} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No groups found matching "{searchQuery}"</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group/card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGroupForAllocations(group)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                      {group.is_active ? (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400 shrink-0">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                      )}
                    </div>
                    {group.description && (
                      <CardDescription className="mt-1 line-clamp-1">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupForAllocations(group);
                      }}>
                        <Package className="mr-2 h-4 w-4" />
                        Manage Allocations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleEditGroup(group);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Group
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        if (group.url_slug) {
                          window.open(`/group/${group.url_slug}`, "_blank");
                        }
                      }}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Portal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{group.contact_email}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{group.total_allocations || 0}</div>
                    <div className="text-xs text-muted-foreground">Allocated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{group.total_sold || 0}</div>
                    <div className="text-xs text-muted-foreground">Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">${(group.total_revenue || 0).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>

                {/* Quick Actions */}
                {group.url_slug && (
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => copyToClipboard(`${window.location.origin}/group/${group.url_slug}`, group.id, "url")}
                    >
                      {copiedGroupId === `${group.id}-url` ? (
                        <><Check className="h-3 w-3 mr-1" /> Copied</>
                      ) : (
                        <><Link className="h-3 w-3 mr-1" /> Copy URL</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => copyToClipboard(group.passkey || "", group.id, "passkey")}
                    >
                      {copiedGroupId === `${group.id}-passkey` ? (
                        <><Check className="h-3 w-3 mr-1" /> Copied</>
                      ) : (
                        <><Key className="h-3 w-3 mr-1" /> Copy Passkey</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Click hint */}
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <span>Click to manage allocations</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog with Wizard */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update the group's information"
                : "Set up a new group for ticket allocations"}
            </DialogDescription>
          </DialogHeader>

          {/* Wizard Steps */}
          <div className="flex items-center justify-between mb-6 px-2">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setWizardStep(step.id)}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    wizardStep === step.id
                      ? "text-primary"
                      : wizardStep > step.id
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    wizardStep === step.id
                      ? "border-primary bg-primary/10"
                      : wizardStep > step.id
                        ? "border-green-600 dark:border-green-400 bg-green-500/10"
                        : "border-muted"
                  }`}>
                    {wizardStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                    wizardStep > step.id ? "bg-green-600 dark:bg-green-400" : "bg-muted"
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[280px]">
            {renderWizardStep()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={wizardStep === 1 ? () => setShowGroupDialog(false) : handlePrevStep}
            >
              {wizardStep === 1 ? "Cancel" : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </>
              )}
            </Button>
            {wizardStep < 4 ? (
              <Button type="button" onClick={handleNextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSaveGroup}>
                {editingGroup ? "Save Changes" : "Create Group"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsManagement;
