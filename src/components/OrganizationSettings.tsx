import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Mail, Globe, Phone, MapPin, Upload, Save } from "lucide-react";

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
  });

  useEffect(() => {
    loadOrganization();
  }, [user]);

  const loadOrganization = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
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
        })
        .eq("id", organizationData.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Organization settings saved successfully!"
      });

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
            Manage your organization's profile and contact information
          </p>
        </div>
        <Button onClick={handleSaveOrganization} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Logo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Upload your company logo. This will appear on invoices and tickets.
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
    </div>
  );
};

export default OrganizationSettings;