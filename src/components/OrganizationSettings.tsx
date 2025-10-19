import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Mail, Globe, Phone, MapPin, Upload, Save, Settings, Calendar, MapPin as Attraction } from "lucide-react";

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
}

const OrganizationSettings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

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
  });

  useEffect(() => {
    loadOrganization();
  }, [user]);

  const loadOrganization = async () => {
    if (!user) return;

    try {
      // First, try to find organization where user is the owner
      let { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If no owned organization found, check if user is a member of any organization
      if (error && error.code === 'PGRST116') {
        console.log("No owned organization found, checking memberships...");

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_users")
          .select(`
            organization_id,
            role,
            organizations (*)
          `)
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membershipError) {
          console.error("Error loading organization membership:", membershipError);
          return;
        }

        if (membershipData?.organizations) {
          data = membershipData.organizations as any;
          console.log("Found organization via membership:", data);
        }
      } else if (error) {
        console.error("Error loading organization:", error);
        return;
      }

      if (data) {
        setOrganizationData({
          id: data.id,
          name: data.name || "",
          email: data.email || "",
          website: data.website || "",
          logo_url: data.logo_url || "",
          address: data.address || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          country: data.country || "New Zealand",
          phone: data.phone || "",
          system_type: data.system_type || "EVENTS",
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

  const handleSystemTypeChange = (value: string) => {
    setOrganizationData(prev => ({
      ...prev,
      system_type: value
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationData.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
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

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('event-logos')
        .getPublicUrl(filePath);

      const logoUrl = data.publicUrl;

      // Update organization with new logo URL
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: logoUrl })
        .eq("id", organizationData.id);

      if (updateError) {
        throw updateError;
      }

      setOrganizationData(prev => ({
        ...prev,
        logo_url: logoUrl
      }));

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
    
    // Store the current system_type to check if it changed
    
    
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
        })
        .eq("id", organizationData.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Organization settings saved successfully!"
      });

      // If system_type was changed, refresh the page to update the UI
      // We need to refresh because the OrgDashboard component needs to reload with the new system type
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error saving organization:", error);
      toast({
        title: "Error",
        description: "Failed to save organization settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organization Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization's profile and system configuration
          </p>
        </div>
        <Button onClick={handleSaveOrganization} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Logo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Upload your company logo. This will appear on tickets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {organizationData.logo_url && (
                <div className="w-20 h-20 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={organizationData.logo_url}
                    alt="Organization logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg hover:bg-muted/50 transition-colors">
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
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or SVG. Max 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Your company's basic details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={organizationData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Your Company Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-email"
                  type="email"
                  value={organizationData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                  className="pl-10"
                  required
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
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>
              Your company's physical address
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
            <div className="grid grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
        </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Choose between Events or Attractions mode for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="system-type" className="text-base font-medium">
                  System Type
                </Label>
                <Select
                  value={organizationData.system_type || "EVENTS"}
                  onValueChange={handleSystemTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select system type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENTS">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Events</div>
                          <div className="text-sm text-muted-foreground">Ticketing for specific date events</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="ATTRACTIONS">
                      <div className="flex items-center gap-2">
                        <Attraction className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Attractions</div>
                          <div className="text-sm text-muted-foreground">Booking system for ongoing attractions</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Events Mode:</strong> Perfect for concerts, conferences, and time-specific events with fixed dates.</p>
                  <p><strong>Attractions Mode:</strong> Ideal for golf simulators, karaoke rooms, tours, and bookable experiences.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationSettings;