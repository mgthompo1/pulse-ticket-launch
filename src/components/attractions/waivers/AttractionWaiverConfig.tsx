/**
 * AttractionWaiverConfig - Manage waiver templates for attractions
 * Includes waiver timing configuration (online, at check-in, or both)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Plus, Pencil, Trash2, Eye, Clock, Globe, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AttractionWaiverTemplate {
  id: string;
  organization_id: string;
  attraction_id: string | null;
  title: string;
  content: string;
  is_active: boolean;
  require_signature: boolean;
  require_date_of_birth: boolean;
  require_emergency_contact: boolean;
  waiver_timing: 'online' | 'at_checkin' | 'both';
  created_at: string;
  updated_at: string;
}

interface AttractionWaiverConfigProps {
  attractionId: string;
  organizationId: string;
}

const WAIVER_TIMING_OPTIONS = [
  { value: 'online', label: 'During Online Booking', icon: Globe, description: 'Customer signs waiver before payment' },
  { value: 'at_checkin', label: 'At Check-In', icon: Users, description: 'Staff collects signature when guest arrives' },
  { value: 'both', label: 'Both Online & Check-In', icon: Clock, description: 'Required at booking AND verified at check-in' },
];

export const AttractionWaiverConfig: React.FC<AttractionWaiverConfigProps> = ({
  attractionId,
  organizationId,
}) => {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState<AttractionWaiverTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<AttractionWaiverTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [waiverToDelete, setWaiverToDelete] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewWaiver, setPreviewWaiver] = useState<AttractionWaiverTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "Liability Waiver",
    content: "",
    is_active: true,
    require_signature: true,
    require_date_of_birth: false,
    require_emergency_contact: false,
    waiver_timing: 'online' as 'online' | 'at_checkin' | 'both',
  });

  useEffect(() => {
    loadWaivers();
  }, [attractionId, organizationId]);

  const loadWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from("waiver_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .or(`attraction_id.eq.${attractionId},attraction_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaivers((data || []) as AttractionWaiverTemplate[]);
    } catch (error) {
      console.error("Error loading waivers:", error);
      toast({
        title: "Error",
        description: "Failed to load waivers",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingWaiver) {
        // Update existing waiver
        const { error } = await supabase
          .from("waiver_templates")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingWaiver.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Waiver updated successfully",
        });
      } else {
        // Create new waiver
        const { error } = await supabase
          .from("waiver_templates")
          .insert([
            {
              ...formData,
              organization_id: organizationId,
              attraction_id: attractionId,
            },
          ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Waiver created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadWaivers();
    } catch (error) {
      console.error("Error saving waiver:", error);
      toast({
        title: "Error",
        description: "Failed to save waiver",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (waiver: AttractionWaiverTemplate) => {
    setEditingWaiver(waiver);
    setFormData({
      title: waiver.title,
      content: waiver.content,
      is_active: waiver.is_active,
      require_signature: waiver.require_signature,
      require_date_of_birth: waiver.require_date_of_birth,
      require_emergency_contact: waiver.require_emergency_contact,
      waiver_timing: waiver.waiver_timing || 'online',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!waiverToDelete) return;

    try {
      const { error } = await supabase
        .from("waiver_templates")
        .delete()
        .eq("id", waiverToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Waiver deleted successfully",
      });

      loadWaivers();
    } catch (error) {
      console.error("Error deleting waiver:", error);
      toast({
        title: "Error",
        description: "Failed to delete waiver",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setWaiverToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "Liability Waiver",
      content: "",
      is_active: true,
      require_signature: true,
      require_date_of_birth: false,
      require_emergency_contact: false,
      waiver_timing: 'online',
    });
    setEditingWaiver(null);
  };

  const handlePreview = (waiver: AttractionWaiverTemplate) => {
    setPreviewWaiver(waiver);
    setPreviewDialogOpen(true);
  };

  const getTimingBadge = (timing: string) => {
    const option = WAIVER_TIMING_OPTIONS.find(o => o.value === timing);
    if (!option) return null;
    const Icon = option.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {option.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Waiver List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Waiver Templates
              </CardTitle>
              <CardDescription>
                Manage waivers that guests must sign during booking or check-in
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Waiver
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingWaiver ? "Edit Waiver" : "Create New Waiver"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure a waiver template for guests to sign
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Waiver Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Liability Waiver, Photo Release"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Waiver Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Enter the full text of your waiver here..."
                      className="min-h-[200px]"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This text will be displayed to guests during the booking or check-in process
                    </p>
                  </div>

                  {/* Waiver Timing */}
                  <div className="space-y-2">
                    <Label>When should this waiver be collected?</Label>
                    <Select
                      value={formData.waiver_timing}
                      onValueChange={(value: 'online' | 'at_checkin' | 'both') =>
                        setFormData({ ...formData, waiver_timing: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timing" />
                      </SelectTrigger>
                      <SelectContent>
                        {WAIVER_TIMING_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon className="w-4 h-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {WAIVER_TIMING_OPTIONS.find(o => o.value === formData.waiver_timing)?.description}
                    </p>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-sm">Options</h4>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active">Active</Label>
                        <p className="text-sm text-muted-foreground">
                          Only active waivers will be shown to guests
                        </p>
                      </div>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="require_signature">
                          Require Signature
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Guest must provide digital signature
                        </p>
                      </div>
                      <Switch
                        id="require_signature"
                        checked={formData.require_signature}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, require_signature: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="require_dob">Require Date of Birth</Label>
                        <p className="text-sm text-muted-foreground">
                          Collect date of birth during waiver signing
                        </p>
                      </div>
                      <Switch
                        id="require_dob"
                        checked={formData.require_date_of_birth}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            require_date_of_birth: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="require_emergency">
                          Require Emergency Contact
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Collect emergency contact information
                        </p>
                      </div>
                      <Switch
                        id="require_emergency"
                        checked={formData.require_emergency_contact}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            require_emergency_contact: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : editingWaiver ? "Update Waiver" : "Create Waiver"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {waivers.length === 0 ? (
            <div className="text-center py-8">
              <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No waivers configured yet
              </p>
              <p className="text-sm text-muted-foreground">
                Create a waiver template to require guest acknowledgment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waivers.map((waiver) => (
                <div
                  key={waiver.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{waiver.title}</h4>
                        <Badge variant={waiver.is_active ? "default" : "secondary"}>
                          {waiver.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {getTimingBadge(waiver.waiver_timing)}
                        {waiver.attraction_id === null && (
                          <Badge variant="outline">Organization-wide</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {waiver.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {waiver.require_signature && (
                          <span>✓ Signature required</span>
                        )}
                        {waiver.require_date_of_birth && (
                          <span>✓ DOB required</span>
                        )}
                        {waiver.require_emergency_contact && (
                          <span>✓ Emergency contact required</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreview(waiver)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(waiver)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setWaiverToDelete(waiver.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Waiver Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this waiver template. Previously signed
              waivers will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWaiverToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewWaiver?.title}</DialogTitle>
            <DialogDescription>
              This is how the waiver will appear to guests
            </DialogDescription>
          </DialogHeader>
          {previewWaiver && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/30">
                <p className="whitespace-pre-wrap text-sm">{previewWaiver.content}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">Required Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Full Name</li>
                  {previewWaiver.require_date_of_birth && <li>Date of Birth</li>}
                  {previewWaiver.require_emergency_contact && (
                    <>
                      <li>Emergency Contact Name</li>
                      <li>Emergency Contact Phone</li>
                    </>
                  )}
                  {previewWaiver.require_signature && <li>Digital Signature</li>}
                </ul>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm">
                  <span className="font-medium">Collection timing:</span>{' '}
                  {WAIVER_TIMING_OPTIONS.find(o => o.value === previewWaiver.waiver_timing)?.description}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttractionWaiverConfig;
