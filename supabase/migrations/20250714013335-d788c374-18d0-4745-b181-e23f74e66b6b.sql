-- Create billing and usage tracking tables for platform fees

-- Create billing_customers table to track Stripe customer info for organizations
CREATE TABLE public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  payment_method_id TEXT,
  billing_email TEXT NOT NULL,
  billing_status TEXT NOT NULL DEFAULT 'setup_required', -- setup_required, active, past_due, cancelled
  subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_records table to track transaction fees
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  transaction_amount NUMERIC NOT NULL,
  platform_fee_percentage NUMERIC NOT NULL DEFAULT 1.00, -- 1.00%
  platform_fee_fixed NUMERIC NOT NULL DEFAULT 0.50, -- $0.50
  total_platform_fee NUMERIC NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  billed BOOLEAN NOT NULL DEFAULT false,
  invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing_invoices table to track monthly invoices
CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_transaction_volume NUMERIC NOT NULL DEFAULT 0,
  total_platform_fees NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, voided
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for billing_customers
CREATE POLICY "Users can manage their organization's billing" 
ON public.billing_customers 
FOR ALL 
USING (organization_id IN (
  SELECT id FROM organizations WHERE user_id = auth.uid()
));

-- Create policies for usage_records
CREATE POLICY "Users can view their organization's usage" 
ON public.usage_records 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE user_id = auth.uid()
));

CREATE POLICY "System can create usage records" 
ON public.usage_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update usage records" 
ON public.usage_records 
FOR UPDATE 
USING (true);

-- Create policies for billing_invoices
CREATE POLICY "Users can view their organization's invoices" 
ON public.billing_invoices 
FOR SELECT 
USING (organization_id IN (
  SELECT id FROM organizations WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage invoices" 
ON public.billing_invoices 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_billing_customers_org_id ON public.billing_customers(organization_id);
CREATE INDEX idx_billing_customers_stripe_id ON public.billing_customers(stripe_customer_id);
CREATE INDEX idx_usage_records_org_id ON public.usage_records(organization_id);
CREATE INDEX idx_usage_records_billing_period ON public.usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_billed ON public.usage_records(billed);
CREATE INDEX idx_billing_invoices_org_id ON public.billing_invoices(organization_id);
CREATE INDEX idx_billing_invoices_status ON public.billing_invoices(status);

-- Create function to calculate platform fees
CREATE OR REPLACE FUNCTION calculate_platform_fee(transaction_amount NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  -- 1.00% of transaction + $0.50 fixed fee
  RETURN (transaction_amount * 0.01) + 0.50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

-- Add billing_required flag to organizations table
ALTER TABLE public.organizations 
ADD COLUMN billing_setup_required BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN billing_setup_completed BOOLEAN NOT NULL DEFAULT false;