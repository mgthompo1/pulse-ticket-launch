-- Create attraction products and retail management tables
-- Supports pro shop, retail, and inventory management for attractions

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attraction Products (Pro Shop items, retail, etc.)
CREATE TABLE IF NOT EXISTS attraction_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  category TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  brand TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  track_inventory BOOLEAN DEFAULT true,
  inventory_count INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  allow_backorder BOOLEAN DEFAULT false,
  has_variants BOOLEAN DEFAULT false,
  variant_options JSONB DEFAULT '[]',
  requires_shipping BOOLEAN DEFAULT false,
  weight_grams INTEGER,
  dimensions JSONB,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  taxable BOOLEAN DEFAULT true,
  tax_code TEXT,
  vendor_id UUID,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product Variants (sizes, colors, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES attraction_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),
  option_values JSONB DEFAULT '{}',
  inventory_count INTEGER DEFAULT 0,
  image_url TEXT,
  weight_grams INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product Sales
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES attraction_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  booking_id UUID REFERENCES attraction_bookings(id) ON DELETE SET NULL,
  client_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_reason TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partial_refund')),
  stripe_payment_intent_id TEXT,
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'fulfilled', 'shipped', 'delivered', 'cancelled')),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID,
  tracking_number TEXT,
  shipping_carrier TEXT,
  sold_by UUID,
  notes TEXT,
  sale_channel TEXT DEFAULT 'pos' CHECK (sale_channel IN ('pos', 'online', 'booking', 'phone')),
  sold_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory Transactions (audit trail for stock changes)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES attraction_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return', 'adjustment', 'restock', 'transfer', 'damage', 'shrinkage')),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attraction_products_attraction ON attraction_products(attraction_id);
CREATE INDEX IF NOT EXISTS idx_attraction_products_category ON attraction_products(category);
CREATE INDEX IF NOT EXISTS idx_attraction_products_sku ON attraction_products(sku);
CREATE INDEX IF NOT EXISTS idx_attraction_products_barcode ON attraction_products(barcode);
CREATE INDEX IF NOT EXISTS idx_attraction_products_active ON attraction_products(attraction_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_product_sales_attraction ON product_sales(attraction_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_booking ON product_sales(booking_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_sold_at ON product_sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_product_sales_payment ON product_sales(attraction_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_product_categories_attraction ON product_categories(attraction_id);

-- Trigger for updating inventory on sale
CREATE OR REPLACE FUNCTION update_product_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Decrease inventory when payment is confirmed
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET inventory_count = inventory_count - NEW.quantity
      WHERE id = NEW.variant_id;
    ELSIF NEW.product_id IS NOT NULL THEN
      UPDATE attraction_products
      SET inventory_count = inventory_count - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    END IF;
  ELSIF NEW.payment_status = 'refunded' AND OLD.payment_status = 'paid' THEN
    -- Restore inventory on refund
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET inventory_count = inventory_count + NEW.quantity
      WHERE id = NEW.variant_id;
    ELSIF NEW.product_id IS NOT NULL THEN
      UPDATE attraction_products
      SET inventory_count = inventory_count + NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_on_sale ON product_sales;
CREATE TRIGGER trigger_update_inventory_on_sale
  AFTER INSERT OR UPDATE ON product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_inventory_on_sale();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attraction_products_updated_at ON attraction_products;
CREATE TRIGGER trigger_update_attraction_products_updated_at
  BEFORE UPDATE ON attraction_products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_updated_at();

DROP TRIGGER IF EXISTS trigger_update_product_variants_updated_at ON product_variants;
CREATE TRIGGER trigger_update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_updated_at();

-- RLS Policies
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE attraction_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Allow public read for active products (for customer-facing)
CREATE POLICY "Public can view active products"
  ON attraction_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view active categories"
  ON product_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view active variants"
  ON product_variants FOR SELECT
  USING (is_active = true);

-- Org members can manage products
CREATE POLICY "Org members can manage products"
  ON attraction_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = attraction_products.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage categories"
  ON product_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = product_categories.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attraction_products p
      JOIN attractions a ON a.id = p.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE p.id = product_variants.product_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage sales"
  ON product_sales FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = product_sales.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can view inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attraction_products p
      JOIN attractions a ON a.id = p.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE p.id = inventory_transactions.product_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can create inventory transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attraction_products p
      JOIN attractions a ON a.id = p.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE p.id = inventory_transactions.product_id
      AND ou.user_id = auth.uid()
    )
  );
