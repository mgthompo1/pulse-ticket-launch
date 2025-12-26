/**
 * FeatureToggles - Enable/disable features for an attraction
 * Overrides the vertical defaults
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVerticalConfig } from '@/hooks/useVerticalConfig';
import {
  Users,
  List,
  Clock,
  CreditCard,
  Tag,
  Heart,
  ShoppingBag,
  Repeat,
  UserCircle,
  UserPlus,
  Timer,
} from 'lucide-react';
import type { VerticalFeatures, VerticalType, StaffSelectionMode } from '@/types/verticals';
import { cn } from '@/lib/utils';

interface FeatureConfig {
  key: keyof VerticalFeatures;
  label: string;
  description: string;
  icon: React.ReactNode;
  isMode?: boolean; // For staffSelection which is 'none' | 'optional' | 'required'
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  {
    key: 'staffSelection',
    label: 'Staff Selection',
    description: 'Let customers choose their preferred staff member',
    icon: <Users className="w-5 h-5" />,
    isMode: true,
  },
  {
    key: 'serviceCatalog',
    label: 'Service Catalog',
    description: 'Offer a menu of services with different durations and prices',
    icon: <List className="w-5 h-5" />,
  },
  {
    key: 'staffSchedules',
    label: 'Staff Schedules',
    description: 'Manage working hours, breaks, and time off for each staff member',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    key: 'membershipPasses',
    label: 'Membership Passes',
    description: 'Sell punch cards, unlimited passes, or subscriptions',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    key: 'pricingTiers',
    label: 'Pricing Tiers',
    description: 'Offer member, senior, or time-based pricing discounts',
    icon: <Tag className="w-5 h-5" />,
  },
  {
    key: 'tipsEnabled',
    label: 'Tips',
    description: 'Allow customers to add tips at checkout',
    icon: <Heart className="w-5 h-5" />,
  },
  {
    key: 'productSales',
    label: 'Product Sales',
    description: 'Sell retail products, merchandise, or equipment',
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    key: 'recurringBookings',
    label: 'Recurring Bookings',
    description: 'Set up repeating appointments for regular customers',
    icon: <Repeat className="w-5 h-5" />,
  },
  {
    key: 'clientProfiles',
    label: 'Client Profiles',
    description: 'Track customer history, preferences, and spend',
    icon: <UserCircle className="w-5 h-5" />,
  },
  {
    key: 'joinExisting',
    label: 'Join Existing Groups',
    description: 'Allow individuals to join partially-filled time slots',
    icon: <UserPlus className="w-5 h-5" />,
  },
  {
    key: 'variableDuration',
    label: 'Variable Duration',
    description: 'Services can have different durations based on options',
    icon: <Timer className="w-5 h-5" />,
  },
];

interface FeatureTogglesProps {
  attractionId?: string;
  verticalType?: VerticalType;
  overrides: Partial<VerticalFeatures>;
  onChange: (overrides: Partial<VerticalFeatures>) => void;
  className?: string;
}

export function FeatureToggles({
  attractionId,
  verticalType,
  overrides,
  onChange,
  className,
}: FeatureTogglesProps) {
  const { features: defaultFeatures, isLoading } = useVerticalConfig({
    attractionId,
    verticalType,
  });

  const getEffectiveValue = (key: keyof VerticalFeatures) => {
    if (key in overrides) {
      return overrides[key];
    }
    return defaultFeatures[key];
  };

  const handleChange = (key: keyof VerticalFeatures, value: boolean | StaffSelectionMode) => {
    const newOverrides = { ...overrides };

    // If the new value matches the default, remove the override
    if (value === defaultFeatures[key]) {
      delete newOverrides[key];
    } else {
      newOverrides[key] = value as any;
    }

    onChange(newOverrides);
  };

  const isOverridden = (key: keyof VerticalFeatures) => {
    return key in overrides;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Feature Settings</CardTitle>
        <CardDescription>
          Enable or disable features for this attraction. Changes override the defaults for your business type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {FEATURE_CONFIGS.map((config) => {
            const currentValue = getEffectiveValue(config.key);
            const isActive = config.isMode
              ? currentValue !== 'none'
              : currentValue === true;
            const hasOverride = isOverridden(config.key);

            return (
              <div
                key={config.key}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  isActive ? 'bg-primary/5 border-primary/20' : 'bg-background border-border',
                  hasOverride && 'ring-1 ring-primary/30'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{config.label}</Label>
                      {hasOverride && (
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </div>

                {config.isMode ? (
                  <Select
                    value={currentValue as string}
                    onValueChange={(val) => handleChange(config.key, val as StaffSelectionMode)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Off</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => handleChange(config.key, checked)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(overrides).length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={() => onChange({})}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Reset all to defaults
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FeatureToggles;
