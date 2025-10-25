-- Migration: Create Groups System (Fixed for Supabase)
-- Description: Enables multi-tenant group ticketing where organizations can allocate
-- ticket inventory to groups (e.g., youth groups) who then sell to their members

-- ============================================================================
-- 1. Add groups_enabled feature flag to organizations
-- ============================================================================
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS groups_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN organizations.groups_enabled IS
'Feature flag to enable groups functionality for this organization';

-- ============================================================================
-- 2. Groups table - represents youth groups, churches, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  billing_address TEXT,
  url_slug TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT groups_org_slug_unique UNIQUE (organization_id, url_slug),
  CONSTRAINT groups_url_slug_format CHECK (url_slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_groups_organization ON groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_url_slug ON groups(url_slug);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);

COMMENT ON TABLE groups IS
'Groups that can sell allocated ticket inventory (e.g., youth groups, churches)';

-- ============================================================================
-- 3. Group Coordinators - users who manage groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_coordinators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator',
  can_apply_discounts BOOLEAN DEFAULT TRUE,
  can_view_reports BOOLEAN DEFAULT TRUE,
  can_manage_coordinators BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT group_coordinators_unique UNIQUE (group_id, user_id),
  CONSTRAINT group_coordinators_role_check CHECK (role IN ('coordinator', 'viewer', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_group_coordinators_group ON group_coordinators(group_id);
CREATE INDEX IF NOT EXISTS idx_group_coordinators_user ON group_coordinators(user_id);

COMMENT ON TABLE group_coordinators IS
'Users who can manage group ticket sales and view reports';

-- ============================================================================
-- 4. Group Ticket Allocations - inventory allocated to groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_ticket_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  allocated_quantity INT NOT NULL CHECK (allocated_quantity >= 0),
  used_quantity INT NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  full_price DECIMAL(10,2) NOT NULL CHECK (full_price >= 0),
  minimum_price DECIMAL(10,2) CHECK (minimum_price >= 0),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT allocation_quantity_check CHECK (used_quantity + reserved_quantity <= allocated_quantity),
  CONSTRAINT allocation_min_price_check CHECK (minimum_price IS NULL OR minimum_price <= full_price)
);

CREATE INDEX IF NOT EXISTS idx_allocations_group ON group_ticket_allocations(group_id);
CREATE INDEX IF NOT EXISTS idx_allocations_event ON group_ticket_allocations(event_id);
CREATE INDEX IF NOT EXISTS idx_allocations_ticket_type ON group_ticket_allocations(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_allocations_active ON group_ticket_allocations(is_active);

COMMENT ON TABLE group_ticket_allocations IS
'Ticket inventory allocated from event to specific groups';

-- ============================================================================
-- 5. Group Ticket Sales - tracks individual ticket sales by groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_ticket_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES group_ticket_allocations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  full_price DECIMAL(10,2) NOT NULL,
  paid_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) GENERATED ALWAYS AS (full_price - paid_price) STORED,
  discount_reason TEXT,
  discount_code TEXT,
  applied_by UUID,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT group_sales_unique UNIQUE (ticket_id),
  CONSTRAINT group_sales_payment_status_check CHECK (
    payment_status IN ('pending', 'completed', 'refunded', 'failed')
  ),
  CONSTRAINT group_sales_price_check CHECK (paid_price >= 0 AND paid_price <= full_price)
);

CREATE INDEX IF NOT EXISTS idx_group_sales_group ON group_ticket_sales(group_id);
CREATE INDEX IF NOT EXISTS idx_group_sales_allocation ON group_ticket_sales(allocation_id);
CREATE INDEX IF NOT EXISTS idx_group_sales_ticket ON group_ticket_sales(ticket_id);
CREATE INDEX IF NOT EXISTS idx_group_sales_payment_status ON group_ticket_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_group_sales_created_at ON group_ticket_sales(created_at);

COMMENT ON TABLE group_ticket_sales IS
'Individual ticket sales made through groups with discount tracking';

-- ============================================================================
-- 6. Group Invoices - billing for discount differences
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  billing_period_start DATE,
  billing_period_end DATE,
  total_tickets_sold INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_discounts_given DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT invoice_status_check CHECK (
    status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')
  ),
  CONSTRAINT invoice_amounts_check CHECK (
    amount_paid >= 0 AND amount_paid <= amount_owed
  )
);

CREATE INDEX IF NOT EXISTS idx_invoices_group ON group_invoices(group_id);
CREATE INDEX IF NOT EXISTS idx_invoices_event ON group_invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON group_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON group_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON group_invoices(invoice_number);

COMMENT ON TABLE group_invoices IS
'Invoices for groups to pay organization for discounted tickets';

-- ============================================================================
-- 7. Group Invoice Line Items
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES group_invoices(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES group_ticket_sales(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON group_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sale ON group_invoice_line_items(sale_id);

COMMENT ON TABLE group_invoice_line_items IS
'Line items for group invoices with sale references';

-- ============================================================================
-- 8. Group Activity Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_activity_group ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_user ON group_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_created_at ON group_activity_log(created_at);

COMMENT ON TABLE group_activity_log IS
'Audit log for group activities (sales, discounts applied, etc.)';

-- ============================================================================
-- 9. Functions
-- ============================================================================

-- Function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INT)), 0) + 1
  INTO next_num
  FROM group_invoices
  WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update allocation used_quantity when tickets are sold
CREATE OR REPLACE FUNCTION update_allocation_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
    UPDATE group_ticket_allocations
    SET used_quantity = used_quantity + 1,
        updated_at = NOW()
    WHERE id = NEW.allocation_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.payment_status != 'completed' AND NEW.payment_status = 'completed' THEN
    UPDATE group_ticket_allocations
    SET used_quantity = used_quantity + 1,
        updated_at = NOW()
    WHERE id = NEW.allocation_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' AND NEW.payment_status = 'refunded' THEN
    UPDATE group_ticket_allocations
    SET used_quantity = used_quantity - 1,
        updated_at = NOW()
    WHERE id = NEW.allocation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update allocation quantities
DROP TRIGGER IF EXISTS trigger_update_allocation_quantity ON group_ticket_sales;
CREATE TRIGGER trigger_update_allocation_quantity
AFTER INSERT OR UPDATE ON group_ticket_sales
FOR EACH ROW
EXECUTE FUNCTION update_allocation_used_quantity();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allocations_updated_at ON group_ticket_allocations;
CREATE TRIGGER update_allocations_updated_at
BEFORE UPDATE ON group_ticket_allocations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON group_invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON group_invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_ticket_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity_log ENABLE ROW LEVEL SECURITY;

-- Groups policies
DROP POLICY IF EXISTS "Organizations can manage their groups" ON groups;
CREATE POLICY "Organizations can manage their groups"
ON groups FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view active groups" ON groups;
CREATE POLICY "Public can view active groups"
ON groups FOR SELECT
USING (is_active = TRUE);

-- Group coordinators policies
DROP POLICY IF EXISTS "Organizations can manage group coordinators" ON group_coordinators;
CREATE POLICY "Organizations can manage group coordinators"
ON group_coordinators FOR ALL
USING (
  group_id IN (
    SELECT id FROM groups
    WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Coordinators can view themselves" ON group_coordinators;
CREATE POLICY "Coordinators can view themselves"
ON group_coordinators FOR SELECT
USING (user_id = auth.uid());

-- Allocations policies
DROP POLICY IF EXISTS "Organizations can manage allocations" ON group_ticket_allocations;
CREATE POLICY "Organizations can manage allocations"
ON group_ticket_allocations FOR ALL
USING (
  group_id IN (
    SELECT id FROM groups
    WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Group coordinators can view their allocations" ON group_ticket_allocations;
CREATE POLICY "Group coordinators can view their allocations"
ON group_ticket_allocations FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_coordinators
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view active allocations" ON group_ticket_allocations;
CREATE POLICY "Public can view active allocations"
ON group_ticket_allocations FOR SELECT
USING (is_active = TRUE);

-- Group sales policies
DROP POLICY IF EXISTS "Organizations can view group sales" ON group_ticket_sales;
CREATE POLICY "Organizations can view group sales"
ON group_ticket_sales FOR SELECT
USING (
  group_id IN (
    SELECT id FROM groups
    WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Group coordinators can view their sales" ON group_ticket_sales;
CREATE POLICY "Group coordinators can view their sales"
ON group_ticket_sales FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_coordinators
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can create sales" ON group_ticket_sales;
CREATE POLICY "Service role can create sales"
ON group_ticket_sales FOR INSERT
WITH CHECK (true);

-- Invoice policies
DROP POLICY IF EXISTS "Organizations can manage invoices" ON group_invoices;
CREATE POLICY "Organizations can manage invoices"
ON group_invoices FOR ALL
USING (
  group_id IN (
    SELECT id FROM groups
    WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Group coordinators can view their invoices" ON group_invoices;
CREATE POLICY "Group coordinators can view their invoices"
ON group_invoices FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_coordinators
    WHERE user_id = auth.uid()
  )
);

-- Invoice line items policies
DROP POLICY IF EXISTS "Users can view invoice items for accessible invoices" ON group_invoice_line_items;
CREATE POLICY "Users can view invoice items for accessible invoices"
ON group_invoice_line_items FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM group_invoices
    WHERE group_id IN (
      SELECT id FROM groups
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE user_id = auth.uid()
      )
    )
    OR group_id IN (
      SELECT group_id FROM group_coordinators
      WHERE user_id = auth.uid()
    )
  )
);

-- Activity log policies
DROP POLICY IF EXISTS "Organizations can view group activity" ON group_activity_log;
CREATE POLICY "Organizations can view group activity"
ON group_activity_log FOR SELECT
USING (
  group_id IN (
    SELECT id FROM groups
    WHERE organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Service role can create activity" ON group_activity_log;
CREATE POLICY "Service role can create activity"
ON group_activity_log FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 11. Grants
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_coordinators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_ticket_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_ticket_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_invoice_line_items TO authenticated;
GRANT SELECT, INSERT ON group_activity_log TO authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
