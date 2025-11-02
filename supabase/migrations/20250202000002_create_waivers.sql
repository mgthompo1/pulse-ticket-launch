-- Create waiver_templates table for organization waiver configuration
CREATE TABLE IF NOT EXISTS waiver_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Liability Waiver',
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    require_signature BOOLEAN NOT NULL DEFAULT true,
    require_date_of_birth BOOLEAN NOT NULL DEFAULT false,
    require_emergency_contact BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create waiver_signatures table for storing signed waivers
CREATE TABLE IF NOT EXISTS waiver_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waiver_template_id UUID NOT NULL REFERENCES waiver_templates(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Signer information
    signer_name TEXT NOT NULL,
    signer_email TEXT,
    date_of_birth DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,

    -- Signature data
    signature_data TEXT NOT NULL, -- Base64 encoded signature image or "digital_acceptance"
    signature_type TEXT NOT NULL DEFAULT 'digital_acceptance', -- 'digital_acceptance', 'signature_pad', 'typed'
    ip_address TEXT,
    user_agent TEXT,

    -- Metadata
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    waiver_content_snapshot TEXT NOT NULL, -- Store snapshot of waiver content at time of signing

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one signature per ticket
    UNIQUE(ticket_id, waiver_template_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_waiver_templates_organization_id ON waiver_templates(organization_id);
CREATE INDEX idx_waiver_templates_event_id ON waiver_templates(event_id);
CREATE INDEX idx_waiver_templates_active ON waiver_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_waiver_signatures_waiver_template_id ON waiver_signatures(waiver_template_id);
CREATE INDEX idx_waiver_signatures_ticket_id ON waiver_signatures(ticket_id);
CREATE INDEX idx_waiver_signatures_event_id ON waiver_signatures(event_id);
CREATE INDEX idx_waiver_signatures_organization_id ON waiver_signatures(organization_id);
CREATE INDEX idx_waiver_signatures_signed_at ON waiver_signatures(signed_at);

-- Enable RLS
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waiver_templates

-- Organization members and owners can view waiver templates
CREATE POLICY "Organization members can view waiver templates"
    ON waiver_templates
    FOR SELECT
    USING (
        organization_id IN (
            -- Check if user is a member
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            -- Check if user is the owner
            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Organization members and owners can create waiver templates
CREATE POLICY "Organization members can create waiver templates"
    ON waiver_templates
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Organization members and owners can update waiver templates
CREATE POLICY "Organization members can update waiver templates"
    ON waiver_templates
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Organization members and owners can delete waiver templates
CREATE POLICY "Organization members can delete waiver templates"
    ON waiver_templates
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for waiver_signatures

-- Organization members and owners can view waiver signatures
CREATE POLICY "Organization members can view waiver signatures"
    ON waiver_signatures
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Anyone (attendees via check-in) can create waiver signatures
-- This is intentionally open to allow check-in process to work without auth
CREATE POLICY "Anyone can create waiver signatures"
    ON waiver_signatures
    FOR INSERT
    WITH CHECK (true);

-- Organization members and owners can update waiver signatures (for corrections)
CREATE POLICY "Organization members can update waiver signatures"
    ON waiver_signatures
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Add updated_at trigger for waiver_templates
CREATE OR REPLACE FUNCTION update_waiver_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waiver_templates_updated_at
    BEFORE UPDATE ON waiver_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_waiver_templates_updated_at();
