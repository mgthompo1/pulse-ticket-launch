import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Crown,
  Star,
  Sparkles,
  Gift,
  Ticket,
  Clock,
  Percent,
  DollarSign,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  MembershipTier,
  MembershipBenefit,
  MembershipInterval,
  BenefitType,
  CreateMembershipTierInput,
} from "@/types/membership";

interface MembershipTiersManagerProps {
  organizationId: string;
}

const INTERVAL_LABELS: Record<MembershipInterval, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  discount_percentage: "Percentage Discount",
  discount_fixed: "Fixed Discount",
  early_access: "Early Access",
  exclusive_events: "Exclusive Events",
  free_tickets: "Free Tickets",
  priority_seating: "Priority Seating",
  guest_passes: "Guest Passes",
};

const TIER_COLORS = [
  { name: "Bronze", value: "#CD7F32" },
  { name: "Silver", value: "#C0C0C0" },
  { name: "Gold", value: "#FFD700" },
  { name: "Platinum", value: "#E5E4E2" },
  { name: "Diamond", value: "#B9F2FF" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
];

const TIER_ICONS = [
  { name: "Crown", icon: Crown },
  { name: "Star", icon: Star },
  { name: "Sparkles", icon: Sparkles },
  { name: "Gift", icon: Gift },
  { name: "Ticket", icon: Ticket },
];

export const MembershipTiersManager = ({ organizationId }: MembershipTiersManagerProps) => {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateMembershipTierInput>({
    name: "",
    description: "",
    price: 0,
    interval: "yearly",
    color: TIER_COLORS[2].value,
    icon: "Crown",
    auto_renew_default: true,
    trial_days: 0,
    max_members: undefined,
    benefits: [],
  });

  // Benefit form state
  const [newBenefit, setNewBenefit] = useState({
    benefit_type: "discount_percentage" as BenefitType,
    value: 10,
    description: "",
    applies_to: "all_events" as const,
  });

  useEffect(() => {
    loadTiers();
  }, [organizationId]);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      // Fetch tiers from Supabase
      const { data: tiersData, error: tiersError } = await supabase
        .from("membership_tiers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });

      if (tiersError) throw tiersError;

      if (tiersData && tiersData.length > 0) {
        // Fetch benefits for all tiers
        const tierIds = tiersData.map(t => t.id);
        const { data: benefitsData, error: benefitsError } = await supabase
          .from("membership_benefits")
          .select("*")
          .in("tier_id", tierIds);

        if (benefitsError) throw benefitsError;

        // Fetch member counts for each tier
        const { data: memberCounts, error: countError } = await supabase
          .from("memberships")
          .select("tier_id")
          .eq("organization_id", organizationId)
          .in("status", ["active", "pending"]);

        if (countError) throw countError;

        // Count members per tier
        const countsByTier: Record<string, number> = {};
        memberCounts?.forEach(m => {
          countsByTier[m.tier_id] = (countsByTier[m.tier_id] || 0) + 1;
        });

        // Combine tiers with their benefits and member counts
        const tiersWithBenefits: MembershipTier[] = tiersData.map(tier => ({
          ...tier,
          current_members: countsByTier[tier.id] || 0,
          benefits: (benefitsData || []).filter(b => b.tier_id === tier.id) as MembershipBenefit[],
        }));

        setTiers(tiersWithBenefits);
      } else {
        setTiers([]);
      }
    } catch (error) {
      console.error("Error loading tiers:", error);
      toast({
        title: "Error",
        description: "Failed to load membership tiers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (tier?: MembershipTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || "",
        price: tier.price,
        interval: tier.interval,
        color: tier.color || TIER_COLORS[0].value,
        icon: tier.icon || "Crown",
        auto_renew_default: tier.auto_renew_default,
        trial_days: tier.trial_days || 0,
        max_members: tier.max_members || undefined,
        benefits: tier.benefits,
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        interval: "yearly",
        color: TIER_COLORS[2].value,
        icon: "Crown",
        auto_renew_default: true,
        trial_days: 0,
        max_members: undefined,
        benefits: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!formData.name || formData.price < 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingTier) {
        // Update existing tier
        const { error: tierError } = await supabase
          .from("membership_tiers")
          .update({
            name: formData.name,
            description: formData.description || null,
            price: formData.price,
            interval: formData.interval,
            color: formData.color || null,
            icon: formData.icon || null,
            auto_renew_default: formData.auto_renew_default ?? true,
            trial_days: formData.trial_days || null,
            max_members: formData.max_members || null,
          })
          .eq("id", editingTier.id);

        if (tierError) throw tierError;

        // Delete existing benefits and insert new ones
        await supabase
          .from("membership_benefits")
          .delete()
          .eq("tier_id", editingTier.id);

        if (formData.benefits && formData.benefits.length > 0) {
          const benefitsToInsert = formData.benefits.map(b => ({
            tier_id: editingTier.id,
            benefit_type: b.benefit_type,
            value: b.value,
            description: b.description,
            applies_to: b.applies_to,
            event_ids: b.event_ids,
            ticket_type_ids: b.ticket_type_ids,
          }));

          const { error: benefitsError } = await supabase
            .from("membership_benefits")
            .insert(benefitsToInsert);

          if (benefitsError) throw benefitsError;
        }
      } else {
        // Create new tier
        const { data: newTier, error: tierError } = await supabase
          .from("membership_tiers")
          .insert({
            organization_id: organizationId,
            name: formData.name,
            description: formData.description || null,
            price: formData.price,
            interval: formData.interval,
            color: formData.color || null,
            icon: formData.icon || null,
            sort_order: tiers.length + 1,
            is_active: true,
            auto_renew_default: formData.auto_renew_default ?? true,
            trial_days: formData.trial_days || null,
            max_members: formData.max_members || null,
          })
          .select()
          .single();

        if (tierError) throw tierError;

        // Insert benefits for new tier
        if (formData.benefits && formData.benefits.length > 0) {
          const benefitsToInsert = formData.benefits.map(b => ({
            tier_id: newTier.id,
            benefit_type: b.benefit_type,
            value: b.value,
            description: b.description,
            applies_to: b.applies_to,
            event_ids: b.event_ids,
            ticket_type_ids: b.ticket_type_ids,
          }));

          const { error: benefitsError } = await supabase
            .from("membership_benefits")
            .insert(benefitsToInsert);

          if (benefitsError) throw benefitsError;
        }
      }

      await loadTiers();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: `Membership tier ${editingTier ? "updated" : "created"} successfully`,
      });
    } catch (error) {
      console.error("Error saving tier:", error);
      toast({
        title: "Error",
        description: "Failed to save membership tier",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (tier && tier.current_members > 0) {
      toast({
        title: "Cannot Delete",
        description: "This tier has active members. Please migrate them first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Benefits will be deleted automatically via CASCADE
      const { error } = await supabase
        .from("membership_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;

      await loadTiers();
      toast({
        title: "Deleted",
        description: "Membership tier deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast({
        title: "Error",
        description: "Failed to delete membership tier",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    try {
      const { error } = await supabase
        .from("membership_tiers")
        .update({ is_active: !tier.is_active })
        .eq("id", tierId);

      if (error) throw error;

      setTiers(tiers.map(t =>
        t.id === tierId ? { ...t, is_active: !t.is_active } : t
      ));
    } catch (error) {
      console.error("Error toggling tier:", error);
      toast({
        title: "Error",
        description: "Failed to update tier status",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (tierId: string, direction: "up" | "down") => {
    const index = tiers.findIndex((t) => t.id === tierId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === tiers.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedTiers = [...tiers];
    [updatedTiers[index], updatedTiers[newIndex]] = [updatedTiers[newIndex], updatedTiers[index]];

    // Update sort_order locally first for immediate UI feedback
    updatedTiers.forEach((t, i) => {
      t.sort_order = i + 1;
    });
    setTiers(updatedTiers);

    // Update in database
    try {
      const updates = updatedTiers.map((t, i) => ({
        id: t.id,
        sort_order: i + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("membership_tiers")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error reordering tiers:", error);
      await loadTiers(); // Reload on error
    }
  };

  const addBenefit = () => {
    if (!newBenefit.description) {
      toast({
        title: "Validation Error",
        description: "Please add a description for the benefit",
        variant: "destructive",
      });
      return;
    }

    const benefit = {
      ...newBenefit,
      id: crypto.randomUUID(),
      tier_id: editingTier?.id || "",
      event_ids: null,
      ticket_type_ids: null,
      created_at: new Date().toISOString(),
    } as MembershipBenefit;

    setFormData({
      ...formData,
      benefits: [...(formData.benefits || []), benefit],
    });

    setNewBenefit({
      benefit_type: "discount_percentage",
      value: 10,
      description: "",
      applies_to: "all_events",
    });
  };

  const removeBenefit = (benefitId: string) => {
    setFormData({
      ...formData,
      benefits: (formData.benefits || []).filter((b) => b.id !== benefitId),
    });
  };

  const getTierIcon = (iconName: string | null) => {
    const iconDef = TIER_ICONS.find((i) => i.name === iconName);
    return iconDef ? iconDef.icon : Star;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Membership Tiers</h2>
          <p className="text-muted-foreground">
            Create and manage membership levels with custom benefits
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Crown className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No membership tiers yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first membership tier to start offering member benefits
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiers
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((tier, index) => {
              const TierIcon = getTierIcon(tier.icon);
              return (
                <Card
                  key={tier.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    !tier.is_active ? "opacity-60" : ""
                  }`}
                >
                  {/* Color bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: tier.color || "#666" }}
                  />

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${tier.color}20` }}
                        >
                          <TierIcon
                            className="h-5 w-5"
                            style={{ color: tier.color || "#666" }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {tier.name}
                            {!tier.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            ${tier.price}/{INTERVAL_LABELS[tier.interval].toLowerCase()}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReorder(tier.id, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReorder(tier.id, "down")}
                          disabled={index === tiers.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(tier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(tier.id)}>
                              {tier.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTier(tier.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {tier.description && (
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{tier.current_members}</span>
                      <span className="text-muted-foreground">
                        {tier.max_members ? `/ ${tier.max_members} members` : "members"}
                      </span>
                    </div>

                    {tier.benefits && tier.benefits.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Benefits
                        </p>
                        <div className="space-y-1">
                          {tier.benefits.slice(0, 3).map((benefit) => (
                            <div
                              key={benefit.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <span className="truncate">{benefit.description}</span>
                            </div>
                          ))}
                          {tier.benefits.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{tier.benefits.length - 3} more benefits
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "Edit Membership Tier" : "Create Membership Tier"}
            </DialogTitle>
            <DialogDescription>
              {editingTier
                ? "Update the membership tier details and benefits"
                : "Create a new membership tier with custom benefits"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Tier Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Gold Member"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this membership tier offers..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Interval</Label>
                  <Select
                    value={formData.interval}
                    onValueChange={(value) =>
                      setFormData({ ...formData, interval: value as MembershipInterval })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial_days">Trial Days</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    min="0"
                    value={formData.trial_days || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tier Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TIER_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`h-8 w-8 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? "border-primary scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tier Icon</Label>
                  <div className="flex gap-2">
                    {TIER_ICONS.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-all ${
                          formData.icon === name
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        }`}
                        onClick={() => setFormData({ ...formData, icon: name })}
                        title={name}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="auto_renew">Auto-Renew by Default</Label>
                  <p className="text-sm text-muted-foreground">
                    New members will have auto-renewal enabled
                  </p>
                </div>
                <Switch
                  id="auto_renew"
                  checked={formData.auto_renew_default}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_renew_default: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Maximum Members (optional)</Label>
                <Input
                  id="max_members"
                  type="number"
                  min="0"
                  value={formData.max_members || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_members: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited members
                </p>
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-4 mt-4">
              {/* Current benefits */}
              {formData.benefits && formData.benefits.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Benefits</Label>
                  <div className="space-y-2">
                    {formData.benefits.map((benefit) => (
                      <div
                        key={benefit.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs">
                            {BENEFIT_TYPE_LABELS[benefit.benefit_type]}
                          </Badge>
                          <span className="text-sm">{benefit.description}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeBenefit(benefit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new benefit */}
              <div className="border rounded-lg p-4 space-y-4">
                <Label>Add New Benefit</Label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="benefit_type">Benefit Type</Label>
                    <Select
                      value={newBenefit.benefit_type}
                      onValueChange={(value) =>
                        setNewBenefit({ ...newBenefit, benefit_type: value as BenefitType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BENEFIT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefit_value">Value</Label>
                    <Input
                      id="benefit_value"
                      type="number"
                      min="0"
                      value={newBenefit.value}
                      onChange={(e) =>
                        setNewBenefit({ ...newBenefit, value: parseInt(e.target.value) || 0 })
                      }
                      placeholder={
                        newBenefit.benefit_type.includes("discount")
                          ? "e.g., 10 for 10%"
                          : "e.g., 2 for 2 passes"
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefit_description">Description *</Label>
                  <Input
                    id="benefit_description"
                    value={newBenefit.description}
                    onChange={(e) =>
                      setNewBenefit({ ...newBenefit, description: e.target.value })
                    }
                    placeholder="e.g., 10% off all ticket purchases"
                  />
                </div>

                <Button type="button" variant="outline" onClick={addBenefit}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Benefit
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier} disabled={isSaving}>
              {isSaving ? "Saving..." : editingTier ? "Update Tier" : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
