/**
 * ProductCatalog - Manage retail products
 * Used for pro shop, salon products, spa retail, etc.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Box,
  Search,
  ImagePlus,
  AlertTriangle,
} from 'lucide-react';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useProductCategories,
} from '@/hooks/useProducts';
import type { AttractionProduct } from '@/types/verticals';
import { cn } from '@/lib/utils';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  cost: number | null;
  quantity_in_stock: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_active: boolean;
  is_featured: boolean;
  image_url: string;
}

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  category: 'General',
  sku: '',
  price: 0,
  cost: null,
  quantity_in_stock: 0,
  low_stock_threshold: 5,
  track_inventory: true,
  is_active: true,
  is_featured: false,
  image_url: '',
};

interface ProductCatalogProps {
  attractionId: string;
  verticalType?: string;
  className?: string;
}

export function ProductCatalog({ attractionId, verticalType = 'golf', className }: ProductCatalogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AttractionProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newCategory, setNewCategory] = useState('');

  const { data: products, isLoading } = useProducts({ attractionId });
  const { data: categories } = useProductCategories(attractionId);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const shopLabel = verticalType === 'golf' ? 'Pro Shop' : 'Retail Products';

  // Filter products
  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      const matchesSearch = !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Low stock products
  const lowStockProducts = React.useMemo(() => {
    if (!products) return [];
    return products.filter(
      (p) => p.track_inventory && p.quantity_in_stock <= p.low_stock_threshold
    );
  }, [products]);

  const handleOpenDialog = (product?: AttractionProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category || 'General',
        sku: product.sku || '',
        price: product.price,
        cost: product.cost,
        quantity_in_stock: product.quantity_in_stock,
        low_stock_threshold: product.low_stock_threshold,
        track_inventory: product.track_inventory,
        is_active: product.is_active,
        is_featured: product.is_featured,
        image_url: product.image_url || '',
      });
    } else {
      setEditingProduct(null);
      setFormData(defaultFormData);
    }
    setNewCategory('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const category = newCategory || formData.category;
    const data = {
      ...formData,
      category,
      attraction_id: attractionId,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct.mutateAsync({ productId, attractionId });
    }
  };

  const generateSku = () => {
    const prefix = formData.category.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, sku: `${prefix}-${random}` });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {shopLabel}
            </CardTitle>
            <CardDescription>
              Manage your product inventory and pricing
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit' : 'Add'} Product
                </DialogTitle>
                <DialogDescription>
                  Configure product details, pricing, and inventory
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Titleist Pro V1 Golf Balls"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newCategory ? '__new__' : formData.category}
                      onValueChange={(val) => {
                        if (val === '__new__') {
                          setNewCategory('New Category');
                        } else {
                          setFormData({ ...formData, category: val });
                          setNewCategory('');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || ['General']).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ New Category</SelectItem>
                      </SelectContent>
                    </Select>
                    {newCategory && (
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Category name"
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sku">SKU</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={generateSku}>
                      Generate
                    </Button>
                  </div>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="GOLF-ABC123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost || ''}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || null })}
                      placeholder="Optional"
                    />
                    {formData.cost && formData.price > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Margin: {((1 - formData.cost / formData.price) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Inventory */}
                <div className="p-4 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Inventory</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor stock levels for this product
                      </p>
                    </div>
                    <Switch
                      checked={formData.track_inventory}
                      onCheckedChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
                    />
                  </div>

                  {formData.track_inventory && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity in Stock</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="0"
                          value={formData.quantity_in_stock}
                          onChange={(e) =>
                            setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="low_stock">Low Stock Alert</Label>
                        <Input
                          id="low_stock"
                          type="number"
                          min="0"
                          value={formData.low_stock_threshold}
                          onChange={(e) =>
                            setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createProduct.isPending || updateProduct.isPending}>
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Low stock alert */}
        {lowStockProducts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{lowStockProducts.length} products low in stock</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories || []).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {searchQuery || selectedCategory !== 'all' ? (
              <p>No products match your filters.</p>
            ) : (
              <>
                <p>No products yet.</p>
                <p className="text-sm">Add your first product to get started.</p>
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isLowStock =
                  product.track_inventory &&
                  product.quantity_in_stock <= product.low_stock_threshold;

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.is_featured && (
                              <Badge variant="secondary" className="text-xs">
                                Featured
                              </Badge>
                            )}
                          </div>
                          {product.category && (
                            <div className="text-sm text-muted-foreground">
                              {product.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {product.price.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.track_inventory ? (
                        <div className={cn('flex items-center gap-1', isLowStock && 'text-amber-600')}>
                          {isLowStock && <AlertTriangle className="w-4 h-4" />}
                          <Box className="w-4 h-4 text-muted-foreground" />
                          {product.quantity_in_stock}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductCatalog;
