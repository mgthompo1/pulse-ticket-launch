import React from "react";
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
import { Calendar, Users, Ticket, Settings, BarChart3, Mail, Palette, Globe, CreditCard, Sparkles, Link } from "lucide-react";

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedEvent: any;
}

const sidebarItems = [
  { id: "overview", title: "Overview", icon: BarChart3 },
  { id: "events", title: "Events", icon: Calendar },
  { id: "event-details", title: "Event Details", icon: Users, requiresEvent: true },
  { id: "ai-tools", title: "AI Tools", icon: Sparkles },
  { id: "payments", title: "Payments", icon: CreditCard },
  { id: "design", title: "Design", icon: Palette },
  { id: "marketing", title: "Marketing", icon: Mail },
  { id: "billing", title: "Billing", icon: CreditCard },
  { id: "integrations", title: "Apps", icon: Link },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab, selectedEvent }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon"
      className="border-r"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isDisabled = item.requiresEvent && !selectedEvent;
                const isActive = activeTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => !isDisabled && setActiveTab(item.id)}
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