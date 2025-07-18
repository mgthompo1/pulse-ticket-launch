-- Create invoices table for user-created invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Company Information
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_city TEXT,
  company_postal_code TEXT,
  company_phone TEXT,
  company_email TEXT,
  
  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_address TEXT,
  client_city TEXT,
  client_postal_code TEXT,
  client_phone TEXT,
  
  -- Event Information
  event_name TEXT,
  event_date DATE,
  event_venue TEXT,
  
  -- Invoice Items (stored as JSON)
  items JSONB NOT NULL DEFAULT '[]',
  
  -- Totals
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment Terms
  payment_terms TEXT,
  notes TEXT,
  
  -- Payment Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  payment_url TEXT,
  windcave_session_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can manage their organization's invoices" 
ON public.invoices 
FOR ALL 
USING (organization_id IN (
  SELECT id FROM organizations WHERE user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();