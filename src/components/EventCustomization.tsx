import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Layout, Mail, Ticket, Monitor, Save, MapPin, Users, Package, Settings, Plus, Trash2, HelpCircle, Cog } from "lucide-react";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import AttendeeManagement from "@/components/AttendeeManagement";
import MerchandiseManager from "@/components/MerchandiseManager";
import TicketTypesManager from "@/components/TicketTypesManager";
import { EventLogoUploader } from "@/components/events/EventLogoUploader";
import { EmailTemplatePreview } from "@/components/EmailTemplatePreview";
import { EmailTemplateBuilder } from "@/components/EmailTemplateBuilder";
import { createDefaultTemplate, EmailTemplate } from "@/types/email-template";

interface EventCustomizationProps {
  eventId: string;
  onSave?: () => void;
}

const EventCustomization: React.FC<EventCustomizationProps> = ({ eventId, onSave }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizationData, setOrganizationData] = useState<{
    name: string;
    logo_url?: string | null;
  } | null>(null);
  
  // Remove any remaining test_mode references and add publish button
  const [eventData, setEventData] = useState<{
    id: string;
    name: string;
    status: string;
    logo_url: string | null;
    venue: string | null;
    description: string | null;
    event_date: string;
    capacity: number;
    requires_approval: boolean | null;
    widget_customization?: Record<string, unknown>;
    ticket_customization?: Record<string, unknown>;
    email_customization?: Record<string, unknown>;
  } | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [eventVenue, setEventVenue] = useState<string>("");
  
  // Widget customization state
  const [widgetCustomization, setWidgetCustomization] = useState({
    theme: {
      enabled: false, // Enable/disable theme customization
      primaryColor: "#000000", // Black for buttons and progress bars (matching live project)
      buttonTextColor: "#ffffff", // White for button text
      secondaryColor: "#ffffff", // White for borders and secondary elements
      backgroundColor: "#ffffff", // White background
      cardBackgroundColor: "#ffffff",
      inputBackgroundColor: "#ffffff",
      borderEnabled: false,
      borderColor: "#e5e7eb",
      headerTextColor: "#111827", // Dark gray for headers
      bodyTextColor: "#6b7280", // Lighter gray for body text (matching GitHub)
      fontFamily: "Manrope" // Default to Manrope (matching your CSS)
    },
    layout: {
      showEventImage: true,
      showDescription: true,
      showVenue: true,
      showCapacity: true,
      ticketLayout: "list"
    },
    branding: {
      showOrgLogo: true,
      customCss: "",
      customHeaderText: "",
      customFooterText: ""
    },
    seatMaps: {
      enabled: false
    },
    customQuestions: {
      enabled: false,
      questions: []
    },
    payment: {
      successUrl: ""
    },
    checkoutMode: "onepage" as 'onepage' | 'multistep'
  });

  // Ticket customization state
  const [ticketCustomization, setTicketCustomization] = useState({
    design: {
      template: "modern",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      borderColor: "#e5e7eb",
      qrCodePosition: "bottom-right",
      fontFamily: "Inter"
    },
    content: {
      showLogo: true,
      showQrCode: true,
      showEventDetails: true,
      showVenueInfo: true,
      customFields: [],
      logoSource: "event" as "event" | "organization" | "custom",
      customLogoUrl: ""
    }
  });

  // Email customization state with enhanced options
  const [emailCustomization, setEmailCustomization] = useState({
    template: {
      theme: "professional", // professional, modern, elegant, minimal, creative
      headerColor: "#3b82f6",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      buttonColor: "#3b82f6",
      accentColor: "#f3f4f6",
      borderColor: "#e5e7eb",
      fontFamily: "Arial, sans-serif"
    },

    branding: {
      showLogo: true,
      logoPosition: "header", // header, content
      logoSize: "medium", // small, medium, large
      logoSource: "event" as "event" | "organization" | "custom",
      customLogoUrl: ""
    },
    layout: {
      headerStyle: "standard", // standard, compact, gradient, center
      contentLayout: "standard", // standard, cards, minimal
      footerStyle: "standard" // standard, minimal, branded
    },
    notifications: {
      organiserNotifications: false,
      organiserEmail: ""
    },
    useCustomColors: false // New toggle for custom vs theme colors
  });

  // New block-based template state (backward compatible)
  const [emailBlocksTemplate, setEmailBlocksTemplate] = useState<EmailTemplate>(createDefaultTemplate());

  // Modern Professional Email Theme Presets - matching backend
  const emailThemePresets = {
    professional: {
      headerColor: "#0f172a",
      backgroundColor: "#ffffff", 
      textColor: "#334155",
      buttonColor: "#0f172a",
      accentColor: "#f8fafc",
      borderColor: "#e2e8f0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    modern: {
      headerColor: "#1e40af",
      backgroundColor: "#ffffff",
      textColor: "#1e293b", 
      buttonColor: "#2563eb",
      accentColor: "#eff6ff",
      borderColor: "#bfdbfe",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    elegant: {
      headerColor: "#581c87",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#7c3aed", 
      accentColor: "#faf5ff",
      borderColor: "#d8b4fe",
      fontFamily: "'Georgia', serif"
    },
    minimal: {
      headerColor: "#18181b",
      backgroundColor: "#ffffff",
      textColor: "#3f3f46",
      buttonColor: "#18181b",
      accentColor: "#fafafa",
      borderColor: "#e4e4e7",
      fontFamily: "'system-ui', -apple-system, sans-serif"
    },
    creative: {
      headerColor: "#be185d",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#ec4899",
      accentColor: "#fdf2f8", 
      borderColor: "#f9a8d4",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    corporate: {
      headerColor: "#1e3a8a",
      backgroundColor: "#ffffff",
      textColor: "#1e293b",
      buttonColor: "#1d4ed8",
      accentColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      fontFamily: "'system-ui', -apple-system, sans-serif"
    }
  };

  const loadCustomizations = useCallback(async () => {
    try {
      console.log("🔍 Loading customizations for event:", eventId);
      
      const { data, error } = await supabase
        .from("events")
        .select("widget_customization, ticket_customization, email_customization, name, status, logo_url, venue, organization_id, description, event_date, capacity, requires_approval")
        .eq("id", eventId)
        .single();

      if (error) {
        console.error("❌ Error loading customizations:", error);
        console.error("❌ Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log("✅ Customizations loaded successfully:", data);
      console.log("✅ Widget customization data:", data.widget_customization);
      
      setOrganizationId(data.organization_id);
      setEventData({ 
        id: eventId,
        name: data.name,
        status: data.status,
        logo_url: data.logo_url,
        venue: data.venue,
        description: data.description,
        event_date: data.event_date,
        capacity: data.capacity,
        requires_approval: data.requires_approval,
        widget_customization: {
          ...(data.widget_customization as Record<string, unknown>),
          // Ensure checkoutMode is preserved if it exists
          ...((data.widget_customization as any)?.checkoutMode && { checkoutMode: (data.widget_customization as any).checkoutMode })
        },
        ticket_customization: data.ticket_customization as Record<string, unknown>,
        email_customization: data.email_customization as Record<string, unknown>
      });
      setCurrentLogoUrl(data?.logo_url || null);

      // Load organization data for the email preview
      if (data.organization_id) {
        try {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("name, logo_url")
            .eq("id", data.organization_id)
            .single();

          if (!orgError && orgData) {
            setOrganizationData(orgData);
          }
        } catch (orgError) {
          console.warn("Could not load organization data for preview:", orgError);
        }
      }
      setEventVenue(data?.venue || "");

      if (data?.widget_customization) {
        // Preserve checkoutMode if it's already set in local state
        const currentCheckoutMode = (widgetCustomization as any).checkoutMode;
        const newWidgetCustomization = {
          ...widgetCustomization,
          ...(data.widget_customization as any),
          // Keep the current checkoutMode if it exists
          ...(currentCheckoutMode && { checkoutMode: currentCheckoutMode })
        };
        setWidgetCustomization(newWidgetCustomization);
      }
      if (data?.ticket_customization) {
        setTicketCustomization(data.ticket_customization as typeof ticketCustomization);
      }
      // Load blocks if present on event's email_customization
      const maybeBlocks = (data?.email_customization as any)?.blocks;
      if (maybeBlocks && Array.isArray(maybeBlocks)) {
        setEmailBlocksTemplate({
          version: 1,
          subject: ((data?.email_customization as any)?.subject) || "Your ticket confirmation",
          theme: {
            headerColor: ((data?.email_customization as any)?.template?.headerColor) || "#1f2937",
            backgroundColor: ((data?.email_customization as any)?.template?.backgroundColor) || "#ffffff",
            textColor: ((data?.email_customization as any)?.template?.textColor) || "#374151",
            buttonColor: ((data?.email_customization as any)?.template?.buttonColor) || "#1f2937",
            accentColor: ((data?.email_customization as any)?.template?.accentColor) || "#f9fafb",
            borderColor: ((data?.email_customization as any)?.template?.borderColor) || "#e5e7eb",
            fontFamily: ((data?.email_customization as any)?.template?.fontFamily) || "Arial, sans-serif",
          },
          blocks: maybeBlocks,
        });
      }
      if (data?.email_customization) {
        const savedCustomization = data.email_customization as any;
        setEmailCustomization(prev => ({
          ...prev,
          ...savedCustomization,
          template: {
            ...prev.template,
            ...savedCustomization?.template,
            // Ensure color values are never empty
            headerColor: savedCustomization?.template?.headerColor || "#000000",
            backgroundColor: savedCustomization?.template?.backgroundColor || "#ffffff", 
            textColor: savedCustomization?.template?.textColor || "#000000",
            buttonColor: savedCustomization?.template?.buttonColor || "#000000",
            accentColor: savedCustomization?.template?.accentColor || "#f3f4f6",
            borderColor: savedCustomization?.template?.borderColor || "#e5e7eb"
          }
        }));
      }
    } catch (error) {
      console.error("Error loading customizations:", error);
    }
  }, [eventId]);

  useEffect(() => {
    loadCustomizations();
  }, [loadCustomizations]);

  // Helper: render HTML from current block template for test emails
  const renderBlocksHtml = useCallback(() => {
    const t = emailBlocksTemplate;
    const theme = t.theme;
    const parts: string[] = [];
    parts.push(`<div style="font-family:${theme.fontFamily || 'Arial, sans-serif'};max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor || '#e5e7eb'}">`);
    for (const b of t.blocks) {
      if ((b as any).hidden) continue;
      switch (b.type) {
        case 'header':
          parts.push(`<div style="background:${theme.headerColor};color:#fff;padding:20px"><h1 style="margin:0;text-align:center">${(b as any).title || 'Thank you'}</h1></div>`);
          break;
        case 'text':
          parts.push(`<div style="padding:16px 20px;color:${theme.textColor}">${(b as any).html || ''}</div>`);
          break;
        case 'event_details':
          parts.push(`<div style="background:${theme.accentColor};border:1px solid ${theme.borderColor};margin:16px 20px;padding:16px;border-radius:8px"><strong style="color:${theme.textColor}">Sample Event Name</strong><div style="color:${theme.textColor};font-size:14px"><div style="display:flex;align-items:center;margin:8px 0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${theme.buttonColor}" stroke-width="2" style="margin-right:8px"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>${new Date().toLocaleDateString()}</div><div style="display:flex;align-items:center;margin:8px 0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${theme.buttonColor}" stroke-width="2" style="margin-right:8px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Sample Venue</div><div style="display:flex;align-items:center;margin:8px 0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${theme.buttonColor}" stroke-width="2" style="margin-right:8px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Sample Customer</div></div>`);
          break;
        case 'ticket_list':
          parts.push(`<div style="padding:0 20px;color:${theme.textColor}"><h3>Your Tickets</h3><div style="border:1px solid ${theme.borderColor};padding:16px;border-radius:8px;background:#fff;margin:12px 0"><div style="display:flex;justify-content:space-between;align-items:center"><span>General Admission</span><code style="background:${theme.accentColor};padding:4px 8px">TCK-XXXXXX</code></div></div></div>`);
          break;
        case 'button':
          parts.push(`<div style="text-align:${(b as any).align || 'center'};padding:20px"><a href="#" style="background:${theme.buttonColor};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${(b as any).label || 'View Order'}</a></div>`);
          break;
        case 'divider':
          parts.push(`<hr style="border:0;border-top:1px solid ${theme.borderColor};margin:16px 20px"/>`);
          break;
        case 'image':
          parts.push(`<div style="text-align:${(b as any).align || 'center'};padding:20px">${(b as any).src ? `<img src="${(b as any).src}" style="max-width:100%"/>` : ''}</div>`);
          break;
        case 'footer':
          parts.push(`<div style="background:${theme.accentColor};padding:16px;text-align:center;border-top:1px solid ${theme.borderColor}"><small style="color:#999">${(b as any).text || ''}</small></div>`);
          break;
        default:
          break;
      }
    }
    parts.push(`</div>`);
    return parts.join('');
  }, [emailBlocksTemplate]);

  const saveCustomizations = async () => {
    setLoading(true);
    try {
      console.log("🔍 Attempting to save customizations...");
      console.log("🔍 Event ID:", eventId);
      console.log("🔍 Current user:", user?.id);
      console.log("🔍 Widget customization to save:", widgetCustomization);
      console.log("🔍 Ticket customization to save:", ticketCustomization);
      console.log("🔍 Email customization to save:", emailCustomization);
      
      // First, let's check if we can read the current event data
      const { data: currentEvent, error: readError } = await supabase
        .from("events")
        .select("id, organization_id, widget_customization")
        .eq("id", eventId)
        .single();
      
      if (readError) {
        console.error("❌ Error reading current event:", readError);
        throw new Error(`Cannot read event: ${readError.message}`);
      }
      
      console.log("✅ Current event data:", currentEvent);
      console.log("🔍 Organization ID:", currentEvent.organization_id);
      
      // Check if user has access to this organization
      const { data: orgAccess, error: orgError } = await supabase
        .from("organizations")
        .select("id, user_id")
        .eq("id", currentEvent.organization_id)
        .single();
      
      if (orgError) {
        console.error("❌ Error checking organization access:", orgError);
      } else {
        console.log("✅ Organization access check:", orgAccess);
        console.log("🔍 Is user organization owner?", orgAccess.user_id === user?.id);
      }
      
      // Check if user is a member of the organization
      if (user?.id) {
        const { data: membership, error: membershipError } = await supabase
          .from("organization_users")
          .select("role, permissions")
          .eq("organization_id", currentEvent.organization_id)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (membershipError && membershipError.code !== 'PGRST116') {
          console.error("❌ Error checking organization membership:", membershipError);
        } else if (membership) {
          console.log("✅ Organization membership:", membership);
        } else {
          console.log("ℹ️ User is not a member of this organization");
        }
      } else {
        console.log("❌ No authenticated user found");
      }
      
      // Merge legacy email customization with block-based template for persistence
      const combinedEmailCustomization = {
        ...emailCustomization,
        template: {
          ...emailCustomization.template,
          ...(emailBlocksTemplate?.theme || {})
        },
        subject: emailBlocksTemplate?.subject || "Your ticket confirmation",
        // Persist blocks array for new renderer
        blocks: emailBlocksTemplate?.blocks || []
      } as any;

      // Now attempt the update
      const { data: updateResult, error: updateError } = await supabase
        .from("events")
        .update({
          widget_customization: widgetCustomization,
          ticket_customization: ticketCustomization,
          email_customization: combinedEmailCustomization
        })
        .eq("id", eventId)
        .select("id, widget_customization, ticket_customization, email_customization");

      if (updateError) {
        console.error("❌ Error updating event:", updateError);
        console.error("❌ Error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log("✅ Update successful:", updateResult);
      console.log("✅ New widget customization:", updateResult[0]?.widget_customization);

      toast({
        title: "Success",
        description: "Customizations saved successfully!"
      });

      onSave?.();
    } catch (error) {
      console.error("❌ Error saving customizations:", error);
      toast({
        title: "Error",
        description: `Failed to save customizations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWidgetCustomization = (path: string[], value: any) => {
    console.log("🔍 Updating widget customization:", { path, value });
    setWidgetCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      console.log("✅ Widget customization updated locally:", updated);
      return updated;
    });
  };

  // Test function to check if user can update the event
  const testEventUpdate = async () => {
    try {
      console.log("🧪 Testing event update permissions...");
      
      // Test 1: Try to add a new field
      const testData1 = {
        widget_customization: {
          ...eventData?.widget_customization,
          testField: `test-${Date.now()}`
        }
      };
      
      console.log("🧪 Test 1 - Current widget_customization keys:", Object.keys(eventData?.widget_customization || {}));
      console.log("🧪 Test 1 - Adding new field 'testField'");
      
      console.log("🧪 Test 1 - Adding new field:", testData1);
      
      const { data: data1, error: error1 } = await supabase
        .from("events")
        .update(testData1)
        .eq("id", eventId)
        .select("widget_customization");
      
      if (error1) {
        console.error("❌ Test 1 failed:", error1);
      } else {
        console.log("✅ Test 1 successful:", data1);
        
        // Verify the new field was saved
        const { data: verify1, error: verifyError1 } = await supabase
          .from("events")
          .select("widget_customization")
          .eq("id", eventId)
          .single();
        
        if (verifyError1) {
          console.error("❌ Verification 1 failed:", verifyError1);
        } else {
          console.log("✅ Verification 1 - saved data:", verify1.widget_customization);
          console.log("✅ Verification 1 - testField exists:", (verify1.widget_customization as any)?.testField);
        }
      }
      
      // Test 2: Try to update existing field
      const testData2 = {
        widget_customization: {
          ...eventData?.widget_customization,
          theme: {
            ...(eventData?.widget_customization?.theme as any),
            testColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
          }
        }
      };
      
      console.log("🧪 Test 2 - Updating existing field:", testData2);
      
      const { data: data2, error: error2 } = await supabase
        .from("events")
        .update(testData2)
        .eq("id", eventId)
        .select("widget_customization");
      
      if (error2) {
        console.error("❌ Test 2 failed:", error2);
      } else {
        console.log("✅ Test 2 successful:", data2);
      }
      
      // Test 3: Try to update a simple field
      const testData3 = {
        description: `Test description ${Date.now()}`
      };
      
      console.log("🧪 Test 3 - Updating simple field:", testData3);
      
      const { data: data3, error: error3 } = await supabase
        .from("events")
        .update(testData3)
        .eq("id", eventId)
        .select("description");
      
      if (error3) {
        console.error("❌ Test 3 failed:", error3);
      } else {
        console.log("✅ Test 3 successful:", data3);
      }
      
    } catch (error) {
      console.error("❌ Test update error:", error);
    }
  };

  const updateTicketCustomization = (path: string[], value: any) => {
    setTicketCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const updateEmailCustomization = (path: string[], value: any) => {
    setEmailCustomization(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      // If theme is being changed and not using custom colors, apply theme preset
      if (path[0] === 'template' && path[1] === 'theme' && !updated.useCustomColors) {
        const preset = emailThemePresets[value as keyof typeof emailThemePresets];
        if (preset) {
          updated.template = { ...updated.template, ...preset };
          
          // Also update the blocks template theme to sync the preview
          setEmailBlocksTemplate(prev => ({
            ...prev,
            theme: {
              ...prev.theme,
              headerColor: preset.headerColor,
              backgroundColor: preset.backgroundColor,
              textColor: preset.textColor,
              buttonColor: preset.buttonColor,
              accentColor: preset.accentColor,
              borderColor: preset.borderColor,
              fontFamily: preset.fontFamily
            }
          }));
        }
      }
      
      return updated;
    });
  };

  // Function to inherit colors from widget theme
  const inheritWidgetTheme = () => {
    const widgetTheme = widgetCustomization.theme;
    setEmailCustomization(prev => ({
      ...prev,
      template: {
        ...prev.template,
        headerColor: widgetTheme.primaryColor,
        backgroundColor: widgetTheme.backgroundColor,
        textColor: widgetTheme.bodyTextColor,
        buttonColor: widgetTheme.primaryColor,
        accentColor: widgetTheme.secondaryColor + "20", // Add transparency for accent
        borderColor: widgetTheme.secondaryColor
      },
      useCustomColors: false
    }));
  };

  // Debug email customization changes
  useEffect(() => {
    console.log("Email customization changed:", emailCustomization);
  }, [emailCustomization]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Customization</h2>
          <p className="text-muted-foreground">Customize your event widget, tickets, and emails</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Open help in parent dashboard
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('openDashboardHelp', { detail: { tab: 'event-details' } }));
              }
            }}
          >
            <HelpCircle className="w-4 w-4 mr-2" />
            Help
          </Button>
          <Button onClick={saveCustomizations} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Seat Map Designer Modal */}
      {showSeatMapDesigner && eventData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl h-[90vh] overflow-hidden">
            <SeatMapDesigner
              eventId={eventId}
              eventName={eventData.name}
              onClose={() => setShowSeatMapDesigner(false)}
            />
          </div>
        </div>
      )}

      <Tabs defaultValue="widget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="seats" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Seat Maps
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="merchandise" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Merchandise
          </TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendees
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>Customize colors and fonts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="themeEnabled"
                      checked={widgetCustomization.theme.enabled}
                      onCheckedChange={(checked: boolean | 'indeterminate') => 
                        updateWidgetCustomization(['theme', 'enabled'], checked === true)
                      }
                    />
                    <Label htmlFor="themeEnabled" className="text-sm font-medium">
                      Enable Theme Customization (Colour/Font)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When disabled, the widget will use default styling. When enabled, you can customize all colors and fonts.
                  </p>
                </div>
                
                {widgetCustomization.theme.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="headerTextColor">Header Font Color</Label>
                    <Input
                      id="headerTextColor"
                      type="color"
                      value={widgetCustomization.theme.headerTextColor}
                      onChange={(e) => updateWidgetCustomization(['theme', 'headerTextColor'], e.target.value)}
                      className="w-full h-10"
                    />
                    <p className="text-xs text-muted-foreground">Color for headers and titles</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyTextColor">Body Font Color</Label>
                    <Input
                      id="bodyTextColor"
                      type="color"
                      value={widgetCustomization.theme.bodyTextColor}
                      onChange={(e) => updateWidgetCustomization(['theme', 'bodyTextColor'], e.target.value)}
                      className="w-full h-10"
                    />
                    <p className="text-xs text-muted-foreground">Color for body text and descriptions</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buttonColor">Button Color</Label>
                    <Input
                      id="buttonColor"
                      type="color"
                      value={widgetCustomization.theme.primaryColor}
                      onChange={(e) => updateWidgetCustomization(['theme', 'primaryColor'], e.target.value)}
                      className="w-full h-10"
                    />
                    <p className="text-xs text-muted-foreground">Color for buttons and primary elements</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buttonTextColor">Button Font Colour</Label>
                    <Input
                      id="buttonTextColor"
                      type="color"
                      value={widgetCustomization.theme.buttonTextColor}
                      onChange={(e) => updateWidgetCustomization(['theme', 'buttonTextColor'], e.target.value)}
                      className="w-full h-10"
                    />
                    <p className="text-xs text-muted-foreground">Color for text inside buttons</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="themeColor">Theme Color</Label>
                  <Input
                    id="themeColor"
                    type="color"
                    value={widgetCustomization.theme.secondaryColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'secondaryColor'], e.target.value)}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground">Color for status bars, borders, and secondary elements</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={widgetCustomization.theme.backgroundColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'backgroundColor'], e.target.value)}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground">Color for the overall background</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardBackgroundColor">Card Background Color</Label>
                  <Input
                    id="cardBackgroundColor"
                    type="color"
                    value={widgetCustomization.theme.cardBackgroundColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'cardBackgroundColor'], e.target.value)}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground">Background for individual cards/sections</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inputBackgroundColor">Text Input Background</Label>
                  <Input
                    id="inputBackgroundColor"
                    type="color"
                    value={widgetCustomization.theme.inputBackgroundColor}
                    onChange={(e) => updateWidgetCustomization(['theme', 'inputBackgroundColor'], e.target.value)}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground">Background for input fields</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    value={widgetCustomization.theme.fontFamily}
                    onValueChange={(value) => updateWidgetCustomization(['theme', 'fontFamily'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Modern Sans-Serif Fonts */}
                      <SelectItem value="Manrope" className="font-manrope">Manrope (Default)</SelectItem>
                      <SelectItem value="Inter" className="font-inter">Inter</SelectItem>
                      <SelectItem value="Roboto" className="font-roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans" className="font-open-sans">Open Sans</SelectItem>
                      <SelectItem value="Poppins" className="font-poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat" className="font-montserrat">Montserrat</SelectItem>
                      <SelectItem value="Lato" className="font-lato">Lato</SelectItem>
                      <SelectItem value="Source Sans Pro" className="font-source-sans-pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Ubuntu" className="font-ubuntu">Ubuntu</SelectItem>
                      <SelectItem value="Noto Sans" className="font-noto-sans">Noto Sans</SelectItem>
                      <SelectItem value="Work Sans" className="font-work-sans">Work Sans</SelectItem>
                      <SelectItem value="PT Sans" className="font-pt-sans">PT Sans</SelectItem>
                      <SelectItem value="Oswald" className="font-oswald">Oswald</SelectItem>
                      <SelectItem value="Raleway" className="font-raleway">Raleway</SelectItem>
                      <SelectItem value="Nunito" className="font-nunito">Nunito</SelectItem>
                      <SelectItem value="Quicksand" className="font-quicksand">Quicksand</SelectItem>
                      <SelectItem value="Josefin Sans" className="font-josefin-sans">Josefin Sans</SelectItem>
                      <SelectItem value="DM Sans" className="font-dm-sans">DM Sans</SelectItem>
                      <SelectItem value="Outfit" className="font-outfit">Outfit</SelectItem>
                      <SelectItem value="Plus Jakarta Sans" className="font-plus-jakarta-sans">Plus Jakarta Sans</SelectItem>
                      <SelectItem value="Albert Sans" className="font-albert-sans">Albert Sans</SelectItem>
                      <SelectItem value="Onest" className="font-onest">Onest</SelectItem>
                      <SelectItem value="Geist" className="font-geist">Geist</SelectItem>
                      <SelectItem value="Cal Sans" className="font-cal-sans">Cal Sans</SelectItem>
                      <SelectItem value="General Sans" className="font-general-sans">General Sans</SelectItem>
                      <SelectItem value="Clash Display" className="font-clash-display">Clash Display</SelectItem>
                      <SelectItem value="Clash Grotesk" className="font-clash-grotesk">Clash Grotesk</SelectItem>
                      <SelectItem value="Sentient" className="font-sentient">Sentient</SelectItem>
                      <SelectItem value="Chillax" className="font-chillax">Chillax</SelectItem>
                      <SelectItem value="Cabinet Grotesk" className="font-cabinet-grotesk">Cabinet Grotesk</SelectItem>
                      <SelectItem value="Switzer" className="font-switzer">Switzer</SelectItem>
                      <SelectItem value="Gambarino" className="font-gambarino">Gambarino</SelectItem>
                      <SelectItem value="Melodrama" className="font-melodrama">Melodrama</SelectItem>
                      <SelectItem value="Zodiak" className="font-zodiak">Zodiak</SelectItem>
                      <SelectItem value="Panchang" className="font-panchang">Panchang</SelectItem>
                      
                      {/* Classic Serif Fonts */}
                      <SelectItem value="Playfair Display" className="font-playfair-display">Playfair Display</SelectItem>
                      <SelectItem value="Merriweather" className="font-merriweather">Merriweather</SelectItem>
                      
                      {/* System Fonts */}
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="-apple-system">System Font</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="borderEnabled">Show Borders</Label>
                    <div className="flex items-center h-10">
                      <input
                        id="borderEnabled"
                        type="checkbox"
                        checked={widgetCustomization.theme.borderEnabled}
                        onChange={(e) => updateWidgetCustomization(['theme', 'borderEnabled'], e.target.checked)}
                        className="h-4 w-4 mr-2"
                      />
                      <span className="text-sm text-muted-foreground">Apply to cards and inputs</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="borderColor">Border Color</Label>
                    <Input
                      id="borderColor"
                      type="color"
                      value={widgetCustomization.theme.borderColor}
                      onChange={(e) => updateWidgetCustomization(['theme', 'borderColor'], e.target.value)}
                      className="w-full h-10"
                    />
                  </div>
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Layout
                </CardTitle>
                <CardDescription>Control what information to display</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showEventImage">Show Event Image</Label>
                  <Switch
                    id="showEventImage"
                    checked={widgetCustomization.layout.showEventImage}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showEventImage'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showDescription">Show Description</Label>
                  <Switch
                    id="showDescription"
                    checked={widgetCustomization.layout.showDescription}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showDescription'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showVenue">Show Venue</Label>
                  <Switch
                    id="showVenue"
                    checked={widgetCustomization.layout.showVenue}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showVenue'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showCapacity">Show Capacity</Label>
                  <Switch
                    id="showCapacity"
                    checked={widgetCustomization.layout.showCapacity}
                    onCheckedChange={(checked) => updateWidgetCustomization(['layout', 'showCapacity'], checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketLayout">Ticket Layout</Label>
                  <Select
                    value={widgetCustomization.layout.ticketLayout}
                    onValueChange={(value) => updateWidgetCustomization(['layout', 'ticketLayout'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">List View</SelectItem>
                      <SelectItem value="grid">Grid View</SelectItem>
                      <SelectItem value="compact">Compact View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Branding</CardTitle>
              <CardDescription>Add custom text and styling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showOrgLogo">Show Organization Logo</Label>
                <Switch
                  id="showOrgLogo"
                  checked={widgetCustomization.branding.showOrgLogo}
                  onCheckedChange={(checked) => updateWidgetCustomization(['branding', 'showOrgLogo'], checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customHeaderText">Custom Header Text</Label>
                <Input
                  id="customHeaderText"
                  value={widgetCustomization.branding.customHeaderText}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customHeaderText'], e.target.value)}
                  placeholder="Welcome to our event!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customFooterText">Custom Footer Text</Label>
                <Input
                  id="customFooterText"
                  value={widgetCustomization.branding.customFooterText}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customFooterText'], e.target.value)}
                  placeholder="Contact us for questions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={widgetCustomization.branding.customCss}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customCss'], e.target.value)}
                  placeholder=".custom-button { background: linear-gradient(...) }"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Questions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Custom Questions
              </CardTitle>
              <CardDescription>
                Add custom questions that customers must answer when purchasing tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Custom Questions */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableCustomQuestions" className="text-base font-medium">
                    Enable Custom Questions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require customers to answer custom questions during ticket purchase
                  </p>
                </div>
                <Switch
                  id="enableCustomQuestions"
                  checked={widgetCustomization.customQuestions?.enabled || false}
                  onCheckedChange={(checked) => updateWidgetCustomization(['customQuestions', 'enabled'], checked)}
                />
              </div>

              {/* Custom Questions Management - Only show when enabled */}
              {widgetCustomization.customQuestions?.enabled && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Question Management</h4>
                      <Button
                        onClick={() => {
                          const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                          if (currentQuestions.length >= 5) {
                            toast({
                              title: "Maximum Questions Reached",
                              description: "You can only add up to 5 custom questions.",
                              variant: "destructive"
                            });
                            return;
                          }
                          const newQuestion = {
                            id: `question_${Date.now()}`,
                            label: "",
                            type: "text",
                            required: false,
                            options: ""
                          };
                          updateWidgetCustomization(['customQuestions', 'questions'], [...currentQuestions, newQuestion]);
                        }}
                        size="sm"
                        disabled={(widgetCustomization.customQuestions?.questions || []).length >= 5}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {(widgetCustomization.customQuestions?.questions || []).map((question: any, index: number) => (
                        <div key={question.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Question {index + 1}</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.filter((q: any) => q.id !== question.id);
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Question Label *</Label>
                              <Input
                                value={question.label}
                                onChange={(e) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, label: e.target.value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                                placeholder="e.g., Dietary Requirements"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, type: value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text Input</SelectItem>
                                  <SelectItem value="textarea">Long Text</SelectItem>
                                  <SelectItem value="select">Dropdown</SelectItem>
                                  <SelectItem value="radio">Radio Buttons</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone Number</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Options field for select/radio/checkbox types */}
                          {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                            <div className="space-y-2">
                              <Label>Options (one per line)</Label>
                              <Textarea
                                value={question.options}
                                onChange={(e) => {
                                  const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                  const updatedQuestions = currentQuestions.map((q: any) =>
                                    q.id === question.id ? { ...q, options: e.target.value } : q
                                  );
                                  updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                }}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter each option on a separate line
                              </p>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`required-${question.id}`}
                              checked={question.required}
                              onCheckedChange={(checked) => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.map((q: any) =>
                                  q.id === question.id ? { ...q, required: checked } : q
                                );
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            />
                            <Label htmlFor={`required-${question.id}`}>Required field</Label>
                          </div>
                        </div>
                      ))}

                      {(widgetCustomization.customQuestions?.questions || []).length === 0 && (
                        <div className="text-center p-6 border rounded-lg bg-muted/30">
                          <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No custom questions added yet. Click "Add Question" to get started.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Information when disabled */}
              {!widgetCustomization.customQuestions?.enabled && (
                <div className="text-center p-6 border rounded-lg bg-muted/30">
                  <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Enable custom questions above to collect additional information from customers during ticket purchase
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget URL Section - Only show when event is published */}
          {eventData?.status === 'published' && (
            <Card>
              <CardHeader>
                <CardTitle>Widget Sharing</CardTitle>
                <CardDescription>Share your customized ticket widget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Widget URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/widget/${eventId}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                        toast({
                          title: "Copied!",
                          description: "Widget URL copied to clipboard"
                        });
                      }}
                    >
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`${window.location.origin}/widget/${eventId}`, '_blank')}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="space-y-2">
                    <Textarea
                      value={`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`}
                      readOnly
                      rows={3}
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`);
                        toast({
                          title: "Copied!",
                          description: "Embed code copied to clipboard"
                        });
                      }}
                    >
                      Copy Embed Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Seat Map Management
              </CardTitle>
              <CardDescription>
                Configure seating options for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Seat Maps */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enableSeatMaps" className="text-base font-medium">
                      Enable Seat Maps
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('openDashboardHelp', { detail: { tab: 'event-details' } }));
                      }}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow guests to select specific seats when purchasing tickets
                  </p>
                </div>
                <Switch
                  id="enableSeatMaps"
                  checked={widgetCustomization.seatMaps?.enabled || false}
                  onCheckedChange={(checked) => updateWidgetCustomization(['seatMaps', 'enabled'], checked)}
                />
              </div>

              {/* Seat Map Designer - Only show when enabled */}
              {widgetCustomization.seatMaps?.enabled && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Seating Layout Design</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create custom seating layouts to allow guests to select their preferred seats during ticket purchase.
                    </p>
                    <Button 
                      onClick={() => {
                        console.log("=== SEAT MAP BUTTON CLICKED ===");
                        console.log("Event ID:", eventId);
                        console.log("Event Data:", eventData);
                        console.log("Current showSeatMapDesigner state:", showSeatMapDesigner);
                        setShowSeatMapDesigner(true);
                        console.log("Set showSeatMapDesigner to true");
                      }}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Open Seat Map Designer
                    </Button>
                  </div>
                </div>
              )}

              {/* Information when disabled */}
              {!widgetCustomization.seatMaps?.enabled && (
                <div className="text-center p-6 border rounded-lg bg-muted/30">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Enable seat maps above to create custom seating layouts for your event
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Ticket Types & Pricing Management */}
          <TicketTypesManager eventId={eventId} />
          
          {/* Ticket Design Customization */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Design & Appearance</CardTitle>
              <CardDescription>Customize how your tickets look when sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ticket Design</CardTitle>
                    <CardDescription>Customize ticket appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticketTemplate">Template</Label>
                      <Select
                        value={ticketCustomization.design.template}
                        onValueChange={(value) => updateTicketCustomization(['design', 'template'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="elegant">Elegant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketBgColor">Background Color</Label>
                      <Input
                        id="ticketBgColor"
                        type="color"
                        value={ticketCustomization.design.backgroundColor}
                        onChange={(e) => updateTicketCustomization(['design', 'backgroundColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketTextColor">Text Color</Label>
                      <Input
                        id="ticketTextColor"
                        type="color"
                        value={ticketCustomization.design.textColor}
                        onChange={(e) => updateTicketCustomization(['design', 'textColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qrCodePosition">QR Code Position</Label>
                      <Select
                        value={ticketCustomization.design.qrCodePosition}
                        onValueChange={(value) => updateTicketCustomization(['design', 'qrCodePosition'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticketFontFamily">Font Family</Label>
                      <Select
                        value={ticketCustomization.design.fontFamily || "Inter"}
                        onValueChange={(value) => updateTicketCustomization(['design', 'fontFamily'], value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Modern Sans-Serif Fonts */}
                          <SelectItem value="Inter" className="font-inter">Inter</SelectItem>
                          <SelectItem value="Roboto" className="font-roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans" className="font-open-sans">Open Sans</SelectItem>
                          <SelectItem value="Poppins" className="font-poppins">Poppins</SelectItem>
                          <SelectItem value="Montserrat" className="font-montserrat">Montserrat</SelectItem>
                          <SelectItem value="Lato" className="font-lato">Lato</SelectItem>
                          <SelectItem value="Source Sans Pro" className="font-source-sans-pro">Source Sans Pro</SelectItem>
                          <SelectItem value="Ubuntu" className="font-ubuntu">Ubuntu</SelectItem>
                          <SelectItem value="Noto Sans" className="font-noto-sans">Noto Sans</SelectItem>
                          <SelectItem value="Work Sans" className="font-work-sans">Work Sans</SelectItem>
                          <SelectItem value="PT Sans" className="font-pt-sans">PT Sans</SelectItem>
                          <SelectItem value="Oswald" className="font-oswald">Oswald</SelectItem>
                          <SelectItem value="Raleway" className="font-raleway">Raleway</SelectItem>
                          <SelectItem value="Nunito" className="font-nunito">Nunito</SelectItem>
                          <SelectItem value="Quicksand" className="font-quicksand">Quicksand</SelectItem>
                          <SelectItem value="Josefin Sans" className="font-josefin-sans">Josefin Sans</SelectItem>
                          <SelectItem value="DM Sans" className="font-dm-sans">DM Sans</SelectItem>
                          <SelectItem value="Outfit" className="font-outfit">Outfit</SelectItem>
                          <SelectItem value="Plus Jakarta Sans" className="font-plus-jakarta-sans">Plus Jakarta Sans</SelectItem>
                          <SelectItem value="Albert Sans" className="font-albert-sans">Albert Sans</SelectItem>
                          <SelectItem value="Onest" className="font-onest">Onest</SelectItem>
                          <SelectItem value="Geist" className="font-geist">Geist</SelectItem>
                          <SelectItem value="Cal Sans" className="font-cal-sans">Cal Sans</SelectItem>
                          <SelectItem value="General Sans" className="font-general-sans">General Sans</SelectItem>
                          <SelectItem value="Clash Display" className="font-clash-display">Clash Display</SelectItem>
                          <SelectItem value="Clash Grotesk" className="font-clash-grotesk">Clash Grotesk</SelectItem>
                          <SelectItem value="Sentient" className="font-sentient">Sentient</SelectItem>
                          <SelectItem value="Chillax" className="font-chillax">Chillax</SelectItem>
                          <SelectItem value="Cabinet Grotesk" className="font-cabinet-grotesk">Cabinet Grotesk</SelectItem>
                          <SelectItem value="Switzer" className="font-switzer">Switzer</SelectItem>
                          <SelectItem value="Gambarino" className="font-gambarino">Gambarino</SelectItem>
                          <SelectItem value="Melodrama" className="font-melodrama">Melodrama</SelectItem>
                          <SelectItem value="Zodiak" className="font-zodiak">Zodiak</SelectItem>
                          <SelectItem value="Panchang" className="font-panchang">Panchang</SelectItem>
                          
                          {/* Classic Serif Fonts */}
                          <SelectItem value="Playfair Display" className="font-playfair-display">Playfair Display</SelectItem>
                          <SelectItem value="Merriweather" className="font-merriweather">Merriweather</SelectItem>
                          
                          {/* System Fonts */}
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="-apple-system">System Font</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ticket Content</CardTitle>
                    <CardDescription>Choose what information to include</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketLogo">Show Logo</Label>
                      <Switch
                        id="showTicketLogo"
                        checked={ticketCustomization.content.showLogo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showLogo'], checked)}
                      />
                    </div>
                    
                    {ticketCustomization.content.showLogo && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div className="space-y-2">
                          <Label htmlFor="ticketLogoSource">Logo Source</Label>
                          <Select
                            value={ticketCustomization.content.logoSource || 'event'}
                            onValueChange={(value) => updateTicketCustomization(['content', 'logoSource'], value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="event">Use Event Logo</SelectItem>
                              <SelectItem value="organization">Use Organization Logo</SelectItem>
                              <SelectItem value="custom">Custom Ticket Logo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {ticketCustomization.content.logoSource === 'event' && (
                          <div className="space-y-3">
                            <Label>Event Logo Upload</Label>
                            <EventLogoUploader 
                              eventId={eventId}
                               currentLogoUrl={currentLogoUrl || undefined}
                              onLogoChange={(logoUrl) => {
                                setCurrentLogoUrl(logoUrl);
                                // Refresh event data to get updated logo
                                loadCustomizations();
                              }}
                            />
                            {!currentLogoUrl && (
                              <p className="text-sm text-muted-foreground">
                                Upload an event logo to display on tickets when "Use Event Logo" is selected.
                              </p>
                            )}
                          </div>
                        )}
                        
                        {ticketCustomization.content.logoSource === 'custom' && (
                          <div className="space-y-2">
                            <Label htmlFor="customTicketLogo">Custom Ticket Logo URL</Label>
                            <Input
                              id="customTicketLogo"
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={ticketCustomization.content.customLogoUrl || ''}
                              onChange={(e) => updateTicketCustomization(['content', 'customLogoUrl'], e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketQrCode">Show QR Code</Label>
                      <Switch
                        id="showTicketQrCode"
                        checked={ticketCustomization.content.showQrCode}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showQrCode'], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketEventDetails">Show Event Details</Label>
                      <Switch
                        id="showTicketEventDetails"
                        checked={ticketCustomization.content.showEventDetails}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showEventDetails'], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicketVenueInfo">Show Venue Info</Label>
                      <Switch
                        id="showTicketVenueInfo"
                        checked={ticketCustomization.content.showVenueInfo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showVenueInfo'], checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              {/* Block-based Email Builder */}
              <EmailTemplateBuilder
                template={emailBlocksTemplate}
                onChange={(t) => setEmailBlocksTemplate(t)}
              />
              {/* Theme Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Email Theme
                  </CardTitle>
                  <CardDescription>Choose a pre-designed theme for your confirmation emails</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Presets */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="font-medium">Presets</Label>
                      <p className="text-xs text-muted-foreground">Apply or reset pre-defined layouts</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEmailBlocksTemplate(createDefaultTemplate())}>Reset</Button>
                      <Button variant="outline" size="sm" onClick={() => setEmailBlocksTemplate(t => ({...t, blocks: t.blocks.filter(b => b.type !== 'image' && b.type !== 'divider')}))}>Minimal</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { value: 'professional', label: 'Professional', description: 'Clean slate design with refined typography' },
                      { value: 'modern', label: 'Modern', description: 'Contemporary blue with polished spacing' },
                      { value: 'elegant', label: 'Elegant', description: 'Sophisticated purple with serif typography' },
                      { value: 'minimal', label: 'Minimal', description: 'Ultra-clean monochrome design' },
                      { value: 'creative', label: 'Creative', description: 'Vibrant pink with modern styling' },
                      { value: 'corporate', label: 'Corporate', description: 'Traditional business blue theme' }
                    ].map(theme => (
                      <div 
                        key={theme.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          emailCustomization.template.theme === theme.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => updateEmailCustomization(['template', 'theme'], theme.value)}
                      >
                        <div className="font-medium">{theme.label}</div>
                        <div className="text-sm text-muted-foreground">{theme.description}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Inherit Widget Theme Option */}
                  <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Use Widget Theme</Label>
                        <p className="text-xs text-muted-foreground">Automatically match your widget's color scheme</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={inheritWidgetTheme}
                        className="shrink-0"
                      >
                        Apply Widget Colors
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Colors & Style */}
              <Card>
                <CardHeader>
                  <CardTitle>Colors & Style</CardTitle>
                  <CardDescription>Customize the visual appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom Colors Toggle */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div>
                      <Label htmlFor="useCustomColors" className="font-medium">Custom Colors</Label>
                      <p className="text-xs text-muted-foreground">Enable to override theme colors with custom values</p>
                    </div>
                    <Switch
                      id="useCustomColors"
                      checked={emailCustomization.useCustomColors}
                      onCheckedChange={(checked) => updateEmailCustomization(['useCustomColors'], checked)}
                    />
                  </div>
                  
                  {/* Color Controls - Only show if custom colors enabled */}
                  {emailCustomization.useCustomColors && (
                  <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="headerColor">Header Color</Label>
                      <Input
                        id="headerColor"
                        type="color"
                        value={emailCustomization.template.headerColor}
                        onChange={(e) => updateEmailCustomization(['template', 'headerColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={emailCustomization.template.backgroundColor}
                        onChange={(e) => updateEmailCustomization(['template', 'backgroundColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textColor">Text Color</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={emailCustomization.template.textColor}
                        onChange={(e) => updateEmailCustomization(['template', 'textColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonColor">Button Color</Label>
                      <Input
                        id="buttonColor"
                        type="color"
                        value={emailCustomization.template.buttonColor}
                        onChange={(e) => updateEmailCustomization(['template', 'buttonColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <Input
                        id="accentColor"
                        type="color"
                        value={emailCustomization.template.accentColor}
                        onChange={(e) => updateEmailCustomization(['template', 'accentColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borderColor">Border Color</Label>
                      <Input
                        id="borderColor"
                        type="color"
                        value={emailCustomization.template.borderColor}
                        onChange={(e) => updateEmailCustomization(['template', 'borderColor'], e.target.value)}
                        className="w-full h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select value={emailCustomization.template.fontFamily} onValueChange={(value) => updateEmailCustomization(['template', 'fontFamily'], value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="Helvetica, Arial, sans-serif">Helvetica</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                        <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                        <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                   </div>
                   )}
                </CardContent>
              </Card>



              {/* Branding Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Branding & Layout</CardTitle>
                  <CardDescription>Control logo placement and layout options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailShowLogo">Show Logo</Label>
                    <Switch
                      id="emailShowLogo"
                      checked={emailCustomization.branding.showLogo}
                      onCheckedChange={(checked) => updateEmailCustomization(['branding', 'showLogo'], checked)}
                    />
                  </div>
                  
                  {emailCustomization.branding.showLogo && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="logoPosition">Logo Position</Label>
                        <Select value={emailCustomization.branding.logoPosition} onValueChange={(value) => updateEmailCustomization(['branding', 'logoPosition'], value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="header">Header</SelectItem>
                            <SelectItem value="content">Content Area</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="logoSize">Logo Size</Label>
                        <Select value={emailCustomization.branding.logoSize} onValueChange={(value) => updateEmailCustomization(['branding', 'logoSize'], value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logoSource">Logo Source</Label>
                        <Select value={emailCustomization.branding.logoSource || 'event'} onValueChange={(value) => updateEmailCustomization(['branding', 'logoSource'], value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="event">Event Logo</SelectItem>
                            <SelectItem value="organization">Organization Logo</SelectItem>
                            <SelectItem value="custom">Custom URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {emailCustomization.branding.logoSource === 'custom' && (
                        <div className="space-y-2">
                          <Label htmlFor="customEmailLogo">Custom Logo URL</Label>
                          <Input
                            id="customEmailLogo"
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={emailCustomization.branding.customLogoUrl || ''}
                            onChange={(e) => updateEmailCustomization(['branding', 'customLogoUrl'], e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="headerStyle">Header Style</Label>
                    <Select value={emailCustomization.layout?.headerStyle || 'standard'} onValueChange={(value) => updateEmailCustomization(['layout', 'headerStyle'], value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="center">Center Aligned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Organiser Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Organiser Notifications</CardTitle>
                  <CardDescription>Get notified when tickets are sold</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="organiserNotifications">Send notifications when tickets are sold</Label>
                    <Switch
                      id="organiserNotifications"
                      checked={emailCustomization.notifications?.organiserNotifications || false}
                      onCheckedChange={(checked) => updateEmailCustomization(['notifications', 'organiserNotifications'], checked)}
                    />
                  </div>
                  {emailCustomization.notifications?.organiserNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="organiserEmail">Notification Email</Label>
                      <Input
                        id="organiserEmail"
                        type="email"
                        value={emailCustomization.notifications?.organiserEmail || ""}
                        onChange={(e) => updateEmailCustomization(['notifications', 'organiserEmail'], e.target.value)}
                        placeholder="Enter email to receive notifications"
                      />
                      <p className="text-sm text-muted-foreground">
                        You'll receive an email with ticket details and customer information each time a ticket is sold.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Email Preview */}
            <div className="lg:sticky lg:top-6">
              <EmailTemplatePreview
                emailCustomization={emailCustomization}
                blocksTemplate={emailBlocksTemplate}
                eventDetails={{
                  name: eventData?.name || "Sample Event Name",
                  venue: eventData?.venue || "Sample Venue",
                  event_date: new Date().toISOString(),
                  logo_url: eventData?.logo_url || currentLogoUrl || undefined
                }}
                organizationDetails={{
                  name: organizationData?.name || "Your Organization",
                  logo_url: organizationData?.logo_url || undefined
                }}
              />
              {/* Send Test Email */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Send Test Email</CardTitle>
                  <CardDescription>Send the current template to your inbox</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="you@example.com" value={(emailCustomization as any)._testRecipient || ''} onChange={(e) => setEmailCustomization((prev:any) => ({...prev, _testRecipient: e.target.value}))} />
                    <Button onClick={async () => {
                      const to = (emailCustomization as any)._testRecipient;
                      if (!to) return;
                      const html = renderBlocksHtml();
                      await supabase.functions.invoke('test-resend-email', { body: { to, subject: emailBlocksTemplate.subject, html } });
                      toast({ title: 'Sent', description: `Test email sent to ${to}` });
                    }}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="merchandise" className="space-y-6">
          <MerchandiseManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="attendees" className="space-y-6">
          <AttendeeManagement eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Event Information
              </CardTitle>
              <CardDescription>Edit your event's core details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name *</Label>
                  <Input
                    id="event-name"
                    value={eventData?.name || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, name: e.target.value } : null);
                    }}
                    placeholder="Enter event name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="event-venue">Venue</Label>
                  <Input
                    id="event-venue"
                    value={eventData?.venue || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, venue: e.target.value } : null);
                    }}
                    placeholder="Enter venue name"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date & Time *</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={eventData?.event_date ? new Date(eventData.event_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, event_date: e.target.value } : null);
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="event-capacity">Capacity</Label>
                  <Input
                    id="event-capacity"
                    type="number"
                    min="1"
                    value={eventData?.capacity || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, capacity: parseInt(e.target.value) || 0 } : null);
                    }}
                    placeholder="Maximum attendees"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={eventData?.description || ""}
                  onChange={(e) => {
                    setEventData(prev => prev ? { ...prev, description: e.target.value } : null);
                  }}
                  placeholder="Describe your event..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires-approval"
                  checked={eventData?.requires_approval || false}
                  onCheckedChange={(checked) => {
                    setEventData(prev => prev ? { ...prev, requires_approval: checked } : null);
                  }}
                />
                <Label htmlFor="requires-approval">Require approval for ticket purchases</Label>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={async () => {
                    if (!eventData) return;
                    
                    try {
                      const { error } = await supabase
                        .from("events")
                        .update({
                          name: eventData.name,
                          venue: eventData.venue,
                          description: eventData.description,
                          event_date: eventData.event_date,
                          capacity: eventData.capacity,
                          requires_approval: eventData.requires_approval
                        })
                        .eq("id", eventId);

                      if (error) throw error;

                      toast({
                        title: "Success",
                        description: "Event details updated successfully"
                      });
                    } catch (error) {
                      console.error("Error updating event details:", error);
                      toast({
                        title: "Error",
                        description: "Failed to update event details",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Event Details
                </Button>
              </div>
            </CardContent>
          </Card>

          <EventLogoUploader
            eventId={eventId}
            currentLogoUrl={currentLogoUrl || undefined}
            onLogoChange={url => {
              setCurrentLogoUrl(url);
              setEventData(prev => prev ? { ...prev, logo_url: url } : prev);
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>Configure event publication and general settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Event Status</Label>
                    <p className="text-sm text-muted-foreground">
                      {eventData?.status === 'published' 
                        ? 'Your event is live and accepting ticket sales' 
                        : 'Your event is in draft mode and not visible to the public'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {eventData?.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                    <Switch
                      checked={eventData?.status === 'published'}
                      onCheckedChange={async (checked) => {
                        try {
                          const { error } = await supabase
                            .from("events")
                            .update({ status: checked ? 'published' : 'draft' })
                            .eq("id", eventId);

                          if (error) throw error;

                          setEventData(prev => prev ? ({ ...prev, status: checked ? 'published' : 'draft' }) : null);
                          
                          toast({
                            title: "Success",
                            description: checked 
                              ? "Event published successfully! It's now live and accepting ticket sales." 
                              : "Event unpublished. It's now in draft mode and not visible to the public."
                          });
                        } catch (error) {
                          console.error("Error updating event status:", error);
                          toast({
                            title: "Error",
                            description: "Failed to update event status",
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="venueName"
                      placeholder="e.g. Spark Arena"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from("events")
                            .update({ venue: eventVenue || null })
                            .eq("id", eventId);
                          if (error) throw error;
                          setEventData(prev => prev ? ({ ...prev, venue: eventVenue || null }) : prev);
                          toast({ title: "Saved", description: "Venue updated" });
                        } catch (error) {
                          console.error("Error updating venue:", error);
                          toast({ title: "Error", description: "Failed to update venue", variant: "destructive" });
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Event URL and Widget Embedding */}
              {eventData?.status === 'published' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Public Event URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/widget/${eventId}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                          toast({
                            title: "Copied!",
                            description: "Event URL copied to clipboard"
                          });
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Widget Embed Code</Label>
                    <div className="space-y-2">
                      <Textarea
                        value={`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`}
                        readOnly
                        rows={3}
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`);
                          toast({
                            title: "Copied!",
                            description: "Widget embed code copied to clipboard"
                          });
                        }}
                      >
                        Copy Embed Code
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Direct Widget URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/widget/${eventId}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/widget/${eventId}`);
                          toast({
                            title: "Copied!",
                            description: "Widget URL copied to clipboard"
                          });
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Delivery Method */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Default Ticket Delivery Method</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how tickets will be delivered to customers by default
                  </p>
                  <Select
                    value={(eventData as any)?.ticket_delivery_method || 'qr_ticket'}
                    onValueChange={async (value: 'qr_ticket' | 'confirmation_email') => {
                      try {
                        const { error } = await supabase
                          .from("events")
                          .update({ ticket_delivery_method: value })
                          .eq("id", eventId);

                        if (error) throw error;

                        setEventData(prev => prev ? ({ ...prev, ticket_delivery_method: value }) : null);
                        
                        toast({
                          title: "Success",
                          description: "Ticket delivery method updated"
                        });
                      } catch (error) {
                        console.error("Error updating delivery method:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update delivery method",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr_ticket">Digital QR Code Tickets</SelectItem>
                      <SelectItem value="confirmation_email">Email Confirmation Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checkout Mode */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Checkout Experience</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose how customers will complete their purchase
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testEventUpdate}
                      className="text-xs"
                    >
                      🧪 Test Update
                    </Button>
                  </div>
                  <Select
                    value={(eventData?.widget_customization as any)?.checkoutMode || 'onepage'}
                    onValueChange={async (value: 'onepage' | 'multistep') => {
                      try {
                        const currentCustomization = (eventData?.widget_customization as any) || {};
                        console.log("Saving checkout mode:", value);
                        console.log("Current customization:", currentCustomization);
                        console.log("Current customization keys:", Object.keys(currentCustomization));
                        
                        const updatedCustomization = {
                          ...currentCustomization,
                          checkoutMode: value
                        };
                        console.log("Updated customization:", updatedCustomization);
                        console.log("Updated customization keys:", Object.keys(updatedCustomization));
                        console.log("Checkout mode value being saved:", updatedCustomization.checkoutMode);
                        
                        console.log("🔍 Attempting to update database...");
                        console.log("🔍 Event ID:", eventId);
                        console.log("🔍 Updated customization:", updatedCustomization);
                        
                        const { data, error } = await supabase
                          .from("events")
                          .update({ 
                            widget_customization: updatedCustomization
                          })
                          .eq("id", eventId)
                          .select("widget_customization");

                        if (error) {
                          console.error("❌ Database error:", error);
                          console.error("❌ Error details:", {
                            code: error.code,
                            message: error.message,
                            details: error.details,
                            hint: error.hint
                          });
                          throw error;
                        }

                                                console.log("✅ Database update successful");
                        console.log("✅ Returned data:", data);
                        console.log("✅ Checkout mode in returned data:", (data?.[0]?.widget_customization as any)?.checkoutMode);
                        
                        // Verify the data was actually saved by fetching it back
                        const { data: verifyData, error: verifyError } = await supabase
                          .from("events")
                          .select("widget_customization")
                          .eq("id", eventId)
                          .single();
                        
                        if (verifyError) {
                          console.error("❌ Error verifying saved data:", verifyError);
                        } else {
                          console.log("✅ Verification - saved widget_customization:", verifyData.widget_customization);
                          console.log("✅ Verification - checkout mode:", (verifyData.widget_customization as any)?.checkoutMode);
                        }
                        // Update local state immediately to prevent it from being overwritten
                        setEventData(prev => prev ? ({
                          ...prev,
                          widget_customization: updatedCustomization as any
                        }) : null);
                        
                        // Also update the widgetCustomization state to keep it in sync
                        setWidgetCustomization(updatedCustomization);
                        
                        toast({
                          title: "Success",
                          description: `Checkout mode updated to ${value === 'onepage' ? 'One Page' : 'Multi-Step'}. Open your widget to see changes.`
                        });
                      } catch (error) {
                        console.error("Error updating checkout mode:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update checkout mode",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onepage">One Page Checkout</SelectItem>
                      <SelectItem value="multistep">Multi-Step Checkout</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Multi-step includes: ticket selection → add-ons → customer details → payment with order summary sidebar
                  </p>
                </div>
              </div>

              {/* Publish Event */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Publish Event</Label>
                  <p className="text-sm text-muted-foreground">
                    {eventData?.status === 'published' 
                      ? 'Event is published and accepting ticket sales' 
                      : 'Event is in draft mode - publish to start selling tickets'
                    }
                  </p>
                </div>
                <Button
                  variant={eventData?.status === 'published' ? "secondary" : "default"}
                  size="sm"
                  onClick={async () => {
                    if (eventData?.status === 'published') {
                      // Unpublish
                      const { error } = await supabase
                        .from("events")
                        .update({ status: 'draft' })
                        .eq("id", eventId);
                      
                      if (!error) {
                        setEventData(prev => prev ? ({ ...prev, status: 'draft' }) : null);
                        toast({
                          title: "Event unpublished",
                          description: "Event is now in draft mode"
                        });
                      }
                    } else {
                      // Check billing setup first
                      try {
                        const { data: billingData } = await supabase.rpc('check_billing_setup', {
                          p_organization_id: organizationId
                        });
                        
                        if (!billingData) {
                          toast({
                            title: "Billing Setup Required",
                            description: "Please set up billing and add a payment method before publishing events",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Publish
                        const { error } = await supabase
                          .from("events")
                          .update({ status: 'published' })
                          .eq("id", eventId);
                        
                        if (!error) {
                          setEventData(prev => prev ? ({ ...prev, status: 'published' }) : null);
                          toast({
                            title: "Event published!",
                            description: "Your event is now live and accepting ticket sales"
                          });
                        }
                      } catch (error) {
                        console.error('Error checking billing:', error);
                        toast({
                          title: "Error",
                          description: "Failed to verify billing setup",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                >
                  {eventData?.status === 'published' ? 'Unpublish' : 'Publish Event'}
                </Button>
              </div>

              {/* Payment Success URL */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="successUrl" className="text-base font-medium">Payment Success URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Custom URL to redirect customers after successful payment. Leave empty to use default.
                  </p>
                  <Input
                    id="successUrl"
                    type="url"
                    placeholder="https://yourwebsite.com/thank-you"
                    value={widgetCustomization.payment?.successUrl || ''}
                    onChange={(e) => {
                      updateWidgetCustomization(['payment', 'successUrl'], e.target.value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Perfect for embedded widgets - redirect customers back to your site after purchase
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Seat Map Designer Modal */}
      {showSeatMapDesigner && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col shadow-xl border">
          <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Seat Map Designer - {eventData?.name || 'Loading...'}
              </h2>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log("=== CLOSING SEAT MAP DESIGNER ===");
                  setShowSeatMapDesigner(false);
                }}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              {eventData ? (
                <SeatMapDesigner
                  eventId={eventId}
                  eventName={eventData.name}
                  onClose={() => {
                    console.log("=== CLOSING SEAT MAP DESIGNER ===");
                    setShowSeatMapDesigner(false);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading event data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCustomization;