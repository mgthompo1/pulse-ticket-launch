import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category: string;
  size_options: string[];
  color_options: string[];
  is_active: boolean;
}

interface MerchandiseManagerProps {
  eventId: string;
}

const MerchandiseManager: React.FC<MerchandiseManagerProps> = ({ eventId }) => {
  const [merchandise, setMerchandise] = useState<MerchandiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MerchandiseItem | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    stock_quantity: '0',
    category: 'apparel',
    size_options: '',
    color_options: '',
    is_active: true
  });

  useEffect(() => {
    fetchMerchandise();
  }, [eventId]);

  const fetchMerchandise = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMerchandise((data || []).map(item => ({
        ...item,
        description: item.description || '',
        category: item.category || 'apparel',
        color_options: item.color_options || [],
        size_options: item.size_options || [],
        is_active: item.is_active ?? true,
        image_url: item.image_url || '',
        stock_quantity: item.stock_quantity || 0
      })));
    } catch (error) {
      console.error('Error fetching merchandise:', error);
      toast({
        title: "Error",
        description: "Failed to fetch merchandise items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const merchandiseData = {
        event_id: eventId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        stock_quantity: parseInt(formData.stock_quantity),
        category: formData.category,
        size_options: formData.size_options ? formData.size_options.split(',').map(s => s.trim()) : [],
        color_options: formData.color_options ? formData.color_options.split(',').map(s => s.trim()) : [],
        is_active: formData.is_active
      };

      let error;
      if (editingItem) {
        ({ error } = await supabase
          .from('merchandise')
          .update(merchandiseData)
          .eq('id', editingItem.id));
      } else {
        ({ error } = await supabase
          .from('merchandise')
          .insert([merchandiseData]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Merchandise ${editingItem ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      fetchMerchandise();
    } catch (error) {
      console.error('Error saving merchandise:', error);
      toast({
        title: "Error",
        description: "Failed to save merchandise item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: MerchandiseItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      stock_quantity: item.stock_quantity.toString(),
      category: item.category,
      size_options: item.size_options?.join(', ') || '',
      color_options: item.color_options?.join(', ') || '',
      is_active: item.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this merchandise item?')) return;

    try {
      const { error } = await supabase
        .from('merchandise')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Merchandise item deleted successfully",
      });

      fetchMerchandise();
    } catch (error) {
      console.error('Error deleting merchandise:', error);
      toast({
        title: "Error",
        description: "Failed to delete merchandise item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      stock_quantity: '0',
      category: 'apparel',
      size_options: '',
      color_options: '',
      is_active: true
    });
    setEditingItem(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>Loading merchandise...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Event Merchandise</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Merchandise
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit' : 'Add'} Merchandise Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apparel">Apparel</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="memorabilia">Memorabilia</SelectItem>
                      <SelectItem value="food">Food & Beverage</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size_options">Size Options (comma separated)</Label>
                  <Input
                    id="size_options"
                    value={formData.size_options}
                    onChange={(e) => setFormData({ ...formData, size_options: e.target.value })}
                    placeholder="S, M, L, XL"
                  />
                </div>
                <div>
                  <Label htmlFor="color_options">Color Options (comma separated)</Label>
                  <Input
                    id="color_options"
                    value={formData.color_options}
                    onChange={(e) => setFormData({ ...formData, color_options: e.target.value })}
                    placeholder="Black, White, Red"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingItem ? 'Update' : 'Create'} Merchandise
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {merchandise.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{item.name}</h3>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${item.price}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {item.stock_quantity} in stock
                  </span>
                </div>
                {item.size_options && item.size_options.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.size_options.map((size) => (
                      <Badge key={size} variant="outline" className="text-xs">
                        {size}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {merchandise.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No merchandise items yet</h3>
            <p className="text-muted-foreground">Add merchandise items to sell alongside tickets.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchandiseManager;