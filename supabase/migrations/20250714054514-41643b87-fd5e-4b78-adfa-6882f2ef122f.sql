-- Create table to store Xero integration settings
CREATE TABLE public.xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL, -- Xero tenant/organization ID
  access_token TEXT, -- Encrypted access token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  sync_settings JSONB DEFAULT '{}', -- Settings for what to sync
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their organization's Xero connections" ON public.xero_connections
  FOR ALL
  USING (organization_id IN (
    SELECT organizations.id FROM public.organizations WHERE organizations.user_id = auth.uid()
  ));

-- Create table to track Xero sync operations
CREATE TABLE public.xero_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xero_connection_id UUID NOT NULL REFERENCES public.xero_connections(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'invoice_create', 'customer_sync', 'product_sync', etc.
  entity_type TEXT, -- 'order', 'customer', 'merchandise', etc.
  entity_id TEXT, -- Local entity ID
  xero_entity_id TEXT, -- Xero entity ID
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.xero_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync logs
CREATE POLICY "Users can view their organization's sync logs" ON public.xero_sync_logs
  FOR SELECT
  USING (xero_connection_id IN (
    SELECT xc.id FROM public.xero_connections xc
    JOIN public.organizations o ON xc.organization_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Create updated_at trigger
CREATE TRIGGER update_xero_connections_updated_at
  BEFORE UPDATE ON public.xero_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();