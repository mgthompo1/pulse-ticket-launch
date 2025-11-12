import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Organization {
  id: string;
  name: string;
  user_id: string;
  system_type?: string;
  groups_enabled?: boolean;
  crm_enabled?: boolean;
  issuing_enabled?: boolean;
  logo_url?: string | null;
}

interface OrganizationWithRole {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isOwner: boolean;
  system_type?: string;
  groups_enabled?: boolean;
  crm_enabled?: boolean;
  issuing_enabled?: boolean;
  logo_url?: string | null;
}

const SELECTED_ORG_KEY = 'ticketflo_selected_organization';

export const useOrganizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load all organizations for the current user
  const loadOrganizations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const allOrgs: OrganizationWithRole[] = [];

    try {
      // 1. Get organizations where user is the owner
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', user.id);

      if (ownedError) {
        console.error('Error loading owned organizations:', ownedError);
      }

      if (ownedOrgs && ownedOrgs.length > 0) {
        ownedOrgs.forEach((org) => {
          allOrgs.push({
            id: org.id,
            name: org.name,
            role: 'owner',
            isOwner: true,
            system_type: org.system_type,
            groups_enabled: org.groups_enabled || false,
            crm_enabled: org.crm_enabled || false,
            issuing_enabled: org.issuing_enabled || false,
            logo_url: org.logo_url,
          });
        });
      }

      // 2. Get organizations where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('organization_users')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            user_id,
            system_type,
            groups_enabled,
            crm_enabled,
            issuing_enabled,
            logo_url
          )
        `)
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error loading organization memberships:', memberError);
      }

      if (memberships && memberships.length > 0) {
        memberships.forEach((membership: { role: string; organizations: Organization }) => {
          if (membership.organizations) {
            const org = membership.organizations;
            // Don't duplicate if user is already listed as owner
            if (!allOrgs.find((o) => o.id === org.id)) {
              allOrgs.push({
                id: org.id,
                name: org.name,
                role: membership.role,
                isOwner: org.user_id === user.id,
                system_type: org.system_type,
                groups_enabled: org.groups_enabled || false,
                crm_enabled: org.crm_enabled || false,
                issuing_enabled: org.issuing_enabled || false,
                logo_url: org.logo_url,
              });
            }
          }
        });
      }

      console.log('📊 Total organizations found:', allOrgs.length);
      setOrganizations(allOrgs);

      // If no organizations found, show onboarding
      if (allOrgs.length === 0) {
        setShowOnboarding(true);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }

      // Select organization based on:
      // 1. Previously selected organization (from localStorage)
      // 2. First organization in the list
      const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
      let selectedOrg: OrganizationWithRole | null = null;

      if (savedOrgId) {
        selectedOrg = allOrgs.find((org) => org.id === savedOrgId) || null;
      }

      if (!selectedOrg) {
        selectedOrg = allOrgs[0];
      }

      setCurrentOrganization(selectedOrg);
      console.log('✅ Selected organization:', selectedOrg.name, '(Role:', selectedOrg.role + ')');
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Change current organization
  const switchOrganization = useCallback((org: OrganizationWithRole) => {
    setCurrentOrganization(org);
    localStorage.setItem(SELECTED_ORG_KEY, org.id);
    console.log('🔄 Switched to organization:', org.name, '(Role:', org.role + ')');
  }, []);

  // Clear organization selection (on sign out)
  const clearOrganization = useCallback(() => {
    setCurrentOrganization(null);
    setOrganizations([]);
    localStorage.removeItem(SELECTED_ORG_KEY);
  }, []);

  // Load organizations when user changes
  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when user ID changes (primitive), not user object reference

  return {
    organizations,
    currentOrganization,
    loading,
    showOnboarding,
    switchOrganization,
    clearOrganization,
    reloadOrganizations: loadOrganizations,
  };
};
