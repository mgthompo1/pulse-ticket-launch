import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: string;
}

export const ProtectedRoute = ({ children, fallback = "/auth" }: ProtectedRouteProps) => {
  console.log("=== ProtectedRoute rendering ===");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log("=== ProtectedRoute state ===", { user: !!user, loading });

  useEffect(() => {
    console.log("=== ProtectedRoute useEffect ===", { user: !!user, loading });
    if (!loading && !user) {
      console.log("=== Redirecting to auth ===");
      navigate(fallback);
    }
  }, [user, loading, navigate, fallback]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};