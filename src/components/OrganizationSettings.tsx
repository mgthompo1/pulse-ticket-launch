import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Building2, Mail, Globe, Phone, MapPin, Upload, Save, Settings,
  Calendar, MapPin as Attraction, Users, UserCog, Calculator,
  CreditCard, Palette, Moon, Sun, Monitor, ChevronRight, Target, FileText
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TaxSettings } from "@/components/TaxSettings";
import { cn } from "@/lib/utils";

interface OrganizationData {
  id: string;
  name: string;
  email: string;
  website: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  system_type: string | null;
  groups_enabled: boolean;
  group_auto_invoice_frequency: string | null;
  crm_enabled: boolean;
  issuing_enabled: boolean;
  playbooks_enabled: boolean;
  stripe_account_id: string | null;
}

type SettingsSection = 'organization' | 'system' | 'appearance' | 'tax';

const settingsSections = [
  { id: 'organization' as const, label: 'Organization', icon: Building2, description: 'Company profile & details' },
  { id: 'system' as const, label: 'System', icon: Settings, description: 'Mode & feature toggles' },
  { id: 'appearance' as const, label: 'Appearance', icon: Palette, description: 'Theme & display' },
  { id: 'tax' as const, label: 'Tax Settings', icon: Calculator, description: 'Tax configuration' },
];

const OrganizationSettings: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization, reloadOrganizations } = useOrganizations();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    id: "",
    name: "",
    email: "",
    website: "",
    logo_url: "",
    address: "",
    city: "",
    postal_code: "",
    country: "New Zealand",
    phone: "",
    system_type: "EVENTS",
    groups_enabled: false,
    group_auto_invoice_frequency: null,
    crm_enabled: false,
    issuing_enabled: false,
    playbooks_enabled: false,
    stripe_account_id: null,
  });

  useEffect(() => {
    if (currentOrganization) {
      loadOrganization();
    }
  }, [currentOrganization]);

  const loadOrganization = async () => {
    if (!currentOrganization) return;

    try {
      const { data: orgData, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", currentOrganization.id)
        .single();

      if (error) {
        console.error("Error loading organization:", error);
        return;
      }

      if (orgData) {
        setOrganizationData({
          id: orgData.id,
          name: orgData.name || "",
          email: orgData.email || "",
          website: orgData.website || "",
          logo_url: orgData.logo_url || "",
          address: orgData.address || "",
          city: orgData.city || "",
          postal_code: orgData.postal_code || "",
          country: orgData.country || "New Zealand",
          phone: orgData.phone || "",
          system_type: orgData.system_type || "EVENTS",
          groups_enabled: orgData.groups_enabled || false,
          group_auto_invoice_frequency: orgData.group_auto_invoice_frequency || null,
          crm_enabled: orgData.crm_enabled || false,
          issuing_enabled: orgData.issuing_enabled || false,
          playbooks_enabled: orgData.playbooks_enabled || false,
          stripe_account_id: orgData.stripe_account_id || null,
        });
      }
    } catch (error) {
      console.error("Error loading organization:", error);
    }
  };

  const handleInputChange = (field: keyof OrganizationData, value: string) => {
    setOrganizationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationData.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationData.id}-logo.${fileExt}`;
      const filePath = `org-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-logos')
        .getPublicUrl(filePath);

      const logoUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: logoUrl })
        .eq("id", organizationData.id);

      if (updateError) throw updateError;

      setOrganizationData(prev => ({ ...prev, logo_url: logoUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully!"
      });

    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organizationData.id) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: organizationData.name,
          email: organizationData.email,
          website: organizationData.website,
          address: organizationData.address,
          city: organizationData.city,
          postal_code: organizationData.postal_code,
          country: organizationData.country,
          phone: organizationData.phone,
          system_type: organizationData.system_type,
          groups_enabled: organizationData.groups_enabled,
          group_auto_invoice_frequency: organizationData.group_auto_invoice_frequency,
          crm_enabled: organizationData.crm_enabled,
          issuing_enabled: organizationData.issuing_enabled,
          playbooks_enabled: organizationData.playbooks_enabled,
        })
        .eq("id", organizationData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully!"
      });

      await reloadOrganizations();

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error saving organization:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderOrganizationSection = () => (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Company Logo</CardTitle>
          <CardDescription>
            Your logo appears on tickets and customer communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
              "bg-muted/50 transition-colors",
              organizationData.logo_url ? "border-border" : "border-muted-foreground/25"
            )}>
              {organizationData.logo_url ? (
                <img
                  src={organizationData.logo_url}
                  alt="Organization logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? "Uploading..." : "Upload Logo"}</span>
                </div>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG or SVG. Max 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>
            Your company's contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={organizationData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-email"
                  type="email"
                  value={organizationData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-website"
                  type="url"
                  value={organizationData.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.company.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-phone"
                  type="tel"
                  value={organizationData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+64 9 123 4567"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Address</CardTitle>
          <CardDescription>
            Your company's physical location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Textarea
              id="address"
              value={organizationData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="123 Main Street"
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={organizationData.city || ""}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="Auckland"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal-code">Postal Code</Label>
              <Input
                id="postal-code"
                value={organizationData.postal_code || ""}
                onChange={(e) => handleInputChange("postal_code", e.target.value)}
                placeholder="1010"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={organizationData.country || ""}
                onChange={(e) => handleInputChange("country", e.target.value)}
                placeholder="New Zealand"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSystemSection = () => (
    <div className="space-y-6">
      {/* System Type */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">System Mode</CardTitle>
          <CardDescription>
            Choose how you want to use TicketFlo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setOrganizationData(prev => ({ ...prev, system_type: "EVENTS" }))}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                organizationData.system_type === "EVENTS"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  organizationData.system_type === "EVENTS" ? "bg-primary/10" : "bg-muted"
                )}>
                  <Calendar className={cn(
                    "h-5 w-5",
                    organizationData.system_type === "EVENTS" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="font-semibold">Events Mode</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    For concerts, conferences, and time-specific events
                  </p>
                </div>
              </div>
              {organizationData.system_type === "EVENTS" && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
            <button
              onClick={() => setOrganizationData(prev => ({ ...prev, system_type: "ATTRACTIONS" }))}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                organizationData.system_type === "ATTRACTIONS"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  organizationData.system_type === "ATTRACTIONS" ? "bg-primary/10" : "bg-muted"
                )}>
                  <Attraction className={cn(
                    "h-5 w-5",
                    organizationData.system_type === "ATTRACTIONS" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="font-semibold">Attractions Mode</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    For tours, experiences, and bookable activities
                  </p>
                </div>
              </div>
              {organizationData.system_type === "ATTRACTIONS" && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Features</CardTitle>
          <CardDescription>
            Enable or disable platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Group Sales */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium">Group Sales</div>
                <p className="text-sm text-muted-foreground">
                  Allow groups to sell allocated inventory with custom pricing
                </p>
              </div>
            </div>
            <Switch
              checked={organizationData.groups_enabled}
              onCheckedChange={(checked) =>
                setOrganizationData(prev => ({ ...prev, groups_enabled: checked }))
              }
            />
          </div>

          {/* Auto-Invoice Frequency - Only show when groups enabled */}
          {organizationData.groups_enabled && (
            <div className="flex items-center justify-between py-4 border-b ml-8 bg-muted/20 rounded-lg px-4 -mr-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium">Auto-Invoice Groups</div>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate invoices for group sales
                  </p>
                </div>
              </div>
              <Select
                value={organizationData.group_auto_invoice_frequency || "manual"}
                onValueChange={(value) =>
                  setOrganizationData(prev => ({
                    ...prev,
                    group_auto_invoice_frequency: value === "manual" ? null : value
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="3_days">Every 3 Days</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* CRM */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCog className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="font-medium">CRM & Donations</div>
                <p className="text-sm text-muted-foreground">
                  Customer tracking, donations, and patron engagement
                </p>
              </div>
            </div>
            <Switch
              checked={organizationData.crm_enabled}
              onCheckedChange={(checked) =>
                setOrganizationData(prev => ({ ...prev, crm_enabled: checked }))
              }
            />
          </div>

          {/* Virtual Cards */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="font-medium">Virtual Card Issuing</div>
                <p className="text-sm text-muted-foreground">
                  Issue prepaid cards via Stripe Issuing
                </p>
                {!organizationData.stripe_account_id && (
                  <p className="text-xs text-amber-600 mt-1">
                    Requires Stripe Connect
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={organizationData.issuing_enabled}
              onCheckedChange={(checked) =>
                setOrganizationData(prev => ({ ...prev, issuing_enabled: checked }))
              }
              disabled={!organizationData.stripe_account_id}
            />
          </div>

          {/* Event Marketing Playbooks */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Target className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <div className="font-medium">Event Marketing Playbooks</div>
                <p className="text-sm text-muted-foreground">
                  CRM integration, guest lists, and attendee tracking
                </p>
              </div>
            </div>
            <Switch
              checked={organizationData.playbooks_enabled}
              onCheckedChange={(checked) =>
                setOrganizationData(prev => ({ ...prev, playbooks_enabled: checked }))
              }
            />
          </div>

          {/* Note: Membership management is now built into Customers page */}
        </CardContent>
      </Card>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Theme</CardTitle>
          <CardDescription>
            Customize the look and feel of your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Theme Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Color Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'light'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full",
                    theme === 'light' ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Sun className={cn(
                      "h-6 w-6",
                      theme === 'light' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="font-medium text-sm">Light</span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'dark'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full",
                    theme === 'dark' ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Moon className={cn(
                      "h-6 w-6",
                      theme === 'dark' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="font-medium text-sm">Dark</span>
                </button>

                <button
                  onClick={() => {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    setTheme(systemTheme);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className="p-3 rounded-full bg-muted">
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-sm">System</span>
                </button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTaxSection = () => (
    <TaxSettings organizationId={organizationData.id} />
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'organization':
        return renderOrganizationSection();
      case 'system':
        return renderSystemSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'tax':
        return renderTaxSection();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization and preferences
          </p>
        </div>
        <Button onClick={handleSaveOrganization} disabled={loading} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Mobile Navigation - Horizontal scroll tabs */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Sidebar Navigation - Desktop only */}
        <div className="hidden lg:block w-64 shrink-0">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium text-sm", isActive && "text-primary")}>
                      {section.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {section.description}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    isActive ? "text-primary rotate-90" : "text-muted-foreground/50"
                  )} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
