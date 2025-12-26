/**
 * VerticalSelector - Select business vertical type for an attraction
 * Updates terminology and features based on selection
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useVerticalDefaults } from '@/hooks/useVerticalConfig';
import {
  Calendar,
  Flag,
  Scissors,
  Dumbbell,
  MapPin,
  Sparkles,
  Package,
  Gamepad2,
} from 'lucide-react';
import type { VerticalType } from '@/types/verticals';
import { cn } from '@/lib/utils';

const VERTICAL_ICONS: Record<VerticalType, React.ReactNode> = {
  general: <Calendar className="w-5 h-5" />,
  golf: <Flag className="w-5 h-5" />,
  salon: <Scissors className="w-5 h-5" />,
  fitness: <Dumbbell className="w-5 h-5" />,
  tours: <MapPin className="w-5 h-5" />,
  spa: <Sparkles className="w-5 h-5" />,
  rental: <Package className="w-5 h-5" />,
  entertainment: <Gamepad2 className="w-5 h-5" />,
};

const VERTICAL_DESCRIPTIONS: Record<VerticalType, string> = {
  general: 'Standard time-slot booking for any type of activity',
  golf: 'Tee time management with player groups, passes, and pro shop',
  salon: 'Service appointments with stylists, tips, and retail products',
  fitness: 'Classes with instructors, memberships, and waitlists',
  tours: 'Guided tours with group sizes and private options',
  spa: 'Treatment bookings with therapists and packages',
  rental: 'Equipment rental with deposits and inventory tracking',
  entertainment: 'Bowling, karaoke, VR, escape rooms with lane/room booking',
};

const VERTICAL_FEATURES: Record<VerticalType, string[]> = {
  general: ['Time slots', 'Party size', 'Add-ons'],
  golf: ['Tee times', 'Member passes', 'Join groups', 'Pro shop', 'Pricing tiers'],
  salon: ['Service catalog', 'Staff schedules', 'Tips', 'Recurring', 'Retail'],
  fitness: ['Class schedule', 'Memberships', 'Waitlist', 'Recurring'],
  tours: ['Group booking', 'Private tours', 'Guide selection'],
  spa: ['Treatments', 'Packages', 'Tips', 'Retail'],
  rental: ['Inventory', 'Deposits', 'Duration pricing'],
  entertainment: ['Lane/Room booking', 'Party packages', 'F&B', 'Variable duration', 'Products'],
};

interface VerticalSelectorProps {
  value: VerticalType;
  onChange: (value: VerticalType) => void;
  disabled?: boolean;
  className?: string;
}

export function VerticalSelector({
  value,
  onChange,
  disabled = false,
  className,
}: VerticalSelectorProps) {
  const { data: defaults, isLoading } = useVerticalDefaults();

  const verticals: VerticalType[] = ['general', 'golf', 'salon', 'fitness', 'tours', 'spa', 'rental', 'entertainment'];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Business Type</CardTitle>
        <CardDescription>
          Choose the type of business to enable relevant features and terminology
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={(val) => onChange(val as VerticalType)}
          disabled={disabled}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {verticals.map((vertical) => {
            const isSelected = value === vertical;
            const features = VERTICAL_FEATURES[vertical];

            return (
              <div key={vertical}>
                <RadioGroupItem
                  value={vertical}
                  id={`vertical-${vertical}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`vertical-${vertical}`}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    'hover:border-primary/50 hover:bg-muted/50',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {VERTICAL_ICONS[vertical]}
                    </div>
                    <div>
                      <div className="font-semibold capitalize">
                        {vertical === 'general' ? 'General' :
                         vertical === 'golf' ? 'Golf Course' :
                         vertical === 'salon' ? 'Salon / Barber' :
                         vertical === 'fitness' ? 'Fitness Studio' :
                         vertical === 'tours' ? 'Tours & Activities' :
                         vertical === 'spa' ? 'Spa & Wellness' :
                         vertical === 'rental' ? 'Equipment Rental' :
                         'Entertainment Venue'}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {VERTICAL_DESCRIPTIONS[vertical]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export default VerticalSelector;
