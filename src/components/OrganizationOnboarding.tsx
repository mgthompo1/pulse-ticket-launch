import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Building2, ArrowRight } from "lucide-react";

interface OrganizationOnboardingProps {
  onComplete: () => void;
}

const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    description: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an organization",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Organization name and email are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .insert({
          user_id: user.id,
          name: formData.name,
          email: formData.email,
          website: formData.website || null,
          test_mode: true, // Start in test mode
          billing_setup_required: true,
          billing_setup_completed: false,
          payment_provider: "stripe",
          currency: "NZD"
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Organization created successfully. You can now start creating events.",
      });

      onComplete();
    } catch (error) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to Pulse Ticket</CardTitle>
          <CardDescription>
            Let's set up your organization to get started with event management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Organization Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="contact@yourorganization.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://yourorganization.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tell us about your organization..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                "Creating Organization..."
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your organization will be created in test mode</li>
              <li>• You can start creating and testing events</li>
              <li>• Set up billing when ready to go live</li>
              <li>• Configure payment methods and integrations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationOnboarding; 