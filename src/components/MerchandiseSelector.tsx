import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
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

interface CartItem {
  merchandise: MerchandiseItem;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface MerchandiseSelectorProps {
  eventId: string;
  onCartUpdate: (items: CartItem[]) => void;
}

const MerchandiseSelector: React.FC<MerchandiseSelectorProps> = ({ eventId, onCartUpdate }) => {
  const [merchandise, setMerchandise] = useState<MerchandiseItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMerchandise();
  }, [eventId]);

  useEffect(() => {
    onCartUpdate(cart);
  }, [cart, onCartUpdate]);

  const fetchMerchandise = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('category', { ascending: true });

      if (error) throw error;
      setMerchandise(data || []);
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

  const addToCart = (item: MerchandiseItem, size?: string, color?: string) => {
    const existingItem = cart.find(cartItem => 
      cartItem.merchandise.id === item.id && 
      cartItem.selectedSize === size && 
      cartItem.selectedColor === color
    );

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem === existingItem
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { 
        merchandise: item, 
        quantity: 1, 
        selectedSize: size, 
        selectedColor: color 
      }]);
    }

    toast({
      title: "Added to cart",
      description: `${item.name} added to your cart`,
    });
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(cart.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.merchandise.price * item.quantity), 0);
  };

  const groupedMerchandise = merchandise.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MerchandiseItem[]>);

  if (loading) {
    return <div>Loading merchandise...</div>;
  }

  if (merchandise.length === 0) {
    return null; // Don't show the section if no merchandise is available
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Event Merchandise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedMerchandise).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <MerchandiseCard
                      key={item.id}
                      item={item}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Merchandise Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={`${item.merchandise.id}-${item.selectedSize}-${item.selectedColor}`} 
                     className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.merchandise.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${item.merchandise.price} each
                      {item.selectedSize && ` • Size: ${item.selectedSize}`}
                      {item.selectedColor && ` • Color: ${item.selectedColor}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      disabled={item.quantity >= item.merchandise.stock_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <div className="ml-2 font-medium">
                      ${(item.merchandise.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Merchandise Total:</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface MerchandiseCardProps {
  item: MerchandiseItem;
  onAddToCart: (item: MerchandiseItem, size?: string, color?: string) => void;
}

const MerchandiseCard: React.FC<MerchandiseCardProps> = ({ item, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  const canAddToCart = () => {
    const needsSize = item.size_options && item.size_options.length > 0;
    const needsColor = item.color_options && item.color_options.length > 0;
    
    if (needsSize && !selectedSize) return false;
    if (needsColor && !selectedColor) return false;
    
    return true;
  };

  const handleAddToCart = () => {
    if (canAddToCart()) {
      onAddToCart(item, selectedSize || undefined, selectedColor || undefined);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-32 object-cover rounded-lg mb-3"
          />
        )}
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold">{item.name}</h4>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="text-lg font-bold text-primary">${item.price}</div>
          </div>

          {item.size_options && item.size_options.length > 0 && (
            <div>
              <label className="text-sm font-medium">Size:</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {item.size_options.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {item.color_options && item.color_options.length > 0 && (
            <div>
              <label className="text-sm font-medium">Color:</label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {item.color_options.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {item.stock_quantity} in stock
            </Badge>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!canAddToCart() || item.stock_quantity === 0}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchandiseSelector;