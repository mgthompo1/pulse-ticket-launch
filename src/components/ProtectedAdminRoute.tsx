import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: ReactNode;
  fallback?: string;
}

export const ProtectedAdminRoute = ({ children, fallback = "/secure-admin-auth" }: ProtectedAdminRouteProps) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdminAuthenticated) {
      navigate(fallback);
    }
  }, [isAdminAuthenticated, loading, navigate, fallback]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return null;
  }

  return <>{children}</>;
};