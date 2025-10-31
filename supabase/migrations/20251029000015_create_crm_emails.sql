-- Create CRM Emails table for tracking direct customer communications
-- This allows organizers to send emails directly to customers from the CRM section

CREATE TABLE IF NOT EXISTS crm_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Email details
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,

    -- Sender info
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Recipient info (denormalized for history)
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,

    -- Email status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),

    -- External tracking (Resend)
    resend_email_id TEXT,
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_crm_emails_organization_id ON crm_emails(organization_id);
CREATE INDEX idx_crm_emails_contact_id ON crm_emails(contact_id);
CREATE INDEX idx_crm_emails_order_id ON crm_emails(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_crm_emails_status ON crm_emails(status);
CREATE INDEX idx_crm_emails_sent_at ON crm_emails(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_crm_emails_created_at ON crm_emails(created_at);

-- RLS Policies
ALTER TABLE crm_emails ENABLE ROW LEVEL SECURITY;

-- Organization members can view emails for their organization's contacts
CREATE POLICY "Organization members can view crm emails"
    ON crm_emails
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Organization members can insert emails for their organization's contacts
CREATE POLICY "Organization members can send crm emails"
    ON crm_emails
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Organization members can update their own emails (for status tracking)
CREATE POLICY "Organization members can update crm emails"
    ON crm_emails
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_crm_emails_updated_at
    BEFORE UPDATE ON crm_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_emails_updated_at();

-- Add comment
COMMENT ON TABLE crm_emails IS 'Tracks direct emails sent from CRM to individual customers';
