import { useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: string;
}

export const ProtectedRoute = ({ children, fallback = "/auth" }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Memoize the redirect function to prevent unnecessary re-renders
  const redirectToAuth = useCallback(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      navigate(fallback);
    }
  }, [navigate, fallback]);

  useEffect(() => {
    if (!loading && !user) {
      redirectToAuth();
    } else if (user) {
      // Reset redirect flag when user is authenticated
      hasRedirected.current = false;
    }
  }, [user, loading, redirectToAuth]);

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