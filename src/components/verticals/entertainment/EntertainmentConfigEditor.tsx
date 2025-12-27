/**
 * EntertainmentConfigEditor - Configure entertainment venue settings
 * Resources (lanes/rooms), durations, party packages, F&B settings, etc.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Gamepad2,
  Clock,
  Users,
  Package,
  UtensilsCrossed,
  Save,
  Settings,
  DollarSign,
} from 'lucide-react';
import { useEntertainmentConfig, useUpsertEntertainmentConfig } from '@/hooks/useEntertainmentConfig';
import type { EntertainmentConfig } from '@/types/verticals';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface EntertainmentConfigEditorProps {
  attractionId: string;
  className?: string;
}

export function EntertainmentConfigEditor({ attractionId, className }: EntertainmentConfigEditorProps) {
  const { toast } = useToast();
  const { data: config, isLoading } = useEntertainmentConfig(attractionId);
  const upsertConfig = useUpsertEntertainmentConfig();

  const [formData, setFormData] = useState<Partial<EntertainmentConfig>>({
    resource_label: 'Lane',
    total_resources: 4,
    duration_options: [30, 60, 90, 120],
    default_duration: 60,
    buffer_between: 10,
    min_per_resource: 1,
    max_per_resource: 8,
    price_per_duration: true,
    equipment_included: true,
    equipment_fee: null,
    party_packages_enabled: true,
    min_party_size: 6,
    party_deposit_percent: 25,
    fnb_enabled: true,
    fnb_required_for_parties: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        resource_label: config.resource_label,
        total_resources: config.total_resources,
        duration_options: config.duration_options,
        default_duration: config.default_duration,
        buffer_between: config.buffer_between,
        min_per_resource: config.min_per_resource,
        max_per_resource: config.max_per_resource,
        price_per_duration: config.price_per_duration,
        equipment_included: config.equipment_included,
        equipment_fee: config.equipment_fee,
        party_packages_enabled: config.party_packages_enabled,
        min_party_size: config.min_party_size,
        party_deposit_percent: config.party_deposit_percent,
        fnb_enabled: config.fnb_enabled,
        fnb_required_for_parties: config.fnb_required_for_parties,
      });
      setHasChanges(false);
    }
  }, [config]);

  const handleChange = <K extends keyof EntertainmentConfig>(key: K, value: EntertainmentConfig[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await upsertConfig.mutateAsync({
        attraction_id: attractionId,
        ...formData,
      });
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: 'Entertainment configuration updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resourceLabelOptions = [
    { value: 'Lane', label: 'Lane (Bowling)' },
    { value: 'Room', label: 'Room (Karaoke, Escape Room)' },
    { value: 'Station', label: 'Station (VR, Arcade)' },
    { value: 'Pod', label: 'Pod (Gaming)' },
    { value: 'Court', label: 'Court (Sports)' },
    { value: 'Table', label: 'Table (Pool, Ping Pong)' },
  ];

  const durationOptionsStr = formData.duration_options?.join(', ') || '30, 60, 90, 120';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Entertainment Settings
            </CardTitle>
            <CardDescription>
              Configure resources, durations, and party settings
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || upsertConfig.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Resource Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Resource Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select
                value={formData.resource_label}
                onValueChange={(val) => handleChange('resource_label', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceLabelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                What are customers booking? (e.g., Lane 1, Room 2)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Total {formData.resource_label}s</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={formData.total_resources}
                onChange={(e) => handleChange('total_resources', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                How many {formData.resource_label?.toLowerCase()}s do you have?
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Duration Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Duration Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Duration Options (minutes)</Label>
              <Input
                type="text"
                value={durationOptionsStr}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                  handleChange('duration_options', values);
                }}
                placeholder="30, 60, 90, 120"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated duration options
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Duration</Label>
              <Select
                value={String(formData.default_duration)}
                onValueChange={(val) => handleChange('default_duration', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formData.duration_options || [30, 60, 90, 120]).map((duration) => (
                    <SelectItem key={duration} value={String(duration)}>
                      {duration} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buffer Between (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={formData.buffer_between}
                onChange={(e) => handleChange('buffer_between', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Cleanup time between bookings
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Group Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Group Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum per {formData.resource_label}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.min_per_resource}
                onChange={(e) => handleChange('min_per_resource', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum per {formData.resource_label}</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={formData.max_per_resource}
                onChange={(e) => handleChange('max_per_resource', parseInt(e.target.value) || 8)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Pricing & Equipment */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Pricing & Equipment</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Price per Duration</Label>
                <p className="text-xs text-muted-foreground">
                  Charge per time block vs. flat session rate
                </p>
              </div>
              <Switch
                checked={formData.price_per_duration}
                onCheckedChange={(checked) => handleChange('price_per_duration', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Equipment Included</Label>
                <p className="text-xs text-muted-foreground">
                  Shoes, balls, etc. included in price
                </p>
              </div>
              <Switch
                checked={formData.equipment_included}
                onCheckedChange={(checked) => handleChange('equipment_included', checked)}
              />
            </div>

            {!formData.equipment_included && (
              <div className="space-y-2 ml-4">
                <Label>Equipment Fee ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={formData.equipment_fee || ''}
                  onChange={(e) => handleChange('equipment_fee', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Party Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Party Packages</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Party Packages</Label>
                <p className="text-xs text-muted-foreground">
                  Offer birthday/event packages
                </p>
              </div>
              <Switch
                checked={formData.party_packages_enabled}
                onCheckedChange={(checked) => handleChange('party_packages_enabled', checked)}
              />
            </div>

            {formData.party_packages_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
                <div className="space-y-2">
                  <Label>Minimum Party Size</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.min_party_size}
                    onChange={(e) => handleChange('min_party_size', parseInt(e.target.value) || 6)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deposit Percent (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.party_deposit_percent}
                    onChange={(e) => handleChange('party_deposit_percent', parseInt(e.target.value) || 25)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Food & Beverage */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Food & Beverage</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable F&B Add-ons</Label>
                <p className="text-xs text-muted-foreground">
                  Allow food/drink orders with bookings
                </p>
              </div>
              <Switch
                checked={formData.fnb_enabled}
                onCheckedChange={(checked) => handleChange('fnb_enabled', checked)}
              />
            </div>

            {formData.fnb_enabled && formData.party_packages_enabled && (
              <div className="flex items-center justify-between ml-4">
                <div>
                  <Label>Require F&B for Parties</Label>
                  <p className="text-xs text-muted-foreground">
                    Party packages must include food
                  </p>
                </div>
                <Switch
                  checked={formData.fnb_required_for_parties}
                  onCheckedChange={(checked) => handleChange('fnb_required_for_parties', checked)}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
