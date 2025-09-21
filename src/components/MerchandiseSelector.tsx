import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Theme } from '@/types/theme';

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
  theme?: Theme;
}

const MerchandiseSelector: React.FC<MerchandiseSelectorProps> = ({ eventId, onCartUpdate, theme }) => {
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

  const addToCart = (item: MerchandiseItem) => {
    // For now, add without size/color options (can be enhanced later)
    const existingItem = cart.find(cartItem =>
      cartItem.merchandise.id === item.id
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
        quantity: 1
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
    <div className="space-y-4">
      {merchandise.map((item) => {
        const isAvailable = item.stock_quantity > 0;

        return (
          <Card
            key={item.id}
            className={!isAvailable ? 'opacity-50' : ''}
            style={{ backgroundColor: theme?.cardBackgroundColor, border: theme?.borderEnabled ? `1px solid ${theme?.borderColor}` : undefined }}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg" style={{ color: theme?.headerTextColor || '#111827' }}>{item.name}</CardTitle>
                  {item.description && (
                    <CardDescription className="mt-1" style={{ color: theme?.bodyTextColor }}>
                      {item.description}
                    </CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold" style={{ color: theme?.headerTextColor || '#111827' }}>${item.price}</div>
                  <Badge variant={isAvailable ? "secondary" : "secondary"}>
                    {isAvailable
                      ? `${item.stock_quantity} available`
                      : 'Out of stock'
                    }
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {isAvailable && (
              <CardContent>
                <div className="flex justify-end">
                  <Button
                    onClick={() => addToCart(item)}
                    variant="secondary"
                    className="border-0"
                    disabled={item.stock_quantity <= 0}
                    style={{
                      backgroundColor: theme?.primaryColor,
                      color: theme?.buttonTextColor
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};


export default MerchandiseSelector;