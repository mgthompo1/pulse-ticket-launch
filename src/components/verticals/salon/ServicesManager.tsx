/**
 * ServicesManager - Manage salon/spa service catalog
 * Services with durations, pricing, and staff assignments
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Scissors,
  Sparkles,
  GripVertical,
  FolderOpen,
  Users,
} from 'lucide-react';
import {
  useSalonServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useServiceCategories,
} from '@/hooks/useSalonServices';
import type { SalonService } from '@/types/verticals';
import { cn } from '@/lib/utils';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  deposit_required: number | null;
  max_per_day: number | null;
  is_active: boolean;
  display_order: number;
}

const defaultFormData: ServiceFormData = {
  name: '',
  description: '',
  category: 'General',
  duration_minutes: 60,
  buffer_minutes: 0,
  price: 0,
  deposit_required: null,
  max_per_day: null,
  is_active: true,
  display_order: 0,
};

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 75, label: '1 hr 15 min' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
];

interface ServicesManagerProps {
  attractionId: string;
  verticalType?: string;
  className?: string;
}

export function ServicesManager({ attractionId, verticalType = 'salon', className }: ServicesManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SalonService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [newCategory, setNewCategory] = useState('');

  const { data: services, isLoading } = useSalonServices({ attractionId });
  const { data: categories } = useServiceCategories(attractionId);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  // Group services by category
  const groupedServices = React.useMemo(() => {
    if (!services) return {};
    return services.reduce((acc, service) => {
      const cat = service.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {} as Record<string, SalonService[]>);
  }, [services]);

  const termLabel = verticalType === 'spa' ? 'Treatment' : 'Service';

  const handleOpenDialog = (service?: SalonService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        category: service.category || 'General',
        duration_minutes: service.duration_minutes,
        buffer_minutes: service.buffer_minutes || 0,
        price: service.price,
        deposit_required: service.deposit_required,
        max_per_day: service.max_per_day,
        is_active: service.is_active,
        display_order: service.display_order || 0,
      });
    } else {
      setEditingService(null);
      setFormData(defaultFormData);
    }
    setNewCategory('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const category = newCategory || formData.category;
    const data = {
      ...formData,
      category,
      attraction_id: attractionId,
    };

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, ...data });
    } else {
      await createService.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm(`Are you sure you want to delete this ${termLabel.toLowerCase()}?`)) {
      await deleteService.mutateAsync({ serviceId, attractionId });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {verticalType === 'spa' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Scissors className="w-5 h-5" />
              )}
              {termLabel} Catalog
            </CardTitle>
            <CardDescription>
              Manage your {termLabel.toLowerCase()}s, pricing, and durations
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add {termLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Edit' : 'Create'} {termLabel}
                </DialogTitle>
                <DialogDescription>
                  Configure the {termLabel.toLowerCase()} details, duration, and pricing
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{termLabel} Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={verticalType === 'spa' ? 'Deep Tissue Massage' : 'Haircut & Style'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={`Describe the ${termLabel.toLowerCase()}...`}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newCategory ? '__new__' : formData.category}
                    onValueChange={(val) => {
                      if (val === '__new__') {
                        setNewCategory('New Category');
                      } else {
                        setFormData({ ...formData, category: val });
                        setNewCategory('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories || ['General']).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New Category</SelectItem>
                    </SelectContent>
                  </Select>
                  {newCategory && (
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Category name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={String(formData.duration_minutes)}
                      onValueChange={(val) => setFormData({ ...formData, duration_minutes: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Buffer Time</Label>
                    <Select
                      value={String(formData.buffer_minutes)}
                      onValueChange={(val) => setFormData({ ...formData, buffer_minutes: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No buffer</SelectItem>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Time between appointments
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deposit">Deposit Required ($)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.deposit_required || ''}
                      onChange={(e) => setFormData({ ...formData, deposit_required: parseFloat(e.target.value) || null })}
                      placeholder="None"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_per_day">Max Bookings Per Day</Label>
                  <Input
                    id="max_per_day"
                    type="number"
                    min="1"
                    value={formData.max_per_day || ''}
                    onChange={(e) => setFormData({ ...formData, max_per_day: parseInt(e.target.value) || null })}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active and available for booking</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
                  {editingService ? 'Save Changes' : `Create ${termLabel}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading services...</div>
        ) : Object.keys(groupedServices).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {termLabel.toLowerCase()}s yet.</p>
            <p className="text-sm">Create your first {termLabel.toLowerCase()} to get started.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(groupedServices)} className="space-y-2">
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {categoryServices.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{termLabel}</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{service.name}</div>
                              {service.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {service.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {formatDuration(service.duration_minutes)}
                              {service.buffer_minutes > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  (+{service.buffer_minutes}m)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              {service.price.toFixed(2)}
                            </div>
                            {service.deposit_required && (
                              <div className="text-xs text-muted-foreground">
                                ${service.deposit_required} deposit
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.is_active ? 'default' : 'secondary'}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(service.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default ServicesManager;
