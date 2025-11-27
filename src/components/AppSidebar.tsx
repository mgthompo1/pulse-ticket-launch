import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Calendar, Users, Settings, BarChart3, Mail, CreditCard, TrendingUp, Link, Shield, MapPin, UsersRound, ChevronDown, UserCog, DollarSign } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

interface Event {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedEvent: Event | null;
}

const getSidebarItems = (systemType: string, groupsEnabled: boolean, crmEnabled: boolean, issuingEnabled: boolean) => {
  const items = [
    { id: "overview", title: "Overview", icon: BarChart3 },
    {
      id: "events",
      title: systemType === "ATTRACTIONS" ? "Attractions" : "Events",
      icon: systemType === "ATTRACTIONS" ? MapPin : Calendar
    },
    {
      id: "event-details",
      title: systemType === "ATTRACTIONS" ? "Attraction Details" : "Event Details",
      icon: Users,
      requiresEvent: true
    },
    { id: "analytics", title: "Analytics", icon: TrendingUp },
    { id: "payments", title: "Payments", icon: CreditCard },
    { id: "marketing", title: "Marketing", icon: Mail },
    { id: "billing", title: "Billing", icon: CreditCard },
    { id: "integrations", title: "Apps", icon: Link },
    { id: "users", title: "Team", icon: Users },
  ];

  // Conditionally add CRM menu item if enabled
  if (crmEnabled) {
    items.push({ id: "customers", title: "Customers", icon: UserCog });
  }

  // Conditionally add Groups menu item if enabled
  if (groupsEnabled) {
    items.push({ id: "groups", title: "Groups", icon: UsersRound });
  }

  // Conditionally add Issuing menu item if enabled
  if (issuingEnabled) {
    items.push({ id: "issuing", title: "Issuing", icon: DollarSign });
  }

  // Add remaining items
  items.push(
    { id: "support", title: "Support", icon: Mail },
    { id: "security", title: "Security", icon: Shield },
    { id: "settings", title: "Settings", icon: Settings }
  );

  return items;
};

export function AppSidebar({ activeTab, setActiveTab, selectedEvent }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const { organizations, currentOrganization, switchOrganization } = useOrganizations();
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [systemType, setSystemType] = useState<string>("EVENTS");
  const [groupsEnabled, setGroupsEnabled] = useState<boolean>(false);
  const [crmEnabled, setCrmEnabled] = useState<boolean>(false);
  const [issuingEnabled, setIssuingEnabled] = useState<boolean>(false);

  useEffect(() => {
    const loadOrganization = async () => {
      if (!user) return;

      try {
        // First, try to find organization where user is the owner
        const { data: orgData, error } = await supabase
          .from("organizations")
          .select("logo_url, name, system_type, groups_enabled, crm_enabled, issuing_enabled")
          .eq("user_id", user.id)
          .single();

        let organizationData = orgData;

        // If no owned organization found, check if user is a member of any organization
        if (error && error.code === 'PGRST116') {
          console.log("No owned organization found, checking memberships...");

          const { data: membershipData, error: membershipError } = await supabase
            .from("organization_users")
            .select(`
              organization_id,
              role,
              organizations (
                logo_url,
                name,
                system_type,
                groups_enabled,
                crm_enabled,
                issuing_enabled
              )
            `)
            .eq("user_id", user.id)
            .limit(1)
            .single();

          if (membershipError) {
            console.error("Error loading organization membership:", membershipError);
            return;
          }

          if (membershipData?.organizations) {
            organizationData = membershipData.organizations as typeof orgData;
            console.log("Found organization via membership:", organizationData);
          }
        } else if (error) {
          console.error("Error loading organization:", error);
          return;
        }

        if (organizationData) {
          setOrganizationLogo(organizationData.logo_url);
          setOrganizationName(organizationData.name || "");
          setSystemType(organizationData.system_type || "EVENTS");
          setGroupsEnabled(organizationData.groups_enabled || false);
          setCrmEnabled(organizationData.crm_enabled || false);
          setIssuingEnabled(organizationData.issuing_enabled || false);
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      }
    };

    loadOrganization();
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      className="border border-border w-64 flex-shrink-0 bg-background !top-[80px] !h-[calc(100vh-92px)] !rounded-2xl !left-3 !overflow-hidden"
    >
      <SidebarContent className="flex flex-col bg-background h-full overflow-y-auto gap-0 rounded-2xl">
        {/* Navigation Menu */}
        <SidebarGroup className="px-3 !pt-3 pb-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getSidebarItems(systemType, groupsEnabled, crmEnabled, issuingEnabled).map((item) => {
                const isDisabled = item.requiresEvent && !selectedEvent;
                const isActive = activeTab === item.id;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (!isDisabled) {
                          setActiveTab(item.id);
                        }
                      }}
                      data-active={isActive}
                      className={`
                        w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 hover:bg-muted
                        font-manrope font-medium transition-colors text-foreground
                        ${isActive ? 'border border-border bg-muted' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      disabled={isDisabled}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="font-manrope font-medium text-sm">
                          {item.title}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Section - User Info */}
        {!isCollapsed && (
          <div className="mt-auto p-3 border-t border-border bg-muted/50 rounded-b-2xl">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-manrope font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-manrope font-medium text-xs text-foreground truncate">
                  {user?.email || 'User'}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}