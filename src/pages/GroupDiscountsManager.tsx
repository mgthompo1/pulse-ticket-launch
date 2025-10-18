import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, Eye, EyeOff } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GroupDiscountTier {
  id: string;
  event_id: string;
  organization_id: string;
  min_quantity: number;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  active: boolean;
  created_at: string;
}

interface TierFormData {
  min_quantity: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: string;
}

interface GroupDiscountsManagerProps {
  eventId?: string;
}

const GroupDiscountsManager = ({ eventId: propEventId }: GroupDiscountsManagerProps = {}) => {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const { toast } = useToast();
  const [tiers, setTiers] = useState<GroupDiscountTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<GroupDiscountTier | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');

  const [formData, setFormData] = useState<TierFormData>({
    min_quantity: '',
    discount_type: 'percentage',
    discount_value: '',
  });

  useEffect(() => {
    fetchOrganizationId();
    if (eventId) {
      fetchEventName();
    }
  }, [eventId]);

  useEffect(() => {
    if (organizationId && eventId) {
      fetchTiers();
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

  const fetchEventName = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId!)
        .single();

      if (data) {
        setEventName(data.name);
      }
    } catch (error) {
      console.error('Error fetching event name:', error);
    }
  };

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_discount_tiers')
        .select('*')
        .eq('event_id', eventId!)
        .eq('organization_id', organizationId!)
        .order('min_quantity', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
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

  const validateTiers = (newTier: { min_quantity: number; discount_value: number }, excludeId?: string) => {
    const otherTiers = tiers.filter(t => t.id !== excludeId);

    // Check for duplicate quantity thresholds
    const duplicate = otherTiers.find(t => t.min_quantity === newTier.min_quantity);
    if (duplicate) {
      return 'A tier with this quantity already exists';
    }

    // Check if discount makes sense in relation to other tiers
    const lowerTiers = otherTiers.filter(t => t.min_quantity < newTier.min_quantity);
    const higherTiers = otherTiers.filter(t => t.min_quantity > newTier.min_quantity);

    for (const lower of lowerTiers) {
      if (lower.discount_type === formData.discount_type && lower.discount_value >= newTier.discount_value) {
        return `Warning: Lower quantity tier (${lower.min_quantity}+) offers a better or equal discount`;
      }
    }

    for (const higher of higherTiers) {
      if (higher.discount_type === formData.discount_type && higher.discount_value <= newTier.discount_value) {
        return `Warning: Higher quantity tier (${higher.min_quantity}+) offers a worse or equal discount`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const tierData = {
        event_id: eventId,
        organization_id: organizationId,
        min_quantity: parseInt(formData.min_quantity),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        active: true,
      };

      // Validate tier logic
      const validationError = validateTiers(
        { min_quantity: tierData.min_quantity, discount_value: tierData.discount_value },
        editingTier?.id
      );

      if (validationError && !validationError.startsWith('Warning')) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      if (validationError?.startsWith('Warning')) {
        if (!confirm(`${validationError}\n\nDo you want to continue?`)) {
          return;
        }
      }

      if (editingTier) {
        const { error } = await supabase
          .from('group_discount_tiers')
          .update(tierData)
          .eq('id', editingTier.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Discount tier updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('group_discount_tiers')
          .insert([tierData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Discount tier created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount tier?')) return;

    try {
      const { error } = await supabase
        .from('group_discount_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount tier deleted successfully",
      });

      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (tier: GroupDiscountTier) => {
    try {
      const { error } = await supabase
        .from('group_discount_tiers')
        .update({ active: !tier.active })
        .eq('id', tier.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Discount tier ${tier.active ? 'deactivated' : 'activated'}`,
      });

      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      min_quantity: '',
      discount_type: 'percentage',
      discount_value: '',
    });
    setEditingTier(null);
  };

  const openEditDialog = (tier: GroupDiscountTier) => {
    setEditingTier(tier);
    setFormData({
      min_quantity: tier.min_quantity.toString(),
      discount_type: tier.discount_type,
      discount_value: tier.discount_value.toString(),
    });
    setDialogOpen(true);
  };

  const getDiscountDisplay = (tier: GroupDiscountTier) => {
    if (tier.discount_type === 'percentage') {
      return `${tier.discount_value}% off`;
    }
    return `$${tier.discount_value} off`;
  };

  const getSuggestedTiers = () => {
    if (tiers.length > 0) return null;

    return [
      { min_quantity: 10, discount: 10, description: "Small groups" },
      { min_quantity: 20, discount: 15, description: "Medium groups" },
      { min_quantity: 50, discount: 20, description: "Large groups" },
    ];
  };

  const applySuggestedTier = (suggested: { min_quantity: number; discount: number }) => {
    setFormData({
      min_quantity: suggested.min_quantity.toString(),
      discount_type: 'percentage',
      discount_value: suggested.discount.toString(),
    });
    setDialogOpen(true);
  };

  if (!eventId) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Please select an event to manage group discount tiers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Group Discount Tiers</h1>
          <p className="text-gray-600 mt-1">
            {eventName && `For: ${eventName}`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Automatically apply discounts based on ticket quantity purchased
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTier ? 'Edit Discount Tier' : 'Create New Discount Tier'}
              </DialogTitle>
              <DialogDescription>
                Set up automatic volume discounts
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min_quantity">Minimum Tickets Required *</Label>
                <Input
                  id="min_quantity"
                  type="number"
                  min="2"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                  placeholder="10"
                  required
                />
                <p className="text-xs text-gray-500">
                  e.g., 10 = discount applies when customer buys 10+ tickets
                </p>
              </div>

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
                  placeholder={formData.discount_type === 'percentage' ? '15' : '50.00'}
                  required
                />
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Example:</strong> If min quantity is {formData.min_quantity || '10'} and discount is{' '}
                  {formData.discount_value || '15'}{formData.discount_type === 'percentage' ? '%' : ' dollars'},
                  customers buying {formData.min_quantity || '10'}+ tickets will save{' '}
                  {formData.discount_type === 'percentage'
                    ? `${formData.discount_value || '15'}% off total`
                    : `$${formData.discount_value || '50'} off total`}
                </AlertDescription>
              </Alert>

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
                  {editingTier ? 'Update Tier' : 'Create Tier'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Suggested Tiers (only show if no tiers exist) */}
      {getSuggestedTiers() && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Starter Tiers</CardTitle>
            <CardDescription>
              Quick setup for common group discount structures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {getSuggestedTiers()!.map((suggested) => (
                <Card key={suggested.min_quantity} className="cursor-pointer hover:border-blue-400 transition-colors">
                  <CardContent className="pt-6 text-center" onClick={() => applySuggestedTier(suggested)}>
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">{suggested.min_quantity}+ tickets</div>
                    <div className="text-2xl font-bold text-blue-600 my-2">{suggested.discount}% off</div>
                    <div className="text-xs text-gray-600">{suggested.description}</div>
                    <Button variant="outline" size="sm" className="mt-3">
                      Use This
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">Loading discount tiers...</p>
          </CardContent>
        </Card>
      ) : tiers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-gray-400" />
              <h3 className="text-xl font-semibold">No Group Discounts Yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Create volume-based discounts to encourage larger group purchases
              </p>
              <p className="text-sm text-gray-500">
                Example: 10+ tickets = 10% off, 20+ tickets = 15% off
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Discount Tiers</CardTitle>
            <CardDescription>
              Discounts automatically apply at checkout based on quantity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Volume-based discount tiers for this event</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Min Quantity</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Example Savings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier, index) => {
                  const examplePrice = 100; // Example ticket price
                  const exampleTotal = examplePrice * tier.min_quantity;
                  const exampleSavings = tier.discount_type === 'percentage'
                    ? (exampleTotal * tier.discount_value / 100)
                    : tier.discount_value;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {tier.min_quantity}+ tickets
                          </Badge>
                          {index === 0 && (
                            <Badge variant="secondary">Entry Tier</Badge>
                          )}
                          {index === tiers.length - 1 && tiers.length > 1 && (
                            <Badge variant="secondary">Best Value</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-600 text-lg">
                        {getDiscountDisplay(tier)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div>
                          {tier.min_quantity} × ${examplePrice} = ${exampleTotal}
                        </div>
                        <div className="text-green-600 font-semibold">
                          Save ${exampleSavings.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tier.active ? "default" : "secondary"}>
                          {tier.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(tier)}
                            title={tier.active ? 'Deactivate' : 'Activate'}
                          >
                            {tier.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(tier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tier.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Visual tier structure */}
            {tiers.length > 1 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">Discount Structure Visualization</h4>
                <div className="flex items-center gap-2 overflow-x-auto">
                  <div className="text-sm whitespace-nowrap">1-{tiers[0].min_quantity - 1} tickets: Full price</div>
                  {tiers.map((tier, index) => (
                    <div key={tier.id} className="flex items-center gap-2">
                      <div className="text-gray-400">→</div>
                      <div className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm whitespace-nowrap">
                        {tier.min_quantity}+ tickets: <strong>{getDiscountDisplay(tier)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupDiscountsManager;
