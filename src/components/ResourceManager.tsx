import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus,
  Monitor,
  Users,
  Trash2,
  Edit,
  Save,
  X,
  MapPin
} from "lucide-react";

interface ResourceManagerProps {
  attractionId: string;
  attractionName: string;
}

interface AttractionResource {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  is_active: boolean;
  resource_data: any;
  created_at: string;
}

const ResourceManager: React.FC<ResourceManagerProps> = ({ 
  attractionId, 
  attractionName 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resources, setResources] = useState<AttractionResource[]>([]);
  
  // Form state for creating/editing resources
  const [resourceForm, setResourceForm] = useState({
    name: "",
    description: "",
    capacity: 1,
    is_active: true
  });

  useEffect(() => {
    if (attractionId) {
      loadResources();
    }
  }, [attractionId]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attraction_resources")
        .select("*")
        .eq("attraction_id", attractionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setResources(data || []);
    } catch (error) {
      console.error("Error loading resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createResource = async () => {
    if (!resourceForm.name) {
      toast({
        title: "Error",
        description: "Resource name is required",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("attraction_resources")
        .insert({
          attraction_id: attractionId,
          name: resourceForm.name,
          description: resourceForm.description || null,
          capacity: resourceForm.capacity,
          is_active: resourceForm.is_active,
          resource_data: {}
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource created successfully!"
      });

      // Reset form
      setResourceForm({
        name: "",
        description: "",
        capacity: 1,
        is_active: true
      });

      // Reload resources
      loadResources();
    } catch (error) {
      console.error("Error creating resource:", error);
      toast({
        title: "Error",
        description: "Failed to create resource",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const updateResource = async (resourceId: string, updates: Partial<AttractionResource>) => {
    try {
      const { error } = await supabase
        .from("attraction_resources")
        .update(updates)
        .eq("id", resourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource updated successfully!"
      });

      setEditingId(null);
      loadResources();
    } catch (error) {
      console.error("Error updating resource:", error);
      toast({
        title: "Error",
        description: "Failed to update resource",
        variant: "destructive"
      });
    }
  };

  const deleteResource = async (resourceId: string, resourceName: string) => {
    if (!confirm(`Are you sure you want to delete "${resourceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("attraction_resources")
        .delete()
        .eq("id", resourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource deleted successfully!"
      });

      loadResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive"
      });
    }
  };

  const toggleResourceStatus = async (resourceId: string, currentStatus: boolean) => {
    await updateResource(resourceId, { is_active: !currentStatus });
  };

  const startEditing = (resource: AttractionResource) => {
    setEditingId(resource.id);
    setResourceForm({
      name: resource.name,
      description: resource.description || "",
      capacity: resource.capacity,
      is_active: resource.is_active
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setResourceForm({
      name: "",
      description: "",
      capacity: 1,
      is_active: true
    });
  };

  const saveEditing = () => {
    if (editingId) {
      updateResource(editingId, {
        name: resourceForm.name,
        description: resourceForm.description || null,
        capacity: resourceForm.capacity,
        is_active: resourceForm.is_active
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Resource Management - {attractionName}
          </CardTitle>
          <CardDescription>
            Manage individual resources for your attraction (e.g., specific simulators, rooms, equipment)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Resource */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Resource
          </CardTitle>
          <CardDescription>
            Create individual bookable resources for your attraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource-name">Resource Name *</Label>
              <Input
                id="resource-name"
                value={resourceForm.name}
                onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Simulator 1, Room A, Lane 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-capacity">Capacity *</Label>
              <Input
                id="resource-capacity"
                type="number"
                min="1"
                value={resourceForm.capacity}
                onChange={(e) => setResourceForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                placeholder="How many people can use this at once"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              value={resourceForm.description}
              onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of this resource..."
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="resource-active"
              checked={resourceForm.is_active}
              onCheckedChange={(checked) => setResourceForm(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="resource-active">Active (available for booking)</Label>
          </div>
          
          <Button onClick={createResource} disabled={creating} className="w-full md:w-auto">
            {creating ? "Creating..." : "Add Resource"}
          </Button>
        </CardContent>
      </Card>

      {/* Resources List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Your Resources
            </span>
            <Badge variant="secondary">
              {resources.filter(r => r.is_active).length} active
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your attraction's individual resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No resources created yet.</p>
              <p className="text-sm">Add resources above to allow customers to select specific equipment/rooms.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    resource.is_active ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {editingId === resource.id ? (
                    /* Editing Mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Resource Name</Label>
                          <Input
                            value={resourceForm.name}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={resourceForm.capacity}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea
                          value={resourceForm.description}
                          onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={resourceForm.is_active}
                            onCheckedChange={(checked) => setResourceForm(prev => ({ ...prev, is_active: checked }))}
                          />
                          <Label>Active</Label>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditing}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{resource.name}</h3>
                          <Badge variant={resource.is_active ? "default" : "secondary"}>
                            {resource.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        {resource.description && (
                          <p className="text-muted-foreground mb-2">{resource.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Capacity: {resource.capacity}
                          </span>
                          <span>
                            Created: {new Date(resource.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleResourceStatus(resource.id, resource.is_active)}
                        >
                          {resource.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(resource)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteResource(resource.id, resource.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Resources Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Resources</strong> represent individual bookable items (e.g., "Golf Simulator 1", "Conference Room A")</p>
          <p>• <strong>Capacity</strong> determines how many people can book the same resource at the same time</p>
          <p>• <strong>Active resources</strong> are available for customer booking</p>
          <p>• <strong>Inactive resources</strong> are hidden from customers but preserved in your system</p>
          <p>• Customers will be able to select specific resources when making their booking</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceManager;
