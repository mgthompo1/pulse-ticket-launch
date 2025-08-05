import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EventLogoUploaderProps {
  eventId: string;
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
}

export const EventLogoUploader = ({ eventId, currentLogoUrl, onLogoChange }: EventLogoUploaderProps) => {
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
      const fileName = `${eventId}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('event-logos')
        .getPublicUrl(fileName);

      const logoUrl = data.publicUrl;

      // Update event record
      const { error: updateError } = await supabase
        .from('events')
        .update({ logo_url: logoUrl })
        .eq('id', eventId);

      if (updateError) throw updateError;

      onLogoChange(logoUrl);
      toast({
        title: "Success",
        description: "Event logo uploaded successfully"
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
        const fileName = `${eventId}/logo.${currentLogoUrl.split('.').pop()}`;
        await supabase.storage
          .from('event-logos')
          .remove([fileName]);
      }

      // Update event record
      const { error } = await supabase
        .from('events')
        .update({ logo_url: null })
        .eq('id', eventId);

      if (error) throw error;

      onLogoChange(null);
      toast({
        title: "Success",
        description: "Event logo removed successfully"
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
          Event Logo
        </CardTitle>
        <CardDescription>
          Upload a logo for your event that will appear on the ticket widget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLogoUrl ? (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={currentLogoUrl} 
                alt="Event logo" 
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
            <p className="text-lg font-medium mb-2">Upload Event Logo</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop an image file here, or click to select
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
              Supports JPG, PNG, GIF up to 5MB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};