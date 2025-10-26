-- Enable pgsodium extension for encryption (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Add CRM toggle to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS crm_enabled BOOLEAN DEFAULT FALSE;

-- Create contacts table for unified customer records
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Encrypted PII fields using pgsodium
  email TEXT NOT NULL, -- Will be encrypted at application layer for search capability
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,

  -- CRM specific fields
  tags TEXT[], -- Array of tags like 'VIP', 'Major Donor', 'Season Subscriber'
  notes TEXT,

  -- Aggregated stats (updated via triggers or computed)
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  total_donations DECIMAL(10, 2) DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  last_event_date TIMESTAMP WITH TIME ZONE,

  -- External CRM integration fields (for future Salesforce, etc.)
  external_crm_id TEXT,
  external_crm_type TEXT, -- 'salesforce', 'hubspot', etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one contact per email per organization
  UNIQUE(organization_id, email)
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Optional: if donation was part of an order

  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'NZD',

  -- Donation metadata
  campaign_name TEXT, -- For future campaign tracking
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT, -- 'monthly', 'yearly', etc.

  -- Payment tracking
  stripe_payment_id TEXT,
  windcave_payment_id TEXT,
  payment_status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'refunded'

  -- Receipt tracking
  receipt_sent BOOLEAN DEFAULT FALSE,
  receipt_sent_at TIMESTAMP WITH TIME ZONE,
  tax_receipt_number TEXT,

  donation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact_events junction table for attendance tracking
CREATE TABLE IF NOT EXISTS contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Attendance tracking
  attended BOOLEAN DEFAULT FALSE,
  attendance_marked_at TIMESTAMP WITH TIME ZONE,

  -- Ticket details
  ticket_type TEXT,
  seat_info TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate entries
  UNIQUE(contact_id, event_id, order_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_donations_contact_id ON donations(contact_id);
CREATE INDEX IF NOT EXISTS idx_donations_organization_id ON donations(organization_id);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON donations(order_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_contact_id ON contact_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_event_id ON contact_events(event_id);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts (require CRM access permission)
CREATE POLICY "Users with CRM access can view contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update contacts"
  ON contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Only owners and admins can delete contacts"
  ON contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = contacts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for donations (require CRM access)
CREATE POLICY "Users with CRM access can view donations"
  ON donations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert donations"
  ON donations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update donations"
  ON donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_users om
      WHERE om.organization_id = donations.organization_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

-- RLS Policies for contact_events (require CRM access)
CREATE POLICY "Users with CRM access can view contact events"
  ON contact_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
          OR 'view_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can insert contact events"
  ON contact_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

CREATE POLICY "Users with manage CRM permission can update contact events"
  ON contact_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN organization_users om ON om.organization_id = c.organization_id
      WHERE c.id = contact_events.contact_id
        AND om.user_id = auth.uid()
        AND (
          om.role IN ('owner', 'admin')
          OR 'manage_crm' = ANY(om.permissions)
        )
    )
  );

-- Create function to update contact stats
CREATE OR REPLACE FUNCTION update_contact_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update contact statistics when orders or donations change
  UPDATE contacts
  SET
    total_orders = (
      SELECT COUNT(*) FROM orders
      WHERE customer_email = contacts.email
      AND event_id IN (
        SELECT id FROM events WHERE organization_id = contacts.organization_id
      )
    ),
    total_spent = (
      SELECT COALESCE(SUM(total_amount), 0) FROM orders
      WHERE customer_email = contacts.email
      AND event_id IN (
        SELECT id FROM events WHERE organization_id = contacts.organization_id
      )
      AND status = 'completed'
    ),
    total_donations = (
      SELECT COALESCE(SUM(amount), 0) FROM donations
      WHERE contact_id = contacts.id
      AND payment_status = 'completed'
    ),
    events_attended = (
      SELECT COUNT(DISTINCT event_id) FROM contact_events
      WHERE contact_id = contacts.id
    ),
    last_order_date = (
      SELECT MAX(created_at) FROM orders
      WHERE customer_email = contacts.email
      AND event_id IN (
        SELECT id FROM events WHERE organization_id = contacts.organization_id
      )
    ),
    updated_at = NOW()
  WHERE id = NEW.contact_id OR email = NEW.customer_email;

  -- Update lifetime value
  UPDATE contacts
  SET lifetime_value = total_spent + total_donations
  WHERE id = NEW.contact_id OR email = NEW.customer_email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update contact stats
CREATE TRIGGER update_contact_stats_on_donation
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_stats();

-- Comment: Trigger for orders will be added when we integrate contact creation into checkout

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
