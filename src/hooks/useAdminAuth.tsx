import { useState, useEffect } from "react";

export const useAdminAuth = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = sessionStorage.getItem("ticketflo_admin_token");
    const user = sessionStorage.getItem("ticketflo_admin_user");
    
    if (!token) {
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      // Validate the session token with the backend
      const response = await fetch(`https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/validate-admin-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      
      if (result.valid) {
        setIsAdminAuthenticated(true);
        setAdminUser(user);
      } else {
        // Token is invalid, clear auth data
        sessionStorage.removeItem("ticketflo_admin_token");
        sessionStorage.removeItem("ticketflo_admin_user");
        setIsAdminAuthenticated(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      setIsAdminAuthenticated(false);
      setAdminUser(null);
    }
    
    setLoading(false);
  };

  const logout = async () => {
    const token = sessionStorage.getItem("ticketflo_admin_token");
    
    if (token) {
      try {
        // Invalidate session on server
        await fetch(`https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/admin-logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    sessionStorage.removeItem("ticketflo_admin_token");
    sessionStorage.removeItem("ticketflo_admin_user");
    setIsAdminAuthenticated(false);
    setAdminUser(null);
  };

  return {
    isAdminAuthenticated,
    adminUser,
    loading,
    logout,
    checkAuthStatus
  };
};