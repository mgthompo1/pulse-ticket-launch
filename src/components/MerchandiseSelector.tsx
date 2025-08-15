import { useState, useEffect } from 'react';
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


  if (loading) {
    return <div>Loading merchandise...</div>;
  }

  if (merchandise.length === 0) {
    return null; // Don't show the section if no merchandise is available
  }

  return (
    <Card className="animate-in fade-in-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Event Merchandise
        </CardTitle>
      </CardHeader>
      <CardContent>
        {merchandise.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No merchandise available for this event.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {merchandise.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover-lift animate-in fade-in-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.description && (
                        <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                      )}
                      <div className="text-lg font-bold text-primary mt-2">${item.price}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {item.stock_quantity} in stock
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <MerchandiseCardControls
                    item={item}
                    onAddToCart={addToCart}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

  );
};

interface MerchandiseCardControlsProps {
  item: MerchandiseItem;
  onAddToCart: (item: MerchandiseItem, size?: string, color?: string) => void;
}

const MerchandiseCardControls: React.FC<MerchandiseCardControlsProps> = ({ item, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(0);

  const canAddToCart = () => {
    const needsSize = item.size_options && item.size_options.length > 0;
    const needsColor = item.color_options && item.color_options.length > 0;
    
    if (needsSize && !selectedSize) return false;
    if (needsColor && !selectedColor) return false;
    
    return true;
  };

  const handleAddToCart = () => {
    if (canAddToCart() && quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        onAddToCart(item, selectedSize || undefined, selectedColor || undefined);
      }
      setQuantity(0);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:min-w-[200px]">
      {/* Size Selection */}
      {item.size_options && item.size_options.length > 0 && (
        <div>
          <label className="text-sm font-medium">Size:</label>
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="mt-1 h-8">
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

      {/* Color Selection */}
      {item.color_options && item.color_options.length > 0 && (
        <div>
          <label className="text-sm font-medium">Color:</label>
          <Select value={selectedColor} onValueChange={setSelectedColor}>
            <SelectTrigger className="mt-1 h-8">
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

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setQuantity(Math.max(0, quantity - 1))}
          disabled={quantity <= 0}
          className="h-8 w-8 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setQuantity(Math.min(item.stock_quantity, quantity + 1))}
          disabled={quantity >= item.stock_quantity}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Add to Cart Button */}
      {quantity > 0 && (
        <Button
          size="sm"
          onClick={handleAddToCart}
          disabled={!canAddToCart() || item.stock_quantity === 0}
          className="w-full"
        >
          Add {quantity} to Cart
        </Button>
      )}
    </div>
  );
};

export default MerchandiseSelector;