import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AttractionLogoUploaderProps {
  attractionId: string;
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
}

export const AttractionLogoUploader = ({ attractionId, currentLogoUrl, onLogoChange }: AttractionLogoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `attractions/${attractionId}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      const logoUrl = data.publicUrl;

      // Update attraction record
      const { error: updateError } = await supabase
        .from('attractions')
        .update({ logo_url: logoUrl })
        .eq('id', attractionId);

      if (updateError) throw updateError;

      onLogoChange(logoUrl);
      toast({
        title: "Success",
        description: "Attraction logo uploaded successfully"
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      // Remove from storage
      if (currentLogoUrl) {
        const fileName = `attractions/${attractionId}/logo.${currentLogoUrl.split('.').pop()}`;
        await supabase.storage
          .from('public')
          .remove([fileName]);
      }

      // Update attraction record
      const { error } = await supabase
        .from('attractions')
        .update({ logo_url: null })
        .eq('id', attractionId);

      if (error) throw error;

      onLogoChange(null);
      toast({
        title: "Success",
        description: "Attraction logo removed successfully"
      });

    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Attraction Logo & Hero Banner
        </CardTitle>
        <CardDescription>
          Upload a logo for your attraction that will appear as a hero banner on the booking widget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLogoUrl ? (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={currentLogoUrl} 
                alt="Attraction logo" 
                className="w-32 h-32 object-contain border rounded-lg bg-muted"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 w-6 h-6 p-0"
                onClick={removeLogo}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div>
              <Label htmlFor="logo-upload-replace">Replace Logo</Label>
              <Input
                id="logo-upload-replace"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="mt-1"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>This logo will appear as a hero banner at the top of your booking widget, similar to event widgets.</p>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Upload Attraction Logo</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop an image file here, or click to select. This will appear as a hero banner.
            </p>
            <div className="space-y-2">
              <Label htmlFor="logo-upload">
                Choose File
              </Label>
              <Button variant="outline" disabled={uploading} asChild>
                <label htmlFor="logo-upload" className="cursor-pointer">
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
              </Button>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Supports JPG, PNG, GIF up to 5MB. Recommended size: 400x200px or larger.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
