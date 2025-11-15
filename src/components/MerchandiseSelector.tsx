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
  onHasMerchandise?: (hasMerchandise: boolean) => void;
}

const MerchandiseSelector: React.FC<MerchandiseSelectorProps> = ({ eventId, onCartUpdate, theme, onHasMerchandise }) => {
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

  useEffect(() => {
    onHasMerchandise?.(merchandise.length > 0);
  }, [merchandise, onHasMerchandise]);

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
    <Card className="animate-in fade-in-0" style={{ backgroundColor: theme?.cardBackgroundColor, border: theme?.borderEnabled ? `1px solid ${theme?.borderColor}` : undefined }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: theme?.headerTextColor || '#111827' }}>
          <ShoppingCart className="h-6 w-6" />
          Merchandise
        </CardTitle>
        <p className="text-gray-600 mt-2">Add merchandise to your order</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {merchandise.map((item) => {
            const isAvailable = item.stock_quantity > 0;

            return (
              <div
                key={item.id}
                className={`group border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white ${!isAvailable ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">${item.price}</div>
                        <div className="text-sm text-gray-500 font-medium">
                          {isAvailable ? `${item.stock_quantity} available` : 'Out of stock'}
                        </div>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <div className="lg:ml-8">
                    <Button
                      onClick={() => addToCart(item)}
                      className="w-full lg:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      disabled={!isAvailable}
                      style={{
                        backgroundColor: theme?.primaryColor,
                        color: theme?.buttonTextColor
                      }}
                      size="default"
                    >
                      {!isAvailable ? (
                        "Out of Stock"
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};


export default MerchandiseSelector;