-- Create audit_logs table for tracking administrative actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users(id),
  action TEXT NOT NULL,
  details JSONB,
  actor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Create code_deployments table for tracking git commits and deployments
CREATE TABLE IF NOT EXISTS public.code_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_hash TEXT NOT NULL,
  commit_message TEXT,
  author_name TEXT,
  author_email TEXT,
  branch TEXT DEFAULT 'main',
  files_changed INTEGER DEFAULT 0,
  insertions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployed_by UUID REFERENCES public.admin_users(id),
  environment TEXT DEFAULT 'production',
  status TEXT DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for code_deployments
CREATE INDEX IF NOT EXISTS idx_code_deployments_deployed_at ON public.code_deployments(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_deployments_commit_hash ON public.code_deployments(commit_hash);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_deployments ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs (only service role can insert, admins can read)
CREATE POLICY "Service role can manage audit_logs" ON public.audit_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage code_deployments" ON public.code_deployments
  FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.code_deployments TO service_role;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.code_deployments TO authenticated;
