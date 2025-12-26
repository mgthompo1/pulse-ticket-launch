/**
 * PassesManager - Manage membership passes and punch cards
 * Used for golf green passes, fitness memberships, etc.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Users,
  Clock,
  Infinity as InfinityIcon,
  Star,
  Ticket,
} from 'lucide-react';
import {
  useAttractionPasses,
  useCreatePass,
  useUpdatePass,
  useDeletePass,
} from '@/hooks/usePasses';
import type { AttractionPass } from '@/types/verticals';
import { cn } from '@/lib/utils';

interface PassFormData {
  name: string;
  description: string;
  pass_type: 'unlimited' | 'punch_card' | 'time_limited';
  price: number;
  total_uses: number | null;
  duration_days: number | null;
  validity_period: 'days' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | null;
  is_subscription: boolean;
  billing_interval: 'month' | 'year' | null;
  member_discount_percent: number;
  priority_booking_hours: number;
  max_active_holders: number | null;
  is_active: boolean;
  is_featured: boolean;
}

const defaultFormData: PassFormData = {
  name: '',
  description: '',
  pass_type: 'unlimited',
  price: 0,
  total_uses: null,
  duration_days: null,
  validity_period: 'monthly',
  is_subscription: false,
  billing_interval: null,
  member_discount_percent: 0,
  priority_booking_hours: 0,
  max_active_holders: null,
  is_active: true,
  is_featured: false,
};

interface PassesManagerProps {
  attractionId: string;
  verticalType?: string;
  className?: string;
}

export function PassesManager({ attractionId, verticalType = 'golf', className }: PassesManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPass, setEditingPass] = useState<AttractionPass | null>(null);
  const [formData, setFormData] = useState<PassFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('active');

  const { data: passes, isLoading } = useAttractionPasses({ attractionId });
  const createPass = useCreatePass();
  const updatePass = useUpdatePass();
  const deletePass = useDeletePass();

  const activePasses = passes?.filter(p => p.is_active) || [];
  const inactivePasses = passes?.filter(p => !p.is_active) || [];

  const passTypeLabel = verticalType === 'golf' ? 'Green Pass' : 'Membership';

  const handleOpenDialog = (pass?: AttractionPass) => {
    if (pass) {
      setEditingPass(pass);
      setFormData({
        name: pass.name,
        description: pass.description || '',
        pass_type: pass.pass_type,
        price: pass.price,
        total_uses: pass.total_uses,
        duration_days: pass.duration_days,
        validity_period: pass.validity_period,
        is_subscription: pass.is_subscription,
        billing_interval: pass.billing_interval,
        member_discount_percent: pass.member_discount_percent,
        priority_booking_hours: pass.priority_booking_hours,
        max_active_holders: pass.max_active_holders,
        is_active: pass.is_active,
        is_featured: pass.is_featured,
      });
    } else {
      setEditingPass(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      ...formData,
      attraction_id: attractionId,
    };

    if (editingPass) {
      await updatePass.mutateAsync({ id: editingPass.id, ...data });
    } else {
      await createPass.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (passId: string) => {
    if (confirm('Are you sure you want to delete this pass?')) {
      await deletePass.mutateAsync({ passId, attractionId });
    }
  };

  const getPassTypeIcon = (type: string) => {
    switch (type) {
      case 'unlimited':
        return <InfinityIcon className="w-4 h-4" />;
      case 'punch_card':
        return <Ticket className="w-4 h-4" />;
      case 'time_limited':
        return <Clock className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const formatValidity = (pass: AttractionPass) => {
    if (pass.pass_type === 'punch_card') {
      return `${pass.total_uses} uses`;
    }
    if (pass.pass_type === 'time_limited') {
      if (pass.validity_period === 'lifetime') return 'Lifetime';
      return pass.validity_period?.charAt(0).toUpperCase() + pass.validity_period?.slice(1);
    }
    return 'Unlimited';
  };

  const PassTable = ({ passes }: { passes: AttractionPass[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pass</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Validity</TableHead>
          <TableHead>Holders</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passes.map((pass) => (
          <TableRow key={pass.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {pass.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                <div>
                  <div className="font-medium">{pass.name}</div>
                  {pass.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {pass.description}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {getPassTypeIcon(pass.pass_type)}
                <span className="capitalize">{pass.pass_type.replace('_', ' ')}</span>
                {pass.is_subscription && (
                  <Badge variant="secondary" className="text-xs">
                    Subscription
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              ${pass.price.toFixed(2)}
              {pass.is_subscription && pass.billing_interval && (
                <span className="text-muted-foreground">/{pass.billing_interval}</span>
              )}
            </TableCell>
            <TableCell>{formatValidity(pass)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{pass.current_holders || 0}</span>
                {pass.max_active_holders && (
                  <span className="text-muted-foreground">/{pass.max_active_holders}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(pass)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(pass.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {passes.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No passes found. Create your first {passTypeLabel.toLowerCase()} to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {verticalType === 'golf' ? 'Green Passes & Memberships' : 'Membership Passes'}
            </CardTitle>
            <CardDescription>
              Sell passes that customers can use for bookings with discounts and priority access
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add {passTypeLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPass ? 'Edit' : 'Create'} {passTypeLabel}
                </DialogTitle>
                <DialogDescription>
                  Configure the pass details, pricing, and member benefits
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* Basic Info */}
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={verticalType === 'golf' ? 'Annual Green Pass' : 'Unlimited Membership'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the benefits of this pass..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Pass Type */}
                <div className="grid gap-4">
                  <Label>Pass Type</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'unlimited', label: 'Unlimited', icon: InfinityIcon, desc: 'Unlimited bookings' },
                      { value: 'punch_card', label: 'Punch Card', icon: Ticket, desc: 'Fixed number of uses' },
                      { value: 'time_limited', label: 'Time Limited', icon: Clock, desc: 'Valid for a period' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, pass_type: type.value as any })}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                          formData.pass_type === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <type.icon className="w-6 h-6" />
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground text-center">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type-specific settings */}
                {formData.pass_type === 'punch_card' && (
                  <div className="space-y-2">
                    <Label htmlFor="total_uses">Number of Uses</Label>
                    <Input
                      id="total_uses"
                      type="number"
                      min="1"
                      value={formData.total_uses || ''}
                      onChange={(e) => setFormData({ ...formData, total_uses: parseInt(e.target.value) || null })}
                      placeholder="10"
                    />
                  </div>
                )}

                {(formData.pass_type === 'time_limited' || formData.pass_type === 'unlimited') && (
                  <div className="space-y-2">
                    <Label htmlFor="validity">Validity Period</Label>
                    <Select
                      value={formData.validity_period || 'monthly'}
                      onValueChange={(val) => setFormData({ ...formData, validity_period: val as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="lifetime">Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subscription Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>Recurring Subscription</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-bill customers on a recurring basis
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_subscription}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_subscription: checked,
                        billing_interval: checked ? 'month' : null,
                      })
                    }
                  />
                </div>

                {formData.is_subscription && (
                  <div className="space-y-2">
                    <Label>Billing Interval</Label>
                    <Select
                      value={formData.billing_interval || 'month'}
                      onValueChange={(val) => setFormData({ ...formData, billing_interval: val as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Member Benefits */}
                <div className="grid gap-4 p-4 rounded-lg border bg-muted/30">
                  <Label className="text-base font-medium">Member Benefits</Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount">Booking Discount (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.member_discount_percent}
                        onChange={(e) =>
                          setFormData({ ...formData, member_discount_percent: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Booking (hours)</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="0"
                        value={formData.priority_booking_hours}
                        onChange={(e) =>
                          setFormData({ ...formData, priority_booking_hours: parseInt(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Hours before public can book
                      </p>
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <Label htmlFor="max_holders">Maximum Holders</Label>
                  <Input
                    id="max_holders"
                    type="number"
                    min="1"
                    value={formData.max_active_holders || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, max_active_holders: parseInt(e.target.value) || null })
                    }
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for unlimited holders
                  </p>
                </div>

                {/* Display Options */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createPass.isPending || updatePass.isPending}>
                  {editingPass ? 'Save Changes' : 'Create Pass'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({activePasses.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactivePasses.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <PassTable passes={activePasses} />
          </TabsContent>
          <TabsContent value="inactive" className="mt-4">
            <PassTable passes={inactivePasses} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PassesManager;
