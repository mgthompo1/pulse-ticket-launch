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
import { Calendar, Users, Settings, BarChart3, Mail, Palette, CreditCard, Sparkles, Link, FileText, Shield } from "lucide-react";
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

const sidebarItems = [
  { id: "overview", title: "Overview", icon: BarChart3 },
  { id: "events", title: "Events", icon: Calendar },
  { id: "event-details", title: "Event Details", icon: Users, requiresEvent: true },
  { id: "invoicing", title: "Invoicing", icon: FileText },
  { id: "ai-tools", title: "AI Tools", icon: Sparkles },
  { id: "payments", title: "Payments", icon: CreditCard },
  { id: "design", title: "Design", icon: Palette },
  { id: "marketing", title: "Marketing", icon: Mail },
  { id: "billing", title: "Billing", icon: CreditCard },
  { id: "integrations", title: "Apps", icon: Link },
  { id: "security", title: "Security", icon: Shield },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab, selectedEvent }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");

  useEffect(() => {
    const loadOrganization = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("logo_url, name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error loading organization:", error);
          return;
        }

        if (data) {
          setOrganizationLogo(data.logo_url);
          setOrganizationName(data.name || "");
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
      className="border-r"
    >
      <SidebarContent>
        {/* Organization Logo Section */}
        {organizationLogo && !isCollapsed && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                <img
                  src={organizationLogo}
                  alt="Organization logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{organizationName}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Mini logo for collapsed state */}
        {organizationLogo && isCollapsed && (
          <div className="p-2 border-b flex justify-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={organizationLogo}
                alt="Organization logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
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
                      className={`w-full justify-start ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : isDisabled 
                            ? "opacity-50 cursor-not-allowed" 
                            : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                      disabled={isDisabled}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}