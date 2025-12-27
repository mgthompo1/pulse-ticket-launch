/**
 * Products & Retail Hooks
 * CRUD operations for product catalog and sales
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AttractionProduct,
  ProductVariant,
  ProductSale,
  ProductCategory,
  InventoryTransaction,
  PaymentStatus,
  FulfillmentStatus,
  SaleChannel,
} from '@/types/verticals';

// ============================================================================
// Products
// ============================================================================

interface UseProductsOptions {
  attractionId: string;
  includeInactive?: boolean;
  category?: string;
  search?: string;
  lowStockOnly?: boolean;
}

export function useProducts({
  attractionId,
  includeInactive = false,
  category,
  search,
  lowStockOnly = false,
}: UseProductsOptions) {
  return useQuery({
    queryKey: ['products', attractionId, includeInactive, category, search, lowStockOnly],
    queryFn: async () => {
      let query = supabase
        .from('attraction_products')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('display_order')
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`);
      }

      if (lowStockOnly) {
        // This is a bit complex - we need products where inventory_count <= low_stock_threshold
        query = query.eq('track_inventory', true).lte('inventory_count', 'low_stock_threshold');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter low stock in JavaScript since the SQL comparison is tricky
      let products = data as AttractionProduct[];
      if (lowStockOnly) {
        products = products.filter(p => p.track_inventory && p.inventory_count <= p.low_stock_threshold);
      }

      return products;
    },
    enabled: !!attractionId,
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as AttractionProduct;
    },
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<AttractionProduct, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('attraction_products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.attraction_id] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttractionProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('attraction_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AttractionProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.attraction_id] });
      queryClient.invalidateQueries({ queryKey: ['product', data.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, attractionId }: { productId: string; attractionId: string }) => {
      const { error } = await supabase
        .from('attraction_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return { productId, attractionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.attractionId] });
    },
  });
}

// ============================================================================
// Product Variants
// ============================================================================

export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ['productVariants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(variant)
        .select()
        .single();

      if (error) throw error;
      return data as ProductVariant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', data.product_id] });
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductVariant> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_variants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductVariant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', data.product_id] });
    },
  });
}

export function useDeleteProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ variantId, productId }: { variantId: string; productId: string }) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      return { variantId, productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', data.productId] });
    },
  });
}

// ============================================================================
// Product Categories
// ============================================================================

export function useProductCategories(attractionId: string) {
  return useQuery({
    queryKey: ['productCategories', attractionId],
    queryFn: async () => {
      // Get unique categories from products (simple text-based categories)
      const { data, error } = await supabase
        .from('attraction_products')
        .select('category')
        .eq('attraction_id', attractionId)
        .not('category', 'is', null);

      if (error) throw error;

      // Extract unique category names
      const uniqueCategories = [...new Set(
        (data || [])
          .map(p => p.category)
          .filter((c): c is string => !!c)
      )];

      // Always include 'General' as default
      if (!uniqueCategories.includes('General')) {
        uniqueCategories.unshift('General');
      }

      return uniqueCategories.sort();
    },
    enabled: !!attractionId,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<ProductCategory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('product_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productCategories', data.attraction_id] });
    },
  });
}

// ============================================================================
// Product Sales
// ============================================================================

interface UseProductSalesOptions {
  attractionId: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  clientId?: string;
  limit?: number;
}

export function useProductSales({
  attractionId,
  startDate,
  endDate,
  paymentStatus,
  fulfillmentStatus,
  clientId,
  limit = 100,
}: UseProductSalesOptions) {
  return useQuery({
    queryKey: ['productSales', attractionId, startDate, endDate, paymentStatus, fulfillmentStatus, clientId],
    queryFn: async () => {
      let query = supabase
        .from('product_sales')
        .select(`
          *,
          product:attraction_products(name, image_url),
          variant:product_variants(name),
          client:client_profiles(first_name, last_name, email)
        `)
        .eq('attraction_id', attractionId)
        .order('sold_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('sold_at', startDate);
      }

      if (endDate) {
        query = query.lte('sold_at', endDate);
      }

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      if (fulfillmentStatus) {
        query = query.eq('fulfillment_status', fulfillmentStatus);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductSale[];
    },
    enabled: !!attractionId,
  });
}

interface CreateSaleInput {
  attraction_id: string;
  product_id?: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  booking_id?: string;
  client_id?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  discount_reason?: string;
  tax_amount?: number;
  tax_rate?: number;
  payment_status?: PaymentStatus;
  stripe_payment_intent_id?: string;
  sale_channel?: SaleChannel;
  notes?: string;
}

export function useCreateProductSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: CreateSaleInput) => {
      const totalPrice = (sale.unit_price * sale.quantity) - (sale.discount_amount || 0) + (sale.tax_amount || 0);

      const { data, error } = await supabase
        .from('product_sales')
        .insert({
          ...sale,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProductSale;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productSales', data.attraction_id] });
      if (data.product_id) {
        queryClient.invalidateQueries({ queryKey: ['product', data.product_id] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      paymentStatus,
      fulfillmentStatus,
      trackingNumber,
      shippingCarrier,
    }: {
      id: string;
      paymentStatus?: PaymentStatus;
      fulfillmentStatus?: FulfillmentStatus;
      trackingNumber?: string;
      shippingCarrier?: string;
    }) => {
      const updates: Partial<ProductSale> = {};

      if (paymentStatus) updates.payment_status = paymentStatus;
      if (fulfillmentStatus) {
        updates.fulfillment_status = fulfillmentStatus;
        if (fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'shipped') {
          updates.fulfilled_at = new Date().toISOString();
        }
      }
      if (trackingNumber) updates.tracking_number = trackingNumber;
      if (shippingCarrier) updates.shipping_carrier = shippingCarrier;

      const { data, error } = await supabase
        .from('product_sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductSale;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productSales', data.attraction_id] });
    },
  });
}

// ============================================================================
// Inventory Management
// ============================================================================

interface AdjustInventoryInput {
  productId?: string;
  variantId?: string;
  quantityChange: number;
  transactionType: 'adjustment' | 'restock' | 'damage' | 'shrinkage';
  notes?: string;
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, variantId, quantityChange, transactionType, notes }: AdjustInventoryInput) => {
      if (variantId) {
        // Get current count
        const { data: variant } = await supabase
          .from('product_variants')
          .select('inventory_count, product_id')
          .eq('id', variantId)
          .single();

        if (!variant) throw new Error('Variant not found');

        const newCount = variant.inventory_count + quantityChange;

        // Update variant
        await supabase
          .from('product_variants')
          .update({ inventory_count: newCount })
          .eq('id', variantId);

        // Record transaction
        const { data, error } = await supabase
          .from('inventory_transactions')
          .insert({
            product_id: variant.product_id,
            variant_id: variantId,
            quantity_change: quantityChange,
            quantity_before: variant.inventory_count,
            quantity_after: newCount,
            transaction_type: transactionType,
            notes,
          })
          .select()
          .single();

        if (error) throw error;
        return data as InventoryTransaction;
      } else if (productId) {
        // Get current count
        const { data: product } = await supabase
          .from('attraction_products')
          .select('inventory_count')
          .eq('id', productId)
          .single();

        if (!product) throw new Error('Product not found');

        const newCount = product.inventory_count + quantityChange;

        // Update product
        await supabase
          .from('attraction_products')
          .update({ inventory_count: newCount })
          .eq('id', productId);

        // Record transaction
        const { data, error } = await supabase
          .from('inventory_transactions')
          .insert({
            product_id: productId,
            quantity_change: quantityChange,
            quantity_before: product.inventory_count,
            quantity_after: newCount,
            transaction_type: transactionType,
            notes,
          })
          .select()
          .single();

        if (error) throw error;
        return data as InventoryTransaction;
      }

      throw new Error('Either productId or variantId is required');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productVariants'] });
    },
  });
}

export function useInventoryHistory(productId: string) {
  return useQuery({
    queryKey: ['inventoryHistory', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!productId,
  });
}

// ============================================================================
// Sales Analytics
// ============================================================================

interface SalesAnalytics {
  totalRevenue: number;
  totalSales: number;
  totalUnits: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
  }>;
}

export function useProductSalesAnalytics(attractionId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['productSalesAnalytics', attractionId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sales')
        .select('product_id, product_name, quantity, total_price')
        .eq('attraction_id', attractionId)
        .eq('payment_status', 'paid')
        .gte('sold_at', startDate)
        .lte('sold_at', endDate);

      if (error) throw error;

      const sales = data || [];

      // Calculate totals
      const totalRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);
      const totalSales = sales.length;
      const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Group by product
      const productMap = new Map<string, { name: string; units: number; revenue: number }>();
      sales.forEach(sale => {
        const key = sale.product_id || 'unknown';
        const existing = productMap.get(key) || { name: sale.product_name, units: 0, revenue: 0 };
        productMap.set(key, {
          name: sale.product_name,
          units: existing.units + sale.quantity,
          revenue: existing.revenue + sale.total_price,
        });
      });

      // Sort by revenue
      const topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          unitsSold: data.units,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalRevenue,
        totalSales,
        totalUnits,
        averageOrderValue,
        topProducts,
      } as SalesAnalytics;
    },
    enabled: !!attractionId && !!startDate && !!endDate,
  });
}
