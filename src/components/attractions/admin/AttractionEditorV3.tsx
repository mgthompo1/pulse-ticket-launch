/**
 * AttractionEditorV3 - Admin interface for managing attractions
 * Tabbed interface with live preview capability
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Eye, ExternalLink, Settings, Users, Clock, Package, FileText, Palette, Image, Star, AlertTriangle, Zap, Layout, Type, Shield, Square, RectangleHorizontal, FileSignature, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AttractionWaiverConfig } from '../waivers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import {
  ScheduleSection,
  StaffSection,
  AddOnsSection,
  CustomFieldsSection,
} from './sections';

interface AttractionEditorV3Props {
  attractionId: string;
  onClose?: () => void;
  className?: string;
}

export const AttractionEditorV3: React.FC<AttractionEditorV3Props> = ({
  attractionId,
  onClose,
  className,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('attractions')
        .delete()
        .eq('id', attractionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-attractions'] });
      toast({ title: 'Attraction deleted' });
      onClose?.();
    },
    onError: (error) => {
      console.error('Failed to delete attraction:', error);
      toast({ title: 'Failed to delete attraction', description: String(error), variant: 'destructive' });
    },
  });

  // Load attraction data
  const { data: attraction, isLoading, error } = useQuery({
    queryKey: ['attraction-admin', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .eq('id', attractionId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Form state - only includes actual database columns
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: '',
    base_price: 0,
    duration_minutes: 60,
    max_concurrent_bookings: 1,
    status: 'active',
    logo_url: '',
  });

  // Theme state - stored in widget_customization JSONB column
  const [themeData, setThemeData] = useState({
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    showReviews: true,
    showUrgency: true,
    showSocialProof: true,
    showStaffSelector: true,
    showAddons: true,
    showPackages: true,
    compactMode: false,
    hidePrice: false,
    customCss: '',
    // Hero settings
    heroLayout: 'fullwidth' as 'fullwidth' | 'split' | 'minimal',
    heroOverlayOpacity: 50,
    ctaButtonText: 'Book Now',
    showFloatingCard: true,
    // Appearance settings
    borderRadius: 'medium' as 'none' | 'small' | 'medium' | 'large',
    showTrustSignals: true,
    fontFamily: 'default' as 'default' | 'serif' | 'modern',
    // Resource label (stored in widget_customization, not a DB column)
    resourceLabel: 'Guide',
    // Trust signals customization
    trustSignals: {
      paymentTitle: 'Secure Payment',
      paymentBadges: [
        { label: 'Secure Checkout', description: '256-bit SSL encryption' },
        { label: 'Safe Payment', description: 'PCI DSS compliant' },
        { label: 'Data Protected', description: 'Your info is safe' },
      ],
      guaranteesTitle: 'Our Guarantees',
      guaranteeBadges: [
        { label: 'Free Cancellation', description: 'Up to 24h before' },
        { label: 'Instant Confirmation', description: 'Get tickets immediately' },
        { label: 'Best Price Guarantee', description: 'Lowest price or refund' },
      ],
    },
  });

  // Update form when attraction loads
  useEffect(() => {
    if (attraction) {
      setFormData({
        name: attraction.name || '',
        description: attraction.description || '',
        venue: attraction.venue || '',
        base_price: attraction.base_price || 0,
        duration_minutes: attraction.duration_minutes || 60,
        logo_url: attraction.logo_url || '',
        max_concurrent_bookings: attraction.max_concurrent_bookings || 1,
        status: attraction.status || 'active',
      });

      // Load theme from widget_customization
      const customization = attraction.widget_customization || {};
      setThemeData({
        primaryColor: customization.primaryColor || '#3b82f6',
        accentColor: customization.accentColor || '#10b981',
        showReviews: customization.showReviews !== false,
        showUrgency: customization.showUrgency !== false,
        showSocialProof: customization.showSocialProof !== false,
        showStaffSelector: customization.showStaffSelector !== false,
        showAddons: customization.showAddons !== false,
        showPackages: customization.showPackages !== false,
        compactMode: customization.compactMode || false,
        hidePrice: customization.hidePrice || false,
        customCss: customization.customCss || '',
        // Hero settings
        heroLayout: customization.heroLayout || 'fullwidth',
        heroOverlayOpacity: customization.heroOverlayOpacity ?? 50,
        ctaButtonText: customization.ctaButtonText || 'Book Now',
        showFloatingCard: customization.showFloatingCard !== false,
        // Appearance settings
        borderRadius: customization.borderRadius || 'medium',
        showTrustSignals: customization.showTrustSignals !== false,
        fontFamily: customization.fontFamily || 'default',
        // Resource label
        resourceLabel: customization.resourceLabel || 'Guide',
        // Trust signals
        trustSignals: customization.trustSignals || {
          paymentTitle: 'Secure Payment',
          paymentBadges: [
            { label: 'Secure Checkout', description: '256-bit SSL encryption' },
            { label: 'Safe Payment', description: 'PCI DSS compliant' },
            { label: 'Data Protected', description: 'Your info is safe' },
          ],
          guaranteesTitle: 'Our Guarantees',
          guaranteeBadges: [
            { label: 'Free Cancellation', description: 'Up to 24h before' },
            { label: 'Instant Confirmation', description: 'Get tickets immediately' },
            { label: 'Best Price Guarantee', description: 'Lowest price or refund' },
          ],
        },
      });
    }
  }, [attraction]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('attractions')
        .update(data)
        .eq('id', attractionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-admin', attractionId] });
      setHasChanges(false);
      toast({
        title: 'Changes saved',
        description: 'Your attraction settings have been updated.',
      });
    },
    onError: (error) => {
      console.error('❌ Error saving attraction:', error);
      toast({
        title: 'Error saving',
        description: error instanceof Error ? error.message : 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleThemeChange = (field: string, value: any) => {
    setThemeData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Merge form data with theme data
    const dataToSave = {
      ...formData,
      widget_customization: themeData,
    };
    saveMutation.mutate(dataToSave);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !attraction) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load attraction settings.</p>
        </CardContent>
      </Card>
    );
  }

  const previewUrl = `/attraction/${attractionId}`;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{formData.name || 'Attraction Settings'}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your booking experience and manage resources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Add-ons</span>
          </TabsTrigger>
          <TabsTrigger value="waivers" className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            <span className="hidden sm:inline">Waivers</span>
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Fields</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure your attraction's core details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Attraction Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Sunset Kayak Tour"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Location/Venue</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => handleInputChange('venue', e.target.value)}
                    placeholder="e.g., Marina Bay"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your attraction..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price ($)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 60)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_bookings">Max Concurrent Bookings</Label>
                  <Input
                    id="max_bookings"
                    type="number"
                    min="1"
                    value={formData.max_concurrent_bookings}
                    onChange={(e) => handleInputChange('max_concurrent_bookings', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource_label">Staff/Resource Label</Label>
                <Input
                  id="resource_label"
                  value={themeData.resourceLabel}
                  onChange={(e) => handleThemeChange('resourceLabel', e.target.value)}
                  placeholder="e.g., Guide, Instructor, Staff"
                />
                <p className="text-sm text-muted-foreground">
                  How should staff members be referred to? (e.g., "Select your Guide")
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="status">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, customers cannot book this attraction
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => handleInputChange('status', checked ? 'active' : 'inactive')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle>Embed on Your Website</CardTitle>
              <CardDescription>Add this booking widget to any page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`<iframe
  src="${window.location.origin}/embed/attraction/${attractionId}"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>`}</pre>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe src="${window.location.origin}/embed/attraction/${attractionId}" width="100%" height="800" frameborder="0" style="border: none; border-radius: 12px;"></iframe>`
                    );
                    toast({ title: 'Copied to clipboard!' });
                  }}
                >
                  Copy Embed Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that permanently affect your attraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <div>
                  <h4 className="font-medium text-foreground">Delete this attraction</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove this attraction and all associated bookings
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <ScheduleSection attractionId={attractionId} />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <StaffSection attractionId={attractionId} />
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons">
          <AddOnsSection attractionId={attractionId} />
        </TabsContent>

        {/* Waivers Tab */}
        <TabsContent value="waivers" className="space-y-6">
          {attraction && (
            <AttractionWaiverConfig
              attractionId={attractionId}
              organizationId={attraction.organization_id}
            />
          )}
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="fields">
          <CustomFieldsSection attractionId={attractionId} />
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>Customize the widget to match your brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={themeData.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={themeData.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons and highlights</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accentColor"
                      value={themeData.accentColor}
                      onChange={(e) => handleThemeChange('accentColor', e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={themeData.accentColor}
                      onChange={(e) => handleThemeChange('accentColor', e.target.value)}
                      placeholder="#10b981"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for success states and badges</p>
                </div>
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm font-medium mb-3">Preview</p>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: themeData.primaryColor }}
                  >
                    Book Now
                  </button>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: themeData.accentColor + '20', color: themeData.accentColor }}
                  >
                    Available
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero Section Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Hero Section
              </CardTitle>
              <CardDescription>Customize the hero/header area of your booking widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo/Hero Image Upload */}
              <div className="space-y-2">
                <Label>Logo / Hero Image</Label>
                <div className="flex gap-4 items-start">
                  {formData.logo_url && (
                    <div className="w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Validate file
                        if (!file.type.startsWith('image/')) {
                          toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
                          return;
                        }

                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `attractions/${attractionId}/logo.${fileExt}`;

                          const { error: uploadError } = await supabase.storage
                            .from('event-logos')
                            .upload(fileName, file, { upsert: true });

                          if (uploadError) throw uploadError;

                          const { data } = supabase.storage
                            .from('event-logos')
                            .getPublicUrl(fileName);

                          handleInputChange('logo_url', data.publicUrl);
                          toast({ title: 'Success', description: 'Logo uploaded successfully' });
                        } catch (error) {
                          console.error('Upload error:', error);
                          toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload a logo or hero image. Recommended size: 800x400px. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hero Layout</Label>
                  <Select
                    value={themeData.heroLayout}
                    onValueChange={(value) => handleThemeChange('heroLayout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fullwidth">Full Width - Immersive hero image</SelectItem>
                      <SelectItem value="split">Split View - Image alongside content</SelectItem>
                      <SelectItem value="minimal">Minimal - Compact header only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaText">CTA Button Text</Label>
                  <Input
                    id="ctaText"
                    value={themeData.ctaButtonText}
                    onChange={(e) => handleThemeChange('ctaButtonText', e.target.value)}
                    placeholder="Book Now"
                  />
                  <p className="text-xs text-muted-foreground">Main call-to-action button text</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hero Overlay Opacity: {themeData.heroOverlayOpacity}%</Label>
                <Slider
                  value={[themeData.heroOverlayOpacity]}
                  onValueChange={([value]) => handleThemeChange('heroOverlayOpacity', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Darken the hero image for better text readability</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <RectangleHorizontal className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>Floating Booking Card</Label>
                    <p className="text-xs text-muted-foreground">Show price card over hero (desktop)</p>
                  </div>
                </div>
                <Switch
                  checked={themeData.showFloatingCard}
                  onCheckedChange={(checked) => handleThemeChange('showFloatingCard', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Visual styling options for your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <Select
                    value={themeData.borderRadius}
                    onValueChange={(value) => handleThemeChange('borderRadius', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sharp - No rounded corners</SelectItem>
                      <SelectItem value="small">Subtle - Slightly rounded</SelectItem>
                      <SelectItem value="medium">Modern - Medium rounded (Default)</SelectItem>
                      <SelectItem value="large">Soft - Very rounded corners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Style</Label>
                  <Select
                    value={themeData.fontFamily}
                    onValueChange={(value) => handleThemeChange('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">System Default</SelectItem>
                      <SelectItem value="serif">Elegant Serif</SelectItem>
                      <SelectItem value="modern">Clean Modern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>Trust Signals</Label>
                    <p className="text-xs text-muted-foreground">Show security badges and guarantees</p>
                  </div>
                </div>
                <Switch
                  checked={themeData.showTrustSignals}
                  onCheckedChange={(checked) => handleThemeChange('showTrustSignals', checked)}
                />
              </div>

              {/* Preview of border radius */}
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm font-medium mb-3">Border Radius Preview</p>
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'w-16 h-16 bg-primary/20 border-2 border-primary flex items-center justify-center text-xs',
                      themeData.borderRadius === 'none' && 'rounded-none',
                      themeData.borderRadius === 'small' && 'rounded',
                      themeData.borderRadius === 'medium' && 'rounded-xl',
                      themeData.borderRadius === 'large' && 'rounded-3xl'
                    )}
                  >
                    Card
                  </div>
                  <button
                    className={cn(
                      'px-4 py-2 text-white font-medium',
                      themeData.borderRadius === 'none' && 'rounded-none',
                      themeData.borderRadius === 'small' && 'rounded',
                      themeData.borderRadius === 'medium' && 'rounded-lg',
                      themeData.borderRadius === 'large' && 'rounded-full'
                    )}
                    style={{ backgroundColor: themeData.primaryColor }}
                  >
                    Button
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Display Options
              </CardTitle>
              <CardDescription>Control which sections appear in the booking widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Staff Selector</Label>
                      <p className="text-xs text-muted-foreground">Let customers choose their guide</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showStaffSelector}
                    onCheckedChange={(checked) => handleThemeChange('showStaffSelector', checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Add-ons</Label>
                      <p className="text-xs text-muted-foreground">Show upsell options</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showAddons}
                    onCheckedChange={(checked) => handleThemeChange('showAddons', checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Reviews</Label>
                      <p className="text-xs text-muted-foreground">Display customer reviews</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showReviews}
                    onCheckedChange={(checked) => handleThemeChange('showReviews', checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Urgency Badges</Label>
                      <p className="text-xs text-muted-foreground">"Only 3 spots left!"</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showUrgency}
                    onCheckedChange={(checked) => handleThemeChange('showUrgency', checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Social Proof</Label>
                      <p className="text-xs text-muted-foreground">"12 people viewing"</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showSocialProof}
                    onCheckedChange={(checked) => handleThemeChange('showSocialProof', checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Packages</Label>
                      <p className="text-xs text-muted-foreground">Show bundle deals</p>
                    </div>
                  </div>
                  <Switch
                    checked={themeData.showPackages}
                    onCheckedChange={(checked) => handleThemeChange('showPackages', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Signals Customization */}
          {themeData.showTrustSignals && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Trust Signals Content
                </CardTitle>
                <CardDescription>Customize the security badges and guarantees shown to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Section Title</Label>
                    <Input
                      value={themeData.trustSignals.paymentTitle}
                      onChange={(e) => handleThemeChange('trustSignals', {
                        ...themeData.trustSignals,
                        paymentTitle: e.target.value,
                      })}
                      placeholder="Secure Payment"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Payment Badges</Label>
                    {themeData.trustSignals.paymentBadges.map((badge: { label: string; description: string }, index: number) => (
                      <div key={index} className="grid gap-2 md:grid-cols-2 p-3 bg-muted/50 rounded-lg">
                        <Input
                          value={badge.label}
                          onChange={(e) => {
                            const newBadges = [...themeData.trustSignals.paymentBadges];
                            newBadges[index] = { ...newBadges[index], label: e.target.value };
                            handleThemeChange('trustSignals', {
                              ...themeData.trustSignals,
                              paymentBadges: newBadges,
                            });
                          }}
                          placeholder="Badge label"
                        />
                        <Input
                          value={badge.description}
                          onChange={(e) => {
                            const newBadges = [...themeData.trustSignals.paymentBadges];
                            newBadges[index] = { ...newBadges[index], description: e.target.value };
                            handleThemeChange('trustSignals', {
                              ...themeData.trustSignals,
                              paymentBadges: newBadges,
                            });
                          }}
                          placeholder="Badge description"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  {/* Guarantees Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Guarantees Section Title</Label>
                      <Input
                        value={themeData.trustSignals.guaranteesTitle}
                        onChange={(e) => handleThemeChange('trustSignals', {
                          ...themeData.trustSignals,
                          guaranteesTitle: e.target.value,
                        })}
                        placeholder="Our Guarantees"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Guarantee Badges</Label>
                      {themeData.trustSignals.guaranteeBadges.map((badge: { label: string; description: string }, index: number) => (
                        <div key={index} className="grid gap-2 md:grid-cols-2 p-3 bg-muted/50 rounded-lg">
                          <Input
                            value={badge.label}
                            onChange={(e) => {
                              const newBadges = [...themeData.trustSignals.guaranteeBadges];
                              newBadges[index] = { ...newBadges[index], label: e.target.value };
                              handleThemeChange('trustSignals', {
                                ...themeData.trustSignals,
                                guaranteeBadges: newBadges,
                              });
                            }}
                            placeholder="Badge label"
                          />
                          <Input
                            value={badge.description}
                            onChange={(e) => {
                              const newBadges = [...themeData.trustSignals.guaranteeBadges];
                              newBadges[index] = { ...newBadges[index], description: e.target.value };
                              handleThemeChange('trustSignals', {
                                ...themeData.trustSignals,
                                guaranteeBadges: newBadges,
                              });
                            }}
                            placeholder="Badge description"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>Additional customization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a more condensed layout for embedded widgets
                  </p>
                </div>
                <Switch
                  checked={themeData.compactMode}
                  onCheckedChange={(checked) => handleThemeChange('compactMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Hide Prices</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide prices until customer reaches checkout
                  </p>
                </div>
                <Switch
                  checked={themeData.hidePrice}
                  onCheckedChange={(checked) => handleThemeChange('hidePrice', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={themeData.customCss}
                  onChange={(e) => handleThemeChange('customCss', e.target.value)}
                  placeholder=".booking-widget { /* your custom styles */ }"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Add custom CSS to further customize the widget appearance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Attraction
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{attraction?.name}</strong>? This action cannot be undone and will permanently remove all associated bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Attraction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttractionEditorV3;
