-- ============================================================================
-- Multi-Vertical Booking System - Phase 4: Products & Retail
-- Pro shop for golf, retail for salons, gift shop for tours, etc.
-- ============================================================================

-- 1. Product Catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS attraction_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),  -- Original price for showing discounts
  cost DECIMAL(10,2),  -- Cost to business (for profit tracking)
  currency TEXT DEFAULT 'NZD',

  -- Categorization
  category TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  brand TEXT,

  -- Images
  image_url TEXT,
  images TEXT[] DEFAULT '{}',

  -- Inventory
  track_inventory BOOLEAN DEFAULT true,
  inventory_count INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  allow_backorder BOOLEAN DEFAULT false,

  -- Variants (size, color, etc.)
  has_variants BOOLEAN DEFAULT false,
  variant_options JSONB DEFAULT '[]',  -- [{"name": "Size", "values": ["S", "M", "L"]}]

  -- Shipping/Fulfillment
  requires_shipping BOOLEAN DEFAULT false,
  weight_grams INTEGER,
  dimensions JSONB,  -- {length, width, height, unit}

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Tax
  taxable BOOLEAN DEFAULT true,
  tax_code TEXT,

  -- Metadata
  vendor_id TEXT,
  custom_attributes JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_attraction ON attraction_products(attraction_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON attraction_products(attraction_id, category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON attraction_products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON attraction_products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_inventory ON attraction_products(attraction_id, inventory_count)
  WHERE track_inventory = true;

COMMENT ON TABLE attraction_products IS 'Product catalog for retail/pro shop';

-- RLS
ALTER TABLE attraction_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products" ON attraction_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage products" ON attraction_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = attraction_products.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 2. Product Variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES attraction_products(id) ON DELETE CASCADE,

  -- Variant info
  name TEXT NOT NULL,  -- e.g., "Medium / Blue"
  sku TEXT,
  barcode TEXT,

  -- Pricing (can override product price)
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),

  -- Options
  option_values JSONB NOT NULL DEFAULT '{}',  -- {"Size": "M", "Color": "Blue"}

  -- Inventory
  inventory_count INTEGER DEFAULT 0,

  -- Image
  image_url TEXT,

  -- Weight (for shipping)
  weight_grams INTEGER,

  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active variants" ON product_variants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage variants" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_products ap
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ap.id = product_variants.product_id
      AND ou.user_id = auth.uid()
    )
  );

-- 3. Product Sales
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,

  -- Product info
  product_id UUID REFERENCES attraction_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,  -- Snapshot in case product deleted
  variant_name TEXT,

  -- Associated booking (optional - can be standalone sale)
  booking_id UUID REFERENCES attraction_bookings(id) ON DELETE SET NULL,
  client_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,

  -- Quantity & pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_reason TEXT,
  total_price DECIMAL(10,2) NOT NULL,

  -- Tax
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,4),

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partial_refund')),
  stripe_payment_intent_id TEXT,

  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'fulfilled', 'shipped', 'delivered', 'cancelled')),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id),

  -- For shipped items
  tracking_number TEXT,
  shipping_carrier TEXT,

  -- Staff who made the sale
  sold_by UUID REFERENCES auth.users(id),

  -- Metadata
  notes TEXT,
  sale_channel TEXT DEFAULT 'pos' CHECK (sale_channel IN ('pos', 'online', 'booking', 'phone')),

  sold_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_sales_attraction ON product_sales(attraction_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_booking ON product_sales(booking_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_client ON product_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_payment ON product_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales(sold_at DESC);

COMMENT ON TABLE product_sales IS 'Individual product sale records';

-- RLS
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own purchases" ON product_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = product_sales.client_id
      AND LOWER(cp.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Org members can manage sales" ON product_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = product_sales.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 4. Inventory Transactions (for tracking changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES attraction_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Transaction details
  quantity_change INTEGER NOT NULL,  -- Positive = add, Negative = remove
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'sale', 'return', 'adjustment', 'restock', 'transfer', 'damage', 'shrinkage'
  )),

  -- Reference
  reference_type TEXT,  -- 'product_sale', 'manual', 'booking', etc.
  reference_id UUID,

  -- Metadata
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_tx_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_variant ON inventory_transactions(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_date ON inventory_transactions(created_at DESC);

-- RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inventory transactions" ON inventory_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attraction_products ap
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ap.id = inventory_transactions.product_id
      AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attraction_products ap
      JOIN attractions a ON a.id = ap.attraction_id
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE ap.id = inventory_transactions.product_id
      AND ou.user_id = auth.uid()
    )
  );

-- 5. Product Categories (for organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_attraction ON product_categories(attraction_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);

-- RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view categories" ON product_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can manage categories" ON product_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attractions a
      JOIN organization_users ou ON ou.organization_id = a.organization_id
      WHERE a.id = product_categories.attraction_id
      AND ou.user_id = auth.uid()
    )
  );

-- 6. Function to update inventory on sale
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INTEGER;
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, (SELECT product_id FROM product_variants WHERE id = NEW.variant_id));

  IF NEW.variant_id IS NOT NULL THEN
    -- Update variant inventory
    SELECT inventory_count INTO v_current_count
    FROM product_variants WHERE id = NEW.variant_id;

    UPDATE product_variants
    SET
      inventory_count = inventory_count - NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.variant_id;

    -- Record transaction
    INSERT INTO inventory_transactions (
      product_id, variant_id, quantity_change, quantity_before, quantity_after,
      transaction_type, reference_type, reference_id, performed_by
    ) VALUES (
      v_product_id, NEW.variant_id, -NEW.quantity, v_current_count, v_current_count - NEW.quantity,
      'sale', 'product_sale', NEW.id, NEW.sold_by
    );

  ELSIF NEW.product_id IS NOT NULL THEN
    -- Update product inventory
    SELECT inventory_count INTO v_current_count
    FROM attraction_products WHERE id = NEW.product_id;

    UPDATE attraction_products
    SET
      inventory_count = inventory_count - NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.product_id
      AND track_inventory = true;

    -- Record transaction
    INSERT INTO inventory_transactions (
      product_id, variant_id, quantity_change, quantity_before, quantity_after,
      transaction_type, reference_type, reference_id, performed_by
    ) VALUES (
      NEW.product_id, NULL, -NEW.quantity, v_current_count, v_current_count - NEW.quantity,
      'sale', 'product_sale', NEW.id, NEW.sold_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_inventory_on_sale_trigger ON product_sales;
CREATE TRIGGER update_inventory_on_sale_trigger
  AFTER INSERT ON product_sales
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION update_inventory_on_sale();

-- 7. Function to update client stats on product purchase
-- ============================================================================
CREATE OR REPLACE FUNCTION update_client_stats_on_product_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.payment_status = 'paid' THEN
    UPDATE client_attraction_stats
    SET
      total_spent = total_spent + NEW.total_price,
      updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND attraction_id = NEW.attraction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_client_stats_product_sale_trigger ON product_sales;
CREATE TRIGGER update_client_stats_product_sale_trigger
  AFTER INSERT ON product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_client_stats_on_product_sale();

-- 8. Function to check low stock and create alert
-- ============================================================================
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product is now below threshold
  IF NEW.inventory_count <= (
    SELECT low_stock_threshold FROM attraction_products WHERE id = NEW.id
  ) AND NEW.inventory_count >= 0 THEN
    -- Could trigger a notification here
    -- For now, just log it (in practice, you'd send to a notifications table)
    RAISE NOTICE 'Low stock alert: Product % is at % units', NEW.name, NEW.inventory_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_low_stock_trigger ON attraction_products;
CREATE TRIGGER check_low_stock_trigger
  AFTER UPDATE OF inventory_count ON attraction_products
  FOR EACH ROW
  WHEN (NEW.track_inventory = true AND OLD.inventory_count > NEW.inventory_count)
  EXECUTE FUNCTION check_low_stock();

-- 9. View for product sales summary
-- ============================================================================
CREATE OR REPLACE VIEW product_sales_summary AS
SELECT
  ap.attraction_id,
  ap.id as product_id,
  ap.name as product_name,
  ap.category,
  ap.price as current_price,
  ap.cost,
  ap.inventory_count,
  COUNT(ps.id) as total_sales,
  COALESCE(SUM(ps.quantity), 0) as units_sold,
  COALESCE(SUM(ps.total_price), 0) as revenue,
  COALESCE(SUM(ps.quantity * ap.cost), 0) as total_cost,
  COALESCE(SUM(ps.total_price) - SUM(ps.quantity * COALESCE(ap.cost, 0)), 0) as profit,
  MAX(ps.sold_at) as last_sold_at
FROM attraction_products ap
LEFT JOIN product_sales ps ON ps.product_id = ap.id AND ps.payment_status = 'paid'
GROUP BY ap.id;

-- 10. Add products to booking add-ons
-- ============================================================================
ALTER TABLE booking_add_ons
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES attraction_products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
