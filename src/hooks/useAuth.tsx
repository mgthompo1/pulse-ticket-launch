import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session first
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          // Clear invalid session if refresh token is expired/invalid (400 error)
          if (error.message?.includes('refresh_token') || error.status === 400) {
            console.log('Clearing invalid session due to expired refresh token');
            await supabase.auth.signOut();
          }
        }

        if (isMounted) {
          if (typeof window !== 'undefined') {
            console.log("=== Initial session loaded ===", !!session?.user);
          }
          setSession(error ? null : session);
          setUser(error ? null : session?.user ?? null);
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Also handle unexpected errors by clearing potentially corrupted state
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore signOut errors during cleanup
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only process auth changes after initial load to prevent flickering
        if (!initialized && event === 'INITIAL_SESSION') {
          return; // Skip INITIAL_SESSION as we handle it above
        }
        
        if (typeof window !== 'undefined') {
          console.log("=== Auth state changed ===", event, !!session?.user);
        }
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when initialized changes

  const signOut = async () => {
    // Clear organization selection
    localStorage.removeItem('ticketflo_selected_organization');

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};