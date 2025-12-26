/**
 * GolfConfigEditor - Configure golf-specific settings
 * Tee time intervals, holes, cart settings, etc.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Flag,
  Clock,
  Users,
  Car,
  Footprints,
  Save,
  Settings,
  Award,
} from 'lucide-react';
import { useGolfConfig, useUpdateGolfConfig } from '@/hooks/useGolfConfig';
import type { GolfCourseConfig } from '@/types/verticals';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GolfConfigEditorProps {
  attractionId: string;
  className?: string;
}

export function GolfConfigEditor({ attractionId, className }: GolfConfigEditorProps) {
  const { toast } = useToast();
  const { data: config, isLoading } = useGolfConfig(attractionId);
  const updateConfig = useUpdateGolfConfig();

  const [formData, setFormData] = useState<Partial<GolfCourseConfig>>({
    tee_time_interval: 10,
    first_tee_time: '06:00',
    last_tee_time: '18:00',
    holes_options: [9, 18],
    default_holes: 18,
    nine_hole_duration: 120,
    eighteen_hole_duration: 240,
    max_players_per_tee: 4,
    min_players_per_tee: 1,
    allow_join_existing: true,
    allow_single_bookings: true,
    course_rating: null,
    slope_rating: null,
    par: 72,
    total_yards: null,
    cart_included: false,
    cart_fee: null,
    walking_allowed: true,
    require_handicap: false,
    dress_code: '',
    caddie_available: false,
    caddie_fee: null,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        tee_time_interval: config.tee_time_interval,
        first_tee_time: config.first_tee_time,
        last_tee_time: config.last_tee_time,
        holes_options: config.holes_options,
        default_holes: config.default_holes,
        nine_hole_duration: config.nine_hole_duration,
        eighteen_hole_duration: config.eighteen_hole_duration,
        max_players_per_tee: config.max_players_per_tee,
        min_players_per_tee: config.min_players_per_tee,
        allow_join_existing: config.allow_join_existing,
        allow_single_bookings: config.allow_single_bookings,
        course_rating: config.course_rating,
        slope_rating: config.slope_rating,
        par: config.par,
        total_yards: config.total_yards,
        cart_included: config.cart_included,
        cart_fee: config.cart_fee,
        walking_allowed: config.walking_allowed,
        require_handicap: config.require_handicap,
        dress_code: config.dress_code || '',
        caddie_available: config.caddie_available,
        caddie_fee: config.caddie_fee,
      });
      setHasChanges(false);
    }
  }, [config]);

  const handleChange = <K extends keyof GolfCourseConfig>(key: K, value: GolfCourseConfig[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        attractionId,
        ...formData,
      });
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: 'Golf course configuration updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const holesOptions = [
    { value: '9', label: '9 holes only' },
    { value: '18', label: '18 holes only' },
    { value: '9,18', label: 'Both 9 and 18 holes' },
  ];

  const currentHolesOption = formData.holes_options?.includes(9) && formData.holes_options?.includes(18)
    ? '9,18'
    : formData.holes_options?.includes(9)
    ? '9'
    : '18';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Golf Course Settings
            </CardTitle>
            <CardDescription>
              Configure tee times, player limits, and course details
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || updateConfig.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Tee Time Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Tee Time Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tee Time Interval (minutes)</Label>
              <Select
                value={String(formData.tee_time_interval)}
                onValueChange={(val) => handleChange('tee_time_interval', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 minutes</SelectItem>
                  <SelectItem value="8">8 minutes</SelectItem>
                  <SelectItem value="9">9 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="12">12 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>First Tee Time</Label>
              <Input
                type="time"
                value={formData.first_tee_time || '06:00'}
                onChange={(e) => handleChange('first_tee_time', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Last Tee Time</Label>
              <Input
                type="time"
                value={formData.last_tee_time || '18:00'}
                onChange={(e) => handleChange('last_tee_time', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Holes Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Holes Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Available Options</Label>
              <Select
                value={currentHolesOption}
                onValueChange={(val) => {
                  const options = val === '9,18' ? [9, 18] : val === '9' ? [9] : [18];
                  handleChange('holes_options', options);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {holesOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Holes</Label>
              <Select
                value={String(formData.default_holes)}
                onValueChange={(val) => handleChange('default_holes', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9 holes</SelectItem>
                  <SelectItem value="18">18 holes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>9-Hole Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.nine_hole_duration || ''}
                onChange={(e) => handleChange('nine_hole_duration', parseInt(e.target.value) || 120)}
              />
            </div>

            <div className="space-y-2">
              <Label>18-Hole Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.eighteen_hole_duration || ''}
                onChange={(e) => handleChange('eighteen_hole_duration', parseInt(e.target.value) || 240)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Player Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Player Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Players per Tee Time</Label>
              <Select
                value={String(formData.max_players_per_tee)}
                onValueChange={(val) => handleChange('max_players_per_tee', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 players</SelectItem>
                  <SelectItem value="3">3 players</SelectItem>
                  <SelectItem value="4">4 players</SelectItem>
                  <SelectItem value="5">5 players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min Players per Tee Time</Label>
              <Select
                value={String(formData.min_players_per_tee)}
                onValueChange={(val) => handleChange('min_players_per_tee', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 player</SelectItem>
                  <SelectItem value="2">2 players</SelectItem>
                  <SelectItem value="3">3 players</SelectItem>
                  <SelectItem value="4">4 players</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Allow Single Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Let individuals book solo tee times
                </p>
              </div>
              <Switch
                checked={formData.allow_single_bookings}
                onCheckedChange={(checked) => handleChange('allow_single_bookings', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Allow Joining Existing Groups</Label>
                <p className="text-sm text-muted-foreground">
                  Let players join partially-filled tee times
                </p>
              </div>
              <Switch
                checked={formData.allow_join_existing}
                onCheckedChange={(checked) => handleChange('allow_join_existing', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Cart & Walking */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Cart & Walking</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Cart Included</Label>
                <p className="text-sm text-muted-foreground">
                  Cart is included in green fee
                </p>
              </div>
              <Switch
                checked={formData.cart_included}
                onCheckedChange={(checked) => handleChange('cart_included', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Walking Allowed</Label>
                <p className="text-sm text-muted-foreground">
                  Players can walk the course
                </p>
              </div>
              <Switch
                checked={formData.walking_allowed}
                onCheckedChange={(checked) => handleChange('walking_allowed', checked)}
              />
            </div>
          </div>

          {!formData.cart_included && (
            <div className="space-y-2">
              <Label>Cart Fee ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cart_fee || ''}
                onChange={(e) => handleChange('cart_fee', parseFloat(e.target.value) || null)}
                placeholder="e.g., 25.00"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label>Caddie Available</Label>
                <p className="text-sm text-muted-foreground">
                  Offer caddie services
                </p>
              </div>
              <Switch
                checked={formData.caddie_available}
                onCheckedChange={(checked) => handleChange('caddie_available', checked)}
              />
            </div>

            {formData.caddie_available && (
              <div className="space-y-2">
                <Label>Caddie Fee ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.caddie_fee || ''}
                  onChange={(e) => handleChange('caddie_fee', parseFloat(e.target.value) || null)}
                  placeholder="e.g., 50.00"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Course Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Course Details</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Par</Label>
              <Input
                type="number"
                value={formData.par || ''}
                onChange={(e) => handleChange('par', parseInt(e.target.value) || 72)}
              />
            </div>

            <div className="space-y-2">
              <Label>Course Rating</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.course_rating || ''}
                onChange={(e) => handleChange('course_rating', parseFloat(e.target.value) || null)}
                placeholder="e.g., 72.5"
              />
            </div>

            <div className="space-y-2">
              <Label>Slope Rating</Label>
              <Input
                type="number"
                value={formData.slope_rating || ''}
                onChange={(e) => handleChange('slope_rating', parseInt(e.target.value) || null)}
                placeholder="e.g., 125"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Yards</Label>
              <Input
                type="number"
                value={formData.total_yards || ''}
                onChange={(e) => handleChange('total_yards', parseInt(e.target.value) || null)}
                placeholder="e.g., 6800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>Require Handicap</Label>
              <p className="text-sm text-muted-foreground">
                Require players to provide handicap when booking
              </p>
            </div>
            <Switch
              checked={formData.require_handicap}
              onCheckedChange={(checked) => handleChange('require_handicap', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dress Code</Label>
            <Textarea
              value={formData.dress_code || ''}
              onChange={(e) => handleChange('dress_code', e.target.value)}
              placeholder="Describe the dress code requirements..."
              rows={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GolfConfigEditor;
