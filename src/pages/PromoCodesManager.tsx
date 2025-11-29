import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy, TrendingUp, Eye, EyeOff, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_customer: number;
  valid_from: string;
  valid_until: string | null;
  min_tickets: number;
  min_purchase_amount: number | null;
  active: boolean;
  event_id: string | null;
  notification_email: string | null;
  created_at: string;
  groupName?: string; // Populated separately
}

interface PromoCodeFormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: string;
  max_uses: string;
  max_uses_per_customer: string;
  valid_from: string;
  valid_until: string;
  min_tickets: string;
  min_purchase_amount: string;
  notification_email: string;
  applies_to_all_events: boolean;
}

interface PromoCodesManagerProps {
  eventId?: string;
}

const PromoCodesManager = ({ eventId: propEventId }: PromoCodesManagerProps = {}) => {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: '',
    max_uses_per_customer: '1',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    min_tickets: '1',
    min_purchase_amount: '',
    notification_email: '',
    applies_to_all_events: false,
  });

  useEffect(() => {
    fetchOrganizationId();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchPromoCodes();
    }
  }, [organizationId, eventId]);

  const fetchOrganizationId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (org) {
        setOrganizationId(org.id);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('promo_codes')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      // Filter by event if eventId is provided, or show all codes
      if (eventId) {
        query = query.or(`event_id.eq.${eventId},event_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extract group IDs from descriptions and fetch group names
      const codesWithGroups = await Promise.all(
        (data || []).map(async (code) => {
          if (code.description && code.description.startsWith('GROUP:')) {
            // Extract group ID from description like "GROUP:uuid - reason"
            const groupIdMatch = code.description.match(/^GROUP:([a-f0-9-]+)/);
            if (groupIdMatch) {
              const groupId = groupIdMatch[1];

              // Fetch group name
              const { data: groupData } = await supabase
                .from('groups')
                .select('name')
                .eq('id', groupId)
                .single();

              if (groupData) {
                return { ...code, groupName: groupData.name };
              }
            }
          }
          return code;
        })
      );

      setPromoCodes(codesWithGroups);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const promoCodeData = {
        organization_id: organizationId,
        event_id: formData.applies_to_all_events ? null : eventId || null,
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        max_uses_per_customer: parseInt(formData.max_uses_per_customer),
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        min_tickets: parseInt(formData.min_tickets),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        notification_email: formData.notification_email.trim() || null,
        active: true,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoCodeData)
          .eq('id', editingCode.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promo code updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoCodeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promo code created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });

      fetchPromoCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (code: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ active: !code.active })
        .eq('id', code.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promo code ${code.active ? 'deactivated' : 'activated'}`,
      });

      fetchPromoCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Code "${code}" copied to clipboard`,
    });
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      max_uses: '',
      max_uses_per_customer: '1',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      min_tickets: '1',
      min_purchase_amount: '',
      notification_email: '',
      applies_to_all_events: false,
    });
    setEditingCode(null);
  };

  const openEditDialog = (code: PromoCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value.toString(),
      max_uses: code.max_uses?.toString() || '',
      max_uses_per_customer: code.max_uses_per_customer.toString(),
      valid_from: code.valid_from.split('T')[0],
      valid_until: code.valid_until?.split('T')[0] || '',
      min_tickets: code.min_tickets.toString(),
      min_purchase_amount: code.min_purchase_amount?.toString() || '',
      notification_email: code.notification_email || '',
      applies_to_all_events: code.event_id === null,
    });
    setDialogOpen(true);
  };

  const getDiscountDisplay = (code: PromoCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}% off`;
    }
    return `$${code.discount_value} off`;
  };

  const getUsageDisplay = (code: PromoCode) => {
    if (!code.max_uses) return `${code.current_uses} uses`;
    return `${code.current_uses} / ${code.max_uses} uses`;
  };

  const isExpired = (code: PromoCode) => {
    if (!code.valid_until) return false;
    return new Date(code.valid_until) < new Date();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage discount codes for your events
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCode ? 'Edit Promo Code' : 'Create New Promo Code'}
              </DialogTitle>
              <DialogDescription>
                Set up a discount code for your customers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Promo Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="EARLYBIRD25"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use uppercase letters and numbers (e.g., SUMMER2024)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Early bird discount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_email">Notification Email (Optional)</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                  placeholder="pastor@church.org"
                />
                <p className="text-xs text-muted-foreground">
                  When this promo code is used, send a notification to this email address (e.g., church pastor, partner contact)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: 'percentage' | 'fixed_amount') =>
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '25' : '50.00'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Valid From *</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until (Optional)</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for no expiry</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_uses">Max Total Uses (Optional)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    min="1"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for unlimited</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses_per_customer">Max Uses Per Customer *</Label>
                  <Input
                    id="max_uses_per_customer"
                    type="number"
                    min="1"
                    value={formData.max_uses_per_customer}
                    onChange={(e) => setFormData({ ...formData, max_uses_per_customer: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_tickets">Minimum Tickets Required *</Label>
                  <Input
                    id="min_tickets"
                    type="number"
                    min="1"
                    value={formData.min_tickets}
                    onChange={(e) => setFormData({ ...formData, min_tickets: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_purchase_amount">Min Purchase Amount $ (Optional)</Label>
                  <Input
                    id="min_purchase_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                    placeholder="No minimum"
                  />
                </div>
              </div>

              {!eventId && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="applies_to_all_events"
                    checked={formData.applies_to_all_events}
                    onChange={(e) => setFormData({ ...formData, applies_to_all_events: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="applies_to_all_events" className="cursor-pointer">
                    Apply to all events (organization-wide code)
                  </Label>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCode ? 'Update Code' : 'Create Code'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading promo codes...</p>
          </CardContent>
        </Card>
      ) : promoCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">No Promo Codes Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first promo code to offer discounts to your customers
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Active Promo Codes
            </CardTitle>
            <CardDescription>
              Manage your discount codes and track usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
              <TableCaption>A list of all promo codes for your organization</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono font-bold">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {code.groupName ? (
                        <div className="mt-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                            GROUP: {code.groupName}
                          </Badge>
                          {code.description && code.description.includes(' - ') && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {code.description.split(' - ').slice(1).join(' - ')}
                            </p>
                          )}
                        </div>
                      ) : code.description && !code.description.startsWith('GROUP:') ? (
                        <p className="text-xs text-muted-foreground mt-1">{code.description}</p>
                      ) : null}
                      {!code.event_id && (
                        <Badge variant="secondary" className="mt-1">All Events</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {getDiscountDisplay(code)}
                    </TableCell>
                    <TableCell>
                      {getUsageDisplay(code)}
                      {code.max_uses && code.current_uses >= code.max_uses && (
                        <Badge variant="destructive" className="ml-2">Full</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.valid_until ? (
                        <div>
                          {new Date(code.valid_until).toLocaleDateString()}
                          {isExpired(code) && (
                            <Badge variant="destructive" className="ml-2">Expired</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {code.min_tickets > 1 && (
                          <div>Min {code.min_tickets} tickets</div>
                        )}
                        {code.min_purchase_amount && (
                          <div>Min ${code.min_purchase_amount}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.active ? "default" : "secondary"}>
                        {code.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => toggleActive(code)}
                          title={code.active ? 'Deactivate' : 'Activate'}
                        >
                          {code.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => openEditDialog(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromoCodesManager;
