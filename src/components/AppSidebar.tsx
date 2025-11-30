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
import { Calendar, Users, Settings, BarChart3, Mail, CreditCard, TrendingUp, Link, Shield, MapPin, UsersRound, UserCog, DollarSign, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

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

const getSidebarItems = (systemType: string, groupsEnabled: boolean, crmEnabled: boolean, issuingEnabled: boolean, playbooksEnabled: boolean) => {
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

  // Conditionally add Playbooks menu item if enabled
  if (playbooksEnabled) {
    items.push({ id: "playbooks", title: "Playbooks", icon: Target });
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
  const { currentOrganization } = useOrganizations();

  // Use currentOrganization from the hook - this stays in sync when settings change
  const systemType = currentOrganization?.system_type || "EVENTS";
  const groupsEnabled = currentOrganization?.groups_enabled || false;
  const crmEnabled = currentOrganization?.crm_enabled || false;
  const issuingEnabled = currentOrganization?.issuing_enabled || false;
  const playbooksEnabled = currentOrganization?.playbooks_enabled || false;

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
              {getSidebarItems(systemType, groupsEnabled, crmEnabled, issuingEnabled, playbooksEnabled).map((item) => {
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

        {/* Onboarding Checklist - shows until first event is created */}
        {!isCollapsed && systemType === "EVENTS" && (
          <OnboardingChecklist onNavigate={setActiveTab} />
        )}

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