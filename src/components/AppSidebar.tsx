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
import { Calendar, Users, Settings, BarChart3, Mail, CreditCard, TrendingUp, Link, Shield, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const getSidebarItems = (systemType: string) => [
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
  { id: "support", title: "Support", icon: Mail },
  { id: "security", title: "Security", icon: Shield },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab, selectedEvent }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [systemType, setSystemType] = useState<string>("EVENTS");

  useEffect(() => {
    const loadOrganization = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("logo_url, name, system_type")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error loading organization:", error);
          return;
        }

        if (data) {
          setOrganizationLogo(data.logo_url);
          setOrganizationName(data.name || "");
          setSystemType(data.system_type || "EVENTS");
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
      className="border-r border-gray-200/60 w-64 flex-shrink-0 h-screen bg-gray-100"
    >
      <SidebarContent className="p-0 flex flex-col h-full bg-gray-100">
        {/* Organization Logo Section - matches header height */}
        {organizationLogo && !isCollapsed && (
          <div className="px-4 border-b border-gray-200/60 bg-gray-50 flex-shrink-0 h-[52px] flex items-center">
            <div className="flex items-center gap-2 w-full">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                <img
                  src={organizationLogo}
                  alt="Organization logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-manrope font-medium text-sm text-gray-900 truncate">
                  {organizationName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mini logo for collapsed state */}
        {organizationLogo && isCollapsed && (
          <div className="px-4 border-b border-gray-200/60 bg-gray-50 flex-shrink-0 h-[52px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={organizationLogo}
                alt="Organization logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getSidebarItems(systemType).map((item) => {
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
                        w-full justify-start rounded-lg transition-all duration-200 ease-in-out
                        font-manrope font-medium text-sm
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        px-3 py-2.5
                      `}
                      disabled={isDisabled}
                    >
                      <item.icon className={`mr-3 h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`} />
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
          <div className="mt-auto p-3 border-t border-gray-200/60 bg-gray-50">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200/40">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-manrope font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-manrope font-medium text-xs text-gray-900 truncate">
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