import { useState, useEffect } from "react";

export const useAdminAuth = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const authStatus = sessionStorage.getItem("ticketflo_admin_auth");
    const user = sessionStorage.getItem("ticketflo_admin_user");
    
    setIsAdminAuthenticated(authStatus === "true");
    setAdminUser(user);
    setLoading(false);
  };

  const logout = () => {
    sessionStorage.removeItem("ticketflo_admin_auth");
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