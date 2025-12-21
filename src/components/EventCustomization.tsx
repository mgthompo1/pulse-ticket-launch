import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Layout, Mail, Ticket, Monitor, Save, MapPin, Users, Package, Settings, Plus, Trash2, HelpCircle, Cog, Eye, Smartphone, Tag, UsersRound, Heart, Share2, FileText, Calendar, Send, ShoppingCart, ClipboardList, Target, BarChart3, Link2, Unlink, Crown, Percent, UserPlus, User, CreditCard, AlertCircle } from "lucide-react";
import { ConditionalDisplay } from "@/types/widget";
import { SeatMapDesigner } from "@/components/SeatMapDesigner";
import AttendeeManagement from "@/components/AttendeeManagement";
import MerchandiseManager from "@/components/MerchandiseManager";
import TicketTypesManager from "@/components/TicketTypesManager";
import { EventLogoUploader } from "@/components/events/EventLogoUploader";
import { EmailTemplatePreview } from "@/components/EmailTemplatePreview";
import PromoCodesManager from "@/pages/PromoCodesManager";
import GroupDiscountsManager from "@/pages/GroupDiscountsManager";
import { VenueLocationPicker } from "@/components/VenueLocationPicker";
import { AbandonedCartSettings } from "@/components/AbandonedCartSettings";
import { PostEventSurveySettings } from "@/components/PostEventSurveySettings";
import { CheckoutTemplateBuilder, CheckoutTemplate } from "@/components/CheckoutTemplateBuilder";
import { EventInviteManager } from "@/components/EventInviteManager";
import { EventPlaybookSummary } from "@/components/EventPlaybookSummary";
import { WaitlistManager } from "@/components/WaitlistManager";
import { TicketTransferManager } from "@/components/TicketTransferManager";
import { RefundRequestManager } from "@/components/RefundRequestManager";
import { TicketUpgradeManager } from "@/components/TicketUpgradeManager";
import { VoucherManager } from "@/components/VoucherManager";
import { RecurringEventManager } from "@/components/RecurringEventManager";
import PaymentPlansManager from "@/components/PaymentPlansManager";

// Type definitions for better type safety
interface EmailBlock {
  type: string;
  id?: string;
  hidden?: boolean;
  title?: string;
  html?: string;
  [key: string]: unknown;
}

interface EmailCustomization {
  subject?: string;
  template?: {
    headerColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    accentColor?: string;
    borderColor?: string;
    fontFamily?: string;
  };
  blocks?: EmailBlock[];
}

import { EmailTemplateBuilder } from "@/components/EmailTemplateBuilder";
import { createDefaultTemplate, EmailTemplate } from "@/types/email-template";

interface EventCustomizationProps {
  eventId: string;
  onSave?: () => void;
  initialTab?: string;
  initialSubTab?: string;
}

const EventCustomization: React.FC<EventCustomizationProps> = ({ eventId, onSave, initialTab, initialSubTab }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "widget");
  const [attendeesSubTab, setAttendeesSubTab] = useState(initialSubTab || "registered");

  // Update tabs when initialTab/initialSubTab props change (from Playbooks navigation)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialSubTab) {
      setAttendeesSubTab(initialSubTab);
    }
  }, [initialTab, initialSubTab]);
  const [showSeatMapDesigner, setShowSeatMapDesigner] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [ticketTypesData, setTicketTypesData] = useState<{ id: string; name: string; price: number; quantity_available: number; quantity_sold: number }[]>([]);
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
    event_end_date: string | null;
    capacity: number;
    requires_approval: boolean | null;
    widget_customization?: Record<string, unknown>;
    ticket_customization?: Record<string, unknown>;
    email_customization?: Record<string, unknown>;
    ticket_delivery_method?: string;
    abandoned_cart_enabled?: boolean;
    abandoned_cart_delay_minutes?: number;
    abandoned_cart_email_subject?: string;
    abandoned_cart_email_content?: string | null;
    abandoned_cart_discount_enabled?: boolean;
    abandoned_cart_discount_code?: string | null;
    abandoned_cart_discount_percent?: number;
    pricing_type?: 'paid' | 'free' | 'donation';
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
      customFooterText: "",
      buttonText: "Get Tickets",
      buttonTextType: "default" as 'default' | 'register' | 'buy' | 'donate' | 'buynow' | 'rsvp' | 'custom'
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
    checkoutMode: "onepage" as 'onepage' | 'multistep' | 'beta',
    textCustomization: {
      // Event step
      eventDescriptionTitle: "Event description",
      // Tickets step
      ticketSelectionTitle: "Select Your Tickets",
      ticketSelectionSubtitle: "Choose your tickets and any additional items",
      // Details step
      primaryContactLabel: "Primary Contact Information",
      attendeeInfoTitle: "Attendee Information",
      attendeeInfoDescription: "Please provide the name and email for each ticket holder. This helps us identify attendees at check-in.",
      primaryTicketLabel: "(Primary Ticket Holder)",
      ticketLabelPrefix: "Ticket",
      // Ticket-specific labels
      ticketLabels: {}
    }
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
      
      const { data, error} = await supabase
        .from("events")
        .select("widget_customization, ticket_customization, email_customization, name, status, logo_url, venue, venue_address, venue_lat, venue_lng, venue_place_id, organization_id, description, event_date, event_end_date, capacity, requires_approval, ticket_delivery_method, donations_enabled, donation_title, donation_description, donation_suggested_amounts, abandoned_cart_enabled, abandoned_cart_delay_minutes, abandoned_cart_email_subject, abandoned_cart_email_content, abandoned_cart_discount_enabled, abandoned_cart_discount_code, abandoned_cart_discount_percent, pricing_type, membership_enabled, membership_signup_enabled, membership_discount_display, payment_plans_enabled")
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
        venue_lat: data.venue_lat,
        venue_lng: data.venue_lng,
        venue_place_id: data.venue_place_id,
        description: data.description,
        event_date: data.event_date,
        event_end_date: data.event_end_date,
        capacity: data.capacity,
        requires_approval: data.requires_approval,
        ticket_delivery_method: data.ticket_delivery_method || undefined,
        donations_enabled: data.donations_enabled || false,
        donation_title: data.donation_title,
        donation_description: data.donation_description,
        donation_suggested_amounts: data.donation_suggested_amounts,
        widget_customization: {
          ...(data.widget_customization as Record<string, unknown> || {}),
          // Ensure checkoutMode is preserved if it exists
          ...((data.widget_customization as Record<string, unknown>)?.checkoutMode ? {
            checkoutMode: (data.widget_customization as Record<string, unknown>).checkoutMode
          } : {})
        },
        ticket_customization: data.ticket_customization as Record<string, unknown>,
        email_customization: data.email_customization as Record<string, unknown>,
        abandoned_cart_enabled: data.abandoned_cart_enabled || false,
        abandoned_cart_delay_minutes: data.abandoned_cart_delay_minutes || 60,
        abandoned_cart_email_subject: data.abandoned_cart_email_subject || "You left something behind!",
        abandoned_cart_email_content: data.abandoned_cart_email_content,
        abandoned_cart_discount_enabled: data.abandoned_cart_discount_enabled || false,
        abandoned_cart_discount_code: data.abandoned_cart_discount_code,
        abandoned_cart_discount_percent: data.abandoned_cart_discount_percent || 10,
        pricing_type: data.pricing_type || 'paid',
        membership_enabled: data.membership_enabled || false,
        membership_signup_enabled: data.membership_signup_enabled || false,
        membership_discount_display: data.membership_discount_display !== false,
        payment_plans_enabled: data.payment_plans_enabled || false
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

      // Load ticket types for waitlist/upgrade managers
      try {
        const { data: ticketTypes } = await supabase
          .from("ticket_types")
          .select("id, name, price, quantity_available, quantity_sold")
          .eq("event_id", eventId)
          .order("sort_order", { ascending: true });

        if (ticketTypes) {
          setTicketTypesData(ticketTypes);
        }
      } catch (ttError) {
        console.warn("Could not load ticket types:", ttError);
      }

      if (data?.widget_customization) {
        // Use widget_customization from database as source of truth
        // Deep merge to preserve nested objects like textCustomization
        const dbCustomization = data.widget_customization as Record<string, unknown>;
        const newWidgetCustomization = {
          ...widgetCustomization,
          ...dbCustomization,
          // Ensure textCustomization is properly merged, not replaced
          textCustomization: {
            ...widgetCustomization.textCustomization,
            ...(dbCustomization.textCustomization as Record<string, unknown> || {})
          }
        };
        setWidgetCustomization(newWidgetCustomization as any);
      }
      if (data?.ticket_customization) {
        setTicketCustomization(data.ticket_customization as typeof ticketCustomization);
      }
      // Load blocks if present on event's email_customization
      const emailCustomization = data?.email_customization as EmailCustomization;
      const maybeBlocks = emailCustomization?.blocks;
      if (maybeBlocks && Array.isArray(maybeBlocks)) {
        setEmailBlocksTemplate({
          version: 1,
          subject: emailCustomization?.subject || "Your ticket confirmation",
          theme: {
            headerColor: emailCustomization?.template?.headerColor || "#1f2937",
            backgroundColor: emailCustomization?.template?.backgroundColor || "#ffffff",
            textColor: emailCustomization?.template?.textColor || "#374151",
            buttonColor: emailCustomization?.template?.buttonColor || "#1f2937",
            accentColor: emailCustomization?.template?.accentColor || "#f9fafb",
            borderColor: emailCustomization?.template?.borderColor || "#e5e7eb",
            fontFamily: emailCustomization?.template?.fontFamily || "Arial, sans-serif",
          },
          blocks: maybeBlocks as any, // Type assertion to handle missing src property on ImageBlock
        });
      }
      if (data?.email_customization) {
        const savedCustomization = data.email_customization as EmailCustomization;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Only re-run when eventId changes, not when callback reference changes

  // Helper: render HTML from current block template for test emails
  const renderBlocksHtml = useCallback(() => {
    const t = emailBlocksTemplate;
    const theme = t.theme;
    const parts: string[] = [];
    parts.push(`<div style="font-family:${theme.fontFamily || 'Arial, sans-serif'};max-width:600px;margin:0 auto;background:${theme.backgroundColor};border:1px solid ${theme.borderColor || '#e5e7eb'}">`);
    for (const b of t.blocks as EmailBlock[]) {
      if (b.hidden) continue;
      switch (b.type) {
        case 'header':
          parts.push(`<div style="background:${theme.headerColor};color:#fff;padding:20px"><h1 style="margin:0;text-align:center">${b.title || 'Thank you'}</h1></div>`);
          break;
        case 'text':
          parts.push(`<div style="padding:16px 20px;color:${theme.textColor}">${b.html || ''}</div>`);
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
          parts.push(`<div style="text-align:${(b as { align?: string }).align || 'center'};padding:20px">${(b as { src?: string }).src ? `<img src="${(b as { src?: string }).src}" style="max-width:100%"/>` : ''}</div>`);
          break;
        case 'footer':
          parts.push(`<div style="background:${theme.accentColor};padding:16px;text-align:center;border-top:1px solid ${theme.borderColor}"><small style="color:#999">${(b as { text?: string }).text || ''}</small></div>`);
          break;
        default:
          break;
      }
    }
    parts.push(`</div>`);
    return parts.join('');
  }, [emailBlocksTemplate, widgetCustomization]);

  const saveCustomizations = async () => {
    setLoading(true);
    try {
      console.log("🔍 Attempting to save customizations...");
      console.log("🔍 Event ID:", eventId);
      console.log("🔍 Current user:", user?.id);
      console.log("🔍 Widget customization to save:", widgetCustomization);
      console.log("🔍 Ticket customization to save:", ticketCustomization);
      console.log("🔍 Email customization to save:", emailCustomization);
      console.log("🎁 Donations data to save:", {
        donations_enabled: eventData?.donations_enabled,
        donation_title: eventData?.donation_title,
        donation_description: eventData?.donation_description,
        donation_suggested_amounts: eventData?.donation_suggested_amounts
      });
      
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
          email_customization: combinedEmailCustomization,
          donations_enabled: eventData?.donations_enabled || false,
          donation_title: eventData?.donation_title,
          donation_description: eventData?.donation_description,
          donation_suggested_amounts: eventData?.donation_suggested_amounts,
          pricing_type: eventData?.pricing_type || 'paid'
        })
        .eq("id", eventId)
        .select("id, widget_customization, ticket_customization, email_customization, donations_enabled, donation_title, donation_description, donation_suggested_amounts, pricing_type");

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
      // Deep clone to ensure React detects changes at all levels
      const updated = JSON.parse(JSON.stringify(prev || {}));
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

  // Handle event deletion with password verification
  const handleDeleteEvent = async () => {
    if (!deletePassword || !user?.email) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (authError) {
        toast({
          title: "Incorrect Password",
          description: "The password you entered is incorrect",
          variant: "destructive"
        });
        return;
      }

      // Password verified, proceed with deletion
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Event Deleted",
        description: "The event and all related data have been permanently deleted."
      });

      // Reset dialog state
      setShowDeleteDialog(false);
      setDeletePassword("");

      // Redirect to dashboard or events list
      if (onSave) onSave();

    } catch (error) {
      console.error("❌ Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Compact navigation bar */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex h-10 p-1 gap-0.5 bg-muted/40 border rounded-xl min-w-max">
            <TabsTrigger value="widget" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Widget</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Ticket className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <div className="w-px h-4 bg-border mx-0.5 self-center" />
            <TabsTrigger value="merchandise" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Package className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Merch</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Attendees</span>
            </TabsTrigger>
            <div className="w-px h-4 bg-border mx-0.5 self-center" />
            <TabsTrigger value="promo-codes" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Promos</span>
            </TabsTrigger>
            <TabsTrigger value="group-discounts" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <UsersRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="cart-recovery" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Recovery</span>
            </TabsTrigger>
            <TabsTrigger value="survey" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Survey</span>
            </TabsTrigger>
            <div className="w-px h-4 bg-border mx-0.5 self-center" />
            <TabsTrigger value="settings" className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Cog className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

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
                {/* Modern toggle pattern */}
                <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Palette className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Theme Customization</div>
                      <p className="text-xs text-muted-foreground">
                        Customize colors and fonts for your widget
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={widgetCustomization.theme.enabled}
                    onCheckedChange={(checked) =>
                      updateWidgetCustomization(['theme', 'enabled'], checked)
                    }
                  />
                </div>
                
                {widgetCustomization.theme.enabled && (
                  <>
                    {/* Text Colors */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Text Colors</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.headerTextColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'headerTextColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Headers</div>
                            <div className="text-xs text-muted-foreground">Titles & headings</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.bodyTextColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'bodyTextColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Body</div>
                            <div className="text-xs text-muted-foreground">Descriptions</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Button Colors */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Button Colors</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.primaryColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'primaryColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Button Fill</div>
                            <div className="text-xs text-muted-foreground">Primary actions</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.buttonTextColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'buttonTextColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Button Text</div>
                            <div className="text-xs text-muted-foreground">Label color</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Background Colors */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backgrounds</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.backgroundColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'backgroundColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Page</div>
                            <div className="text-xs text-muted-foreground">Main background</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.cardBackgroundColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'cardBackgroundColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Cards</div>
                            <div className="text-xs text-muted-foreground">Section backgrounds</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.inputBackgroundColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'inputBackgroundColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Inputs</div>
                            <div className="text-xs text-muted-foreground">Form fields</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={widgetCustomization.theme.secondaryColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'secondaryColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Accents</div>
                            <div className="text-xs text-muted-foreground">Borders & highlights</div>
                          </div>
                        </label>
                      </div>
                    </div>
                    {/* Typography */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typography</h4>
                      <Select
                        value={widgetCustomization.theme.fontFamily}
                        onValueChange={(value) => updateWidgetCustomization(['theme', 'fontFamily'], value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select font family" />
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

                    {/* Borders */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Borders</h4>
                      <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={widgetCustomization.theme.borderColor}
                            onChange={(e) => updateWidgetCustomization(['theme', 'borderColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            disabled={!widgetCustomization.theme.borderEnabled}
                          />
                          <div>
                            <div className="text-sm font-medium">Show Borders</div>
                            <div className="text-xs text-muted-foreground">Apply to cards and inputs</div>
                          </div>
                        </div>
                        <Switch
                          checked={widgetCustomization.theme.borderEnabled}
                          onCheckedChange={(checked) => updateWidgetCustomization(['theme', 'borderEnabled'], checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Custom Branding - Second column */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Custom Branding
                </CardTitle>
                <CardDescription>Add organization logo and custom text</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Show Organization Logo Toggle */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Layout className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Organization Logo</div>
                    <p className="text-xs text-muted-foreground">
                      Display your logo on the ticket widget
                    </p>
                  </div>
                </div>
                <Switch
                  checked={widgetCustomization.branding.showOrgLogo}
                  onCheckedChange={(checked) => updateWidgetCustomization(['branding', 'showOrgLogo'], checked)}
                />
              </div>

              {/* Header Text */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header Text</h4>
                <Input
                  value={widgetCustomization.branding.customHeaderText}
                  onChange={(e) => updateWidgetCustomization(['branding', 'customHeaderText'], e.target.value)}
                  placeholder="Welcome to our event!"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Optional message displayed above ticket selection</p>
              </div>

              {/* Button Text */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Button Text</h4>
                <Select
                  value={widgetCustomization.branding.buttonTextType}
                  onValueChange={(value) => {
                    updateWidgetCustomization(['branding', 'buttonTextType'], value);
                    const textMap: Record<string, string> = {
                      'default': 'Get Tickets',
                      'register': 'Register',
                      'buy': 'Buy Tickets',
                      'donate': 'Donate',
                      'buynow': 'Buy Now',
                      'rsvp': 'RSVP'
                    };
                    if (value !== 'custom') {
                      updateWidgetCustomization(['branding', 'buttonText'], textMap[value] || 'Get Tickets');
                    }
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Get Tickets (Default)</SelectItem>
                    <SelectItem value="register">Register</SelectItem>
                    <SelectItem value="buy">Buy Tickets</SelectItem>
                    <SelectItem value="donate">Donate</SelectItem>
                    <SelectItem value="buynow">Buy Now</SelectItem>
                    <SelectItem value="rsvp">RSVP</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {widgetCustomization.branding.buttonTextType === 'custom' && (
                  <Input
                    value={widgetCustomization.branding.buttonText}
                    onChange={(e) => updateWidgetCustomization(['branding', 'buttonText'], e.target.value)}
                    placeholder="Enter custom button text"
                    className="h-11"
                  />
                )}
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Checkout Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Checkout Templates
              </CardTitle>
              <CardDescription>
                Choose a preset template or create your own custom checkout flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Template Toggle */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Layout className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Use Custom Template</div>
                    <p className="text-xs text-muted-foreground">
                      Override presets with your own drag-and-drop layout
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(eventData?.widget_customization as any)?.useCustomTemplate || false}
                  onCheckedChange={async (checked) => {
                    try {
                      const currentCustomization = (eventData?.widget_customization as any) || {};
                      const updatedCustomization = {
                        ...currentCustomization,
                        useCustomTemplate: checked
                      };

                      const { error } = await supabase
                        .from("events")
                        .update({ widget_customization: updatedCustomization })
                        .eq("id", eventId);

                      if (error) throw error;

                      setEventData(prev => prev ? ({
                        ...prev,
                        widget_customization: updatedCustomization as any
                      }) : null);
                      setWidgetCustomization(updatedCustomization);

                      toast({
                        title: checked ? "Custom Template Enabled" : "Custom Template Disabled",
                        description: checked
                          ? "Your custom template is now active"
                          : "Using preset template"
                      });
                    } catch (error) {
                      console.error("Error updating template mode:", error);
                      toast({
                        title: "Error",
                        description: "Failed to update template mode",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>

              {/* Custom Template Builder Button */}
              {(eventData?.widget_customization as any)?.useCustomTemplate && (
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">
                        {(eventData?.widget_customization as any)?.customTemplate
                          ? "Edit Custom Template"
                          : "Create Custom Template"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(eventData?.widget_customization as any)?.customTemplate
                          ? `${((eventData?.widget_customization as any)?.customTemplate as CheckoutTemplate)?.pages?.length || 1} page(s) configured`
                          : "Drag and drop elements to build your checkout"}
                      </p>
                    </div>
                    <Button onClick={() => setShowTemplateBuilder(true)}>
                      <Layout className="h-4 w-4 mr-2" />
                      {(eventData?.widget_customization as any)?.customTemplate ? "Edit" : "Build"} Template
                    </Button>
                  </div>
                </div>
              )}

              {/* Customer Accounts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <User className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Customer Accounts</div>
                      <p className="text-xs text-muted-foreground">
                        Allow sign in/sign up for saved cards & member benefits
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={(eventData?.widget_customization as any)?.customerAccountsEnabled || false}
                    onCheckedChange={async (checked) => {
                      try {
                        const currentCustomization = (eventData?.widget_customization as any) || {};
                        const updatedCustomization = {
                          ...currentCustomization,
                          customerAccountsEnabled: checked
                        };

                        const { error } = await supabase
                          .from("events")
                          .update({ widget_customization: updatedCustomization })
                          .eq("id", eventId);

                        if (error) throw error;

                        setEventData(prev => prev ? ({
                          ...prev,
                          widget_customization: updatedCustomization as any
                        }) : null);
                        setWidgetCustomization(updatedCustomization);

                        toast({
                          title: checked ? "Customer Accounts Enabled" : "Customer Accounts Disabled",
                          description: checked
                            ? "Customers can now sign in for saved details and member pricing"
                            : "Checkout will proceed as guest only"
                        });
                      } catch (error) {
                        console.error("Error updating customer accounts setting:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update setting",
                          variant: "destructive"
                        });
                      }
                    }}
                  />
                </div>

                {/* Membership Sub-options - only show when Customer Accounts is enabled */}
                {(eventData?.widget_customization as any)?.customerAccountsEnabled && (
                  <div className="ml-6 pl-4 border-l-2 border-indigo-200 space-y-3">
                    {/* Member Pricing */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <div>
                          <div className="font-medium text-sm">Member Pricing</div>
                          <p className="text-xs text-muted-foreground">
                            Show special prices for members
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={(eventData as any)?.membership_enabled || false}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("events")
                              .update({ membership_enabled: checked })
                              .eq("id", eventId);
                            if (error) throw error;
                            setEventData(prev => prev ? ({ ...prev, membership_enabled: checked }) : null);
                            toast({
                              title: "Success",
                              description: checked ? "Member pricing enabled" : "Member pricing disabled"
                            });
                          } catch (error) {
                            console.error("Error updating membership setting:", error);
                            toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
                          }
                        }}
                      />
                    </div>

                    {/* Membership Signup */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium text-sm">Membership Signup</div>
                          <p className="text-xs text-muted-foreground">
                            Allow joining as member at checkout
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={(eventData as any)?.membership_signup_enabled || false}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("events")
                              .update({ membership_signup_enabled: checked })
                              .eq("id", eventId);
                            if (error) throw error;
                            setEventData(prev => prev ? ({ ...prev, membership_signup_enabled: checked }) : null);
                            toast({
                              title: "Success",
                              description: checked ? "Membership signup enabled" : "Membership signup disabled"
                            });
                          } catch (error) {
                            console.error("Error updating membership signup setting:", error);
                            toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
                          }
                        }}
                      />
                    </div>

                    {/* Payment Plans */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium text-sm">Payment Plans</div>
                          <p className="text-xs text-muted-foreground">
                            Allow deposits & installments at checkout
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={(eventData as any)?.payment_plans_enabled || false}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("events")
                              .update({ payment_plans_enabled: checked })
                              .eq("id", eventId);
                            if (error) throw error;
                            setEventData(prev => prev ? ({ ...prev, payment_plans_enabled: checked }) : null);
                            toast({
                              title: "Success",
                              description: checked ? "Payment plans enabled" : "Payment plans disabled"
                            });
                          } catch (error) {
                            console.error("Error updating payment plans setting:", error);
                            toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
                          }
                        }}
                      />
                    </div>

                    {/* Member Price Badges */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-500" />
                        <div>
                          <div className="font-medium text-sm">Price Badges</div>
                          <p className="text-xs text-muted-foreground">
                            Show "Member Price" labels
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={(eventData as any)?.membership_discount_display !== false}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("events")
                              .update({ membership_discount_display: checked })
                              .eq("id", eventId);
                            if (error) throw error;
                            setEventData(prev => prev ? ({ ...prev, membership_discount_display: checked }) : null);
                            toast({
                              title: "Success",
                              description: checked ? "Member price badges shown" : "Member price badges hidden"
                            });
                          } catch (error) {
                            console.error("Error updating badge setting:", error);
                            toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
                          }
                        }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Configure member-specific pricing in the Tickets tab.
                    </p>
                  </div>
                )}
              </div>

              {/* Preset Templates - only show when not using custom */}
              {!(eventData?.widget_customization as any)?.useCustomTemplate && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preset Templates</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'onepage', label: 'One Page', desc: 'Single page checkout' },
                      { value: 'multistep', label: 'Multi-Step', desc: 'Progressive steps' },
                      { value: 'modal', label: 'Modal', desc: 'Event page with modal checkout' },
                      { value: 'beta', label: 'Beta', desc: 'Mobile optimized' },
                    ].map((template) => (
                      <button
                        key={template.value}
                        onClick={async () => {
                          try {
                            const currentCustomization = (eventData?.widget_customization as any) || {};
                            const updatedCustomization = {
                              ...currentCustomization,
                              checkoutMode: template.value
                            };

                            const { error } = await supabase
                              .from("events")
                              .update({ widget_customization: updatedCustomization })
                              .eq("id", eventId);

                            if (error) throw error;

                            setEventData(prev => prev ? ({
                              ...prev,
                              widget_customization: updatedCustomization as any
                            }) : null);
                            setWidgetCustomization(updatedCustomization);

                            toast({
                              title: "Template Updated",
                              description: `Now using ${template.label} template`
                            });
                          } catch (error) {
                            console.error("Error updating template:", error);
                            toast({
                              title: "Error",
                              description: "Failed to update template",
                              variant: "destructive"
                            });
                          }
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                          (eventData?.widget_customization as any)?.checkoutMode === template.value
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        }`}
                      >
                        <div className="font-medium text-sm">{template.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{template.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Custom Questions</div>
                    <p className="text-xs text-muted-foreground">
                      Collect additional info during checkout
                    </p>
                  </div>
                </div>
                <Switch
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
                        type="button"
                        variant="default"
                        onClick={() => {
                          const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                          if (currentQuestions.length >= 10) {
                            toast({
                              title: "Maximum Questions Reached",
                              description: "You can only add up to 10 custom questions.",
                              variant: "destructive"
                            });
                            return;
                          }
                          const currentCount = currentQuestions.length;
                          const newQuestion = {
                            id: `question_${Date.now()}`,
                            label: `Question ${currentCount + 1}`,
                            type: "text",
                            required: false,
                            options: "",
                            category: "general"
                          };
                          updateWidgetCustomization(['customQuestions', 'questions'], [...currentQuestions, newQuestion]);
                          toast({
                            title: "Question Added",
                            description: `Question ${currentCount + 1} has been added. Don't forget to save your changes.`,
                          });
                        }}
                        size="sm"
                        disabled={(widgetCustomization.customQuestions?.questions || []).length >= 10}
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
                              className="min-h-[44px] min-w-[44px]"
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

                          {/* Category tag for aggregation */}
                          <div className="space-y-2">
                            <Label>Category (for reporting)</Label>
                            <Select
                              value={question.category || "general"}
                              onValueChange={(value) => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.map((q: any) =>
                                  q.id === question.id ? { ...q, category: value } : q
                                );
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="dietary">Dietary Requirements</SelectItem>
                                <SelectItem value="accessibility">Accessibility Needs</SelectItem>
                                <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                                <SelectItem value="medical">Medical Information</SelectItem>
                                <SelectItem value="transport">Transport/Parking</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Categorized questions can be summarized in event reports
                            </p>
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
                              checked={question.required || false}
                              onCheckedChange={(checked) => {
                                const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                const updatedQuestions = currentQuestions.map((q: any) =>
                                  q.id === question.id ? { ...q, required: checked === true } : q
                                );
                                updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                              }}
                            />
                            <Label htmlFor={`required-${question.id}`}>Required field</Label>
                          </div>

                          {/* Conditional Display Logic */}
                          {(() => {
                            const allQuestions = widgetCustomization.customQuestions?.questions || [];
                            const otherQuestions = allQuestions.filter((q: any) => q.id !== question.id);

                            if (otherQuestions.length === 0) return null;

                            const hasCondition = !!question.conditionalDisplay;

                            return (
                              <div className="border-t pt-4 mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {hasCondition ? (
                                      <Link2 className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Unlink className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Label className="text-sm font-medium">Conditional Display</Label>
                                  </div>
                                  <Switch
                                    checked={hasCondition}
                                    onCheckedChange={(checked) => {
                                      const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                      const updatedQuestions = currentQuestions.map((q: any) => {
                                        if (q.id !== question.id) return q;
                                        if (checked) {
                                          return {
                                            ...q,
                                            conditionalDisplay: {
                                              dependsOn: otherQuestions[0]?.id || '',
                                              showWhen: '',
                                              operator: 'equals'
                                            }
                                          };
                                        } else {
                                          const { conditionalDisplay, ...rest } = q;
                                          return rest;
                                        }
                                      });
                                      updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                    }}
                                  />
                                </div>

                                {hasCondition && question.conditionalDisplay && (
                                  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                                    <p className="text-xs text-muted-foreground">Show this question when...</p>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Question</Label>
                                      <Select
                                        value={question.conditionalDisplay.dependsOn}
                                        onValueChange={(value) => {
                                          const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                          const updatedQuestions = currentQuestions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, conditionalDisplay: { ...q.conditionalDisplay, dependsOn: value } }
                                              : q
                                          );
                                          updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                        }}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Select a question" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {otherQuestions.map((q: any) => (
                                            <SelectItem key={q.id} value={q.id}>
                                              {q.label || 'Untitled Question'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs">Condition</Label>
                                      <Select
                                        value={question.conditionalDisplay.operator || 'equals'}
                                        onValueChange={(value) => {
                                          const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                          const updatedQuestions = currentQuestions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, conditionalDisplay: { ...q.conditionalDisplay, operator: value } }
                                              : q
                                          );
                                          updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                        }}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="equals">equals</SelectItem>
                                          <SelectItem value="notEquals">does not equal</SelectItem>
                                          <SelectItem value="contains">contains</SelectItem>
                                          <SelectItem value="notContains">does not contain</SelectItem>
                                          <SelectItem value="isNotEmpty">is answered</SelectItem>
                                          <SelectItem value="isEmpty">is empty</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {question.conditionalDisplay.operator !== 'isEmpty' &&
                                     question.conditionalDisplay.operator !== 'isNotEmpty' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs">Value</Label>
                                        <Input
                                          value={
                                            Array.isArray(question.conditionalDisplay.showWhen)
                                              ? question.conditionalDisplay.showWhen.join(', ')
                                              : question.conditionalDisplay.showWhen || ''
                                          }
                                          onChange={(e) => {
                                            const currentQuestions = widgetCustomization.customQuestions?.questions || [];
                                            const updatedQuestions = currentQuestions.map((q: any) =>
                                              q.id === question.id
                                                ? { ...q, conditionalDisplay: { ...q.conditionalDisplay, showWhen: e.target.value } }
                                                : q
                                            );
                                            updateWidgetCustomization(['customQuestions', 'questions'], updatedQuestions);
                                          }}
                                          placeholder="Value to match..."
                                          className="h-9"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                          Separate multiple values with commas
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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

          {/* Donation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Donation Settings
              </CardTitle>
              <CardDescription>
                Enable and configure donation options for ticket purchasers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Donations Toggle */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <Heart className="h-4 w-4 text-pink-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Enable Donations</div>
                    <p className="text-xs text-muted-foreground">
                      Allow optional donations during checkout
                    </p>
                  </div>
                </div>
                <Switch
                  checked={eventData?.donations_enabled || false}
                  onCheckedChange={(checked) =>
                    setEventData(prev => ({ ...prev, donations_enabled: checked }))
                  }
                />
              </div>

              {eventData?.donations_enabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="donation-title">
                      Donation Title
                    </Label>
                    <Input
                      id="donation-title"
                      placeholder="Support Our Cause"
                      value={eventData?.donation_title || ''}
                      onChange={(e) =>
                        setEventData(prev => ({ ...prev, donation_title: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      This title will appear at the top of the donation section
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="donation-description">
                      Donation Message
                    </Label>
                    <Textarea
                      id="donation-description"
                      placeholder="Help support the arts! Your donation makes a difference..."
                      value={eventData?.donation_description || ''}
                      onChange={(e) =>
                        setEventData(prev => ({ ...prev, donation_description: e.target.value }))
                      }
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will appear at the donation step during checkout
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Suggested Donation Amounts</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {[5, 10, 25, 50, 100].map((amount, idx) => (
                        <Input
                          key={idx}
                          type="number"
                          placeholder={`$${amount}`}
                          defaultValue={amount}
                          className="text-center"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Patrons can also enter a custom amount
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget URL Section - Only show when event is published */}
          {eventData?.status === 'published' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Widget Sharing
                </CardTitle>
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
                      className="text-xs md:text-sm font-mono"
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

          {/* Text Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Text Customization
              </CardTitle>
              <CardDescription>
                Customize text labels throughout the checkout flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-2">
                {/* 1. Event Description Step */}
                <AccordionItem value="event-step" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold">1</span>
                      Event Description
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.eventDescriptionTitle ?? "Event description"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'eventDescriptionTitle'], e.target.value)}
                        placeholder="Event description"
                        className="h-11"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Ticket Selection Step */}
                <AccordionItem value="ticket-step" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 text-xs font-semibold">2</span>
                      Ticket Selection
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.ticketSelectionTitle ?? "Select Your Tickets"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'ticketSelectionTitle'], e.target.value)}
                        placeholder="Select Your Tickets"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Subtitle</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.ticketSelectionSubtitle ?? "Choose your tickets and any additional items"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'ticketSelectionSubtitle'], e.target.value)}
                        placeholder="Choose your tickets and any additional items"
                        className="h-11"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Contact Information Card */}
                <AccordionItem value="contact-step" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">3</span>
                      Contact Labels
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Ticket Label Prefix</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.ticketLabelPrefix ?? "Ticket"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'ticketLabelPrefix'], e.target.value)}
                        placeholder="Ticket"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Used as "Ticket 1", "Ticket 2", etc.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Primary Holder Label</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.primaryTicketLabel ?? "(Primary Ticket Holder)"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'primaryTicketLabel'], e.target.value)}
                        placeholder="(Primary Ticket Holder)"
                        className="h-11"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Attendee Details Step */}
                <AccordionItem value="attendee-step" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 text-xs font-semibold">4</span>
                      Attendee Details
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Primary Contact Label</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.primaryContactLabel ?? "Primary Contact Information"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'primaryContactLabel'], e.target.value)}
                        placeholder="Primary Contact Information"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Section Title</Label>
                      <Input
                        value={widgetCustomization.textCustomization?.attendeeInfoTitle ?? "Attendee Information"}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'attendeeInfoTitle'], e.target.value)}
                        placeholder="Attendee Information"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Section Description</Label>
                      <Textarea
                        value={widgetCustomization.textCustomization?.attendeeInfoDescription ?? "Please provide the name and email for each ticket holder. This helps us identify attendees at check-in."}
                        onChange={(e) => updateWidgetCustomization(['textCustomization', 'attendeeInfoDescription'], e.target.value)}
                        placeholder="Please provide the name and email for each ticket holder..."
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Custom Ticket Labels */}
                <AccordionItem value="custom-labels" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 text-xs font-semibold">5</span>
                      Custom Ticket Labels
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Override default labels for special use cases (e.g., "Parent", "Child")
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">Ticket {index + 1}</span>
                          <Input
                            value={(widgetCustomization.textCustomization?.ticketLabels as Record<number, string>)?.[index] || ''}
                            onChange={(e) => {
                              const newLabels = { ...(widgetCustomization.textCustomization?.ticketLabels || {}) };
                              if (e.target.value.trim()) {
                                newLabels[index] = e.target.value;
                              } else {
                                delete newLabels[index];
                              }
                              updateWidgetCustomization(['textCustomization', 'ticketLabels'], newLabels);
                            }}
                            placeholder={`e.g., ${index === 0 ? 'Parent' : 'Child'}`}
                            className="h-10 flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Seat Map Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Seat Map
              </CardTitle>
              <CardDescription>
                Configure seating options for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable/Disable Seat Maps */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MapPin className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">Enable Seat Selection</span>
                    <p className="text-xs text-muted-foreground">
                      Let guests select specific seats
                    </p>
                  </div>
                </div>
                <Switch
                  checked={widgetCustomization.seatMaps?.enabled || false}
                  onCheckedChange={(checked) => updateWidgetCustomization(['seatMaps', 'enabled'], checked)}
                />
              </div>

              {/* Seat Map Designer - Only show when enabled */}
              {widgetCustomization.seatMaps?.enabled && (
                <Button
                  onClick={() => setShowSeatMapDesigner(true)}
                  className="w-full"
                  variant="outline"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Seat Map Designer
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Widget Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Widget Preview
              </CardTitle>
              <CardDescription>
                Preview how your ticket widget will look to customers. This shows all customizations including colors, fonts, and branding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Desktop View
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile View
                </Button>
              </div>

              {/* Desktop Preview */}
              {previewMode === 'desktop' && (
                <div className="border rounded-lg overflow-hidden bg-background" style={{ height: "800px" }}>
                  <iframe
                    src={`/widget/${eventId}`}
                    className="w-full h-full"
                    title="Desktop Widget Preview"
                    style={{ border: "none" }}
                  />
                </div>
              )}

              {/* Mobile Preview */}
              {previewMode === 'mobile' && (
                <div className="flex justify-center py-4">
                  <div
                    className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl"
                    style={{ width: "375px", height: "812px" }}
                  >
                    {/* Phone notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>

                    {/* Phone screen */}
                    <div className="relative h-full w-full bg-background rounded-[2.5rem] overflow-hidden">
                      <iframe
                        src={`/widget/${eventId}`}
                        className="w-full h-full"
                        title="Mobile Widget Preview"
                        style={{ border: "none" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                <span>Changes to widget customization may take a moment to appear in the preview. Refresh the page if needed.</span>
              </div>
            </CardContent>
          </Card>

          {/* Waitlist Management - shown when tickets sell out */}
          <WaitlistManager
            eventId={eventId}
            ticketTypes={ticketTypesData}
          />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Ticket Types & Pricing Management */}
          <TicketTypesManager
            eventId={eventId}
            organizationId={organizationId}
            membershipEnabled={(eventData?.widget_customization as any)?.customerAccountsEnabled && (eventData as any)?.membership_enabled}
            paymentPlansEnabled={(eventData as any)?.payment_plans_enabled}
          />
          
          {/* Ticket Design Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Ticket Design & Appearance
              </CardTitle>
              <CardDescription>Customize how your tickets look when sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Palette className="h-4 w-4" />
                      Ticket Design
                    </CardTitle>
                    <CardDescription>Customize ticket appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Template Selection */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Template Style</h4>
                      <Select
                        value={ticketCustomization.design.template}
                        onValueChange={(value) => updateTicketCustomization(['design', 'template'], value)}
                      >
                        <SelectTrigger className="h-11">
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

                    {/* Colors */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={ticketCustomization.design.backgroundColor}
                            onChange={(e) => updateTicketCustomization(['design', 'backgroundColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Background</div>
                            <div className="text-xs text-muted-foreground">Ticket fill</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="color"
                            value={ticketCustomization.design.textColor}
                            onChange={(e) => updateTicketCustomization(['design', 'textColor'], e.target.value)}
                            className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium">Text</div>
                            <div className="text-xs text-muted-foreground">Labels & info</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Layout Options */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">QR Code Position</h4>
                      <Select
                        value={ticketCustomization.design.qrCodePosition}
                        onValueChange={(value) => updateTicketCustomization(['design', 'qrCodePosition'], value)}
                      >
                        <SelectTrigger className="h-11">
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

                    {/* Typography */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typography</h4>
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
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Ticket Content
                    </CardTitle>
                    <CardDescription>Choose what information to include</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Show Logo Toggle */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Layout className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">Logo</div>
                          <p className="text-xs text-muted-foreground">Display branding on ticket</p>
                        </div>
                      </div>
                      <Switch
                        checked={ticketCustomization.content.showLogo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showLogo'], checked)}
                      />
                    </div>

                    {ticketCustomization.content.showLogo && (
                      <div className="space-y-3 ml-4 pl-4 border-l-2 border-border">
                        <Select
                          value={ticketCustomization.content.logoSource || 'event'}
                          onValueChange={(value) => updateTicketCustomization(['content', 'logoSource'], value)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="event">Use Event Logo</SelectItem>
                            <SelectItem value="organization">Use Organization Logo</SelectItem>
                            <SelectItem value="custom">Custom Ticket Logo</SelectItem>
                          </SelectContent>
                        </Select>

                        {ticketCustomization.content.logoSource === 'event' && (
                          <div className="space-y-3">
                            <EventLogoUploader
                              eventId={eventId}
                               currentLogoUrl={currentLogoUrl || undefined}
                              onLogoChange={(logoUrl) => {
                                setCurrentLogoUrl(logoUrl);
                                loadCustomizations();
                              }}
                            />
                            {!currentLogoUrl && (
                              <p className="text-xs text-muted-foreground">
                                Upload an event logo to display on tickets
                              </p>
                            )}
                          </div>
                        )}

                        {ticketCustomization.content.logoSource === 'custom' && (
                          <Input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={ticketCustomization.content.customLogoUrl || ''}
                            onChange={(e) => updateTicketCustomization(['content', 'customLogoUrl'], e.target.value)}
                          />
                        )}
                      </div>
                    )}

                    {/* Show QR Code Toggle */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Ticket className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">QR Code</div>
                          <p className="text-xs text-muted-foreground">Scannable entry code</p>
                        </div>
                      </div>
                      <Switch
                        checked={ticketCustomization.content.showQrCode}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showQrCode'], checked)}
                      />
                    </div>

                    {/* Show Event Details Toggle */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Settings className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">Event Details</div>
                          <p className="text-xs text-muted-foreground">Date, time, and info</p>
                        </div>
                      </div>
                      <Switch
                        checked={ticketCustomization.content.showEventDetails}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showEventDetails'], checked)}
                      />
                    </div>

                    {/* Show Venue Info Toggle */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <MapPin className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">Venue Info</div>
                          <p className="text-xs text-muted-foreground">Location and address</p>
                        </div>
                      </div>
                      <Switch
                        checked={ticketCustomization.content.showVenueInfo}
                        onCheckedChange={(checked) => updateTicketCustomization(['content', 'showVenueInfo'], checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Transfers */}
          <TicketTransferManager eventId={eventId} />

          {/* Ticket Upgrades */}
          <TicketUpgradeManager
            eventId={eventId}
            ticketTypes={ticketTypesData}
          />

          {/* Refund Requests */}
          <RefundRequestManager eventId={eventId} />
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
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Colors & Style
                  </CardTitle>
                  <CardDescription>Customize the visual appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Custom Colors Toggle */}
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Palette className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Custom Colors</div>
                        <p className="text-xs text-muted-foreground">Override theme with custom values</p>
                      </div>
                    </div>
                    <Switch
                      checked={emailCustomization.useCustomColors}
                      onCheckedChange={(checked) => updateEmailCustomization(['useCustomColors'], checked)}
                    />
                  </div>

                  {/* Color Controls - Only show if custom colors enabled */}
                  {emailCustomization.useCustomColors && (
                    <div className="space-y-4">
                      {/* Header & Background Colors */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Colors</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.headerColor}
                              onChange={(e) => updateEmailCustomization(['template', 'headerColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Header</div>
                              <div className="text-xs text-muted-foreground">Top banner</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.buttonColor}
                              onChange={(e) => updateEmailCustomization(['template', 'buttonColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Button</div>
                              <div className="text-xs text-muted-foreground">CTA buttons</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Text & Background Colors */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backgrounds</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.backgroundColor}
                              onChange={(e) => updateEmailCustomization(['template', 'backgroundColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Background</div>
                              <div className="text-xs text-muted-foreground">Email body</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.accentColor}
                              onChange={(e) => updateEmailCustomization(['template', 'accentColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Accent</div>
                              <div className="text-xs text-muted-foreground">Highlights</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Text & Border Colors */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Text & Borders</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.textColor}
                              onChange={(e) => updateEmailCustomization(['template', 'textColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Text</div>
                              <div className="text-xs text-muted-foreground">Body copy</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                            <input
                              type="color"
                              value={emailCustomization.template.borderColor}
                              onChange={(e) => updateEmailCustomization(['template', 'borderColor'], e.target.value)}
                              className="w-8 h-8 rounded-md border-2 border-muted cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-medium">Border</div>
                              <div className="text-xs text-muted-foreground">Dividers</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Typography */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typography</h4>
                        <Select value={emailCustomization.template.fontFamily} onValueChange={(value) => updateEmailCustomization(['template', 'fontFamily'], value)}>
                          <SelectTrigger className="h-11">
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
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Branding & Layout
                  </CardTitle>
                  <CardDescription>Control logo placement and layout options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Show Logo Toggle */}
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Layout className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Show Logo</div>
                        <p className="text-xs text-muted-foreground">Display branding in emails</p>
                      </div>
                    </div>
                    <Switch
                      checked={emailCustomization.branding.showLogo}
                      onCheckedChange={(checked) => updateEmailCustomization(['branding', 'showLogo'], checked)}
                    />
                  </div>

                  {emailCustomization.branding.showLogo && (
                    <div className="space-y-4 ml-4 pl-4 border-l-2 border-border">
                      {/* Logo Settings */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Logo Settings</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={emailCustomization.branding.logoPosition} onValueChange={(value) => updateEmailCustomization(['branding', 'logoPosition'], value)}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">Header</SelectItem>
                              <SelectItem value="content">Content Area</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={emailCustomization.branding.logoSize} onValueChange={(value) => updateEmailCustomization(['branding', 'logoSize'], value)}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Logo Source */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Logo Source</h4>
                        <Select value={emailCustomization.branding.logoSource || 'event'} onValueChange={(value) => updateEmailCustomization(['branding', 'logoSource'], value)}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="event">Event Logo</SelectItem>
                            <SelectItem value="organization">Organization Logo</SelectItem>
                            <SelectItem value="custom">Custom URL</SelectItem>
                          </SelectContent>
                        </Select>

                        {emailCustomization.branding.logoSource === 'custom' && (
                          <Input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={emailCustomization.branding.customLogoUrl || ''}
                            onChange={(e) => updateEmailCustomization(['branding', 'customLogoUrl'], e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Header Style */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header Style</h4>
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
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Organiser Notifications
                  </CardTitle>
                  <CardDescription>Get notified when tickets are sold</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Mail className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Sale Notifications</div>
                        <p className="text-xs text-muted-foreground">Email alerts for each ticket sale</p>
                      </div>
                    </div>
                    <Switch
                      checked={emailCustomization.notifications?.organiserNotifications || false}
                      onCheckedChange={(checked) => updateEmailCustomization(['notifications', 'organiserNotifications'], checked)}
                    />
                  </div>

                  {emailCustomization.notifications?.organiserNotifications && (
                    <div className="space-y-3 ml-4 pl-4 border-l-2 border-border">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notification Email</h4>
                      <Input
                        type="email"
                        value={emailCustomization.notifications?.organiserEmail || ""}
                        onChange={(e) => updateEmailCustomization(['notifications', 'organiserEmail'], e.target.value)}
                        placeholder="Enter email to receive notifications"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Receive ticket details and customer info for each sale
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Email Preview */}
            <div className="hidden lg:block lg:sticky lg:top-6 max-h-screen overflow-y-auto">
              <EmailTemplatePreview
                emailCustomization={emailCustomization}
                blocksTemplate={emailBlocksTemplate}
                eventDetails={{
                  name: eventData?.name || "Sample Event Name",
                  venue: eventData?.venue || "Sample Venue",
                  event_date: eventData?.event_date || new Date().toISOString(),
                  event_end_date: eventData?.event_end_date || null,
                  logo_url: eventData?.logo_url || currentLogoUrl || undefined
                }}
                organizationDetails={{
                  name: organizationData?.name || "Your Organization",
                  logo_url: organizationData?.logo_url || undefined
                }}
                ticketDeliveryMethod={eventData?.ticket_delivery_method}
              />
              {/* Send Test Email */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Send Test Email
                  </CardTitle>
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
          <Tabs value={attendeesSubTab} onValueChange={setAttendeesSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="registered" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Registered
              </TabsTrigger>
              <TabsTrigger value="invite-list" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Guest List
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registered">
              <AttendeeManagement eventId={eventId} />
            </TabsContent>

            <TabsContent value="invite-list">
              <EventInviteManager
                eventId={eventId}
                organizationId={organizationId}
              />
            </TabsContent>

            <TabsContent value="summary">
              <EventPlaybookSummary
                eventId={eventId}
                organizationId={organizationId}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Two-column grid for smaller cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Event Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Event Details
                </CardTitle>
                <CardDescription>Basic event information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Event Name *</label>
                  <Input
                    value={eventData?.name || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, name: e.target.value } : null);
                    }}
                    placeholder="Enter event name"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea
                    value={eventData?.description || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, description: e.target.value } : null);
                    }}
                    placeholder="Describe your event..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    value={eventData?.capacity || ""}
                    onChange={(e) => {
                      setEventData(prev => prev ? { ...prev, capacity: parseInt(e.target.value) || 0 } : null);
                    }}
                    placeholder="Max attendees"
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date & Venue Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date & Venue
                </CardTitle>
                <CardDescription>When and where</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <DateTimePicker
                    id="event-date"
                    label="Start *"
                    value={eventData?.event_date || null}
                    onChange={(date) => {
                      setEventData(prev => prev ? { ...prev, event_date: date } : null);
                    }}
                    placeholder="Start"
                  />
                  <DateTimePicker
                    id="event-end-date"
                    label="End"
                    value={eventData?.event_end_date || null}
                    onChange={(date) => {
                      setEventData(prev => prev ? { ...prev, event_end_date: date } : null);
                    }}
                    placeholder="End (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Venue / Location</label>
                  <VenueLocationPicker
                    value={{
                      address: eventData?.venue || "",
                      lat: eventData?.venue_lat,
                      lng: eventData?.venue_lng,
                      placeId: eventData?.venue_place_id
                    }}
                    onChange={(location) => {
                      setEventData(prev => prev ? {
                        ...prev,
                        venue: location.address,
                        venue_lat: location.lat,
                        venue_lng: location.lng,
                        venue_place_id: location.placeId
                      } : null);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

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
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Event Settings
              </CardTitle>
              <CardDescription>Configure event publication and general settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Status */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${eventData?.status === 'published' ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                    <Eye className={`h-4 w-4 ${eventData?.status === 'published' ? 'text-green-500' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Event Status</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${eventData?.status === 'published' ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}>
                        {eventData?.status === 'published' ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {eventData?.status === 'published'
                        ? 'Your event is live and accepting sales'
                        : 'Not visible to the public'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={eventData?.status === 'published'}
                  onCheckedChange={async (checked) => {
                    try {
                      // If publishing, check billing setup first (skip for free events)
                      if (checked && eventData?.pricing_type !== 'free') {
                        const { data: billingData } = await supabase.rpc('check_billing_setup', {
                          p_organization_id: organizationId
                        });

                        if (!billingData) {
                          toast({
                            title: "Billing Setup Required",
                            description: "Please set up billing and add a payment method before publishing paid events",
                            variant: "destructive"
                          });
                          return;
                        }
                      }

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

              {/* Pricing Type */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${eventData?.pricing_type === 'free' ? 'bg-green-500/10' : eventData?.pricing_type === 'donation' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                    <Ticket className={`h-4 w-4 ${eventData?.pricing_type === 'free' ? 'text-green-500' : eventData?.pricing_type === 'donation' ? 'text-purple-500' : 'text-blue-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Pricing Type</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        eventData?.pricing_type === 'free'
                          ? 'bg-green-500/20 text-green-600'
                          : eventData?.pricing_type === 'donation'
                          ? 'bg-purple-500/20 text-purple-600'
                          : 'bg-blue-500/20 text-blue-600'
                      }`}>
                        {eventData?.pricing_type === 'free' ? 'Free' : eventData?.pricing_type === 'donation' ? 'Donation' : 'Paid'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {eventData?.pricing_type === 'free'
                        ? 'Free registration - no payment required'
                        : eventData?.pricing_type === 'donation'
                        ? 'Pay what you want / donation-based'
                        : 'Standard paid ticketing'
                      }
                    </p>
                  </div>
                </div>
                <Select
                  value={eventData?.pricing_type || 'paid'}
                  onValueChange={(value: 'paid' | 'free' | 'donation') => {
                    setEventData(prev => prev ? { ...prev, pricing_type: value } : null);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FREEMIUM: Info banner for free events */}
              {eventData?.pricing_type === 'free' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 text-lg">⚡</span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-800">Free Event Limitations</p>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                        <li>Maximum 50 registrations per event</li>
                        <li>Modal checkout template only</li>
                        <li>No custom branding or promo codes</li>
                        <li>"Powered by TicketFlo" badge displayed</li>
                      </ul>
                      <p className="text-xs text-amber-600 mt-2">
                        Switch to Paid to unlock unlimited registrations and full customization.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Event URL and Widget Embedding */}
              {eventData?.status === 'published' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sharing & Embedding</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/widget/${eventId}`}
                        readOnly
                        className="flex-1 h-11 text-sm"
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

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Embed Code</label>
                      <Textarea
                        value={`<iframe src="${window.location.origin}/widget/${eventId}" width="100%" height="600" frameborder="0"></iframe>`}
                        readOnly
                        rows={2}
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
                </div>
              )}

              {/* Ticket Delivery Method */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Delivery</h4>
                <div className="p-4 rounded-lg border bg-background">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Delivery Method</div>
                      <p className="text-xs text-muted-foreground">How tickets are sent to customers</p>
                    </div>
                  </div>
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
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr_ticket">Digital QR Code Tickets</SelectItem>
                      <SelectItem value="confirmation_email">Email Confirmation Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Publish Event */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Eye className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Publish Event</div>
                    <p className="text-xs text-muted-foreground">
                      {eventData?.status === 'published'
                        ? 'Event is live and accepting sales'
                        : 'Publish to start selling tickets'
                      }
                    </p>
                  </div>
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
              <div className="p-4 border rounded-lg bg-background space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Monitor className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Payment Success URL</div>
                    <p className="text-xs text-muted-foreground">
                      Redirect customers after successful payment
                    </p>
                  </div>
                </div>
                <Input
                  id="successUrl"
                  type="url"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={widgetCustomization.payment?.successUrl || ''}
                  onChange={(e) => {
                    updateWidgetCustomization(['payment', 'successUrl'], e.target.value);
                  }}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Perfect for embedded widgets - redirect customers back to your site
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Plans
              </CardTitle>
              <CardDescription>Allow customers to pay in installments or with deposits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requirement notice if Customer Accounts is not enabled */}
              {!(eventData?.widget_customization as any)?.customerAccountsEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Customer Accounts Required</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Payment plans require Customer Accounts to be enabled in the Widget tab.
                      This allows customers to save their payment method for scheduled payments.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Enable Payment Plans</div>
                    <p className="text-xs text-muted-foreground">
                      Allow customers to split their purchase into multiple payments
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(eventData as any)?.payment_plans_enabled || false}
                  disabled={!(eventData?.widget_customization as any)?.customerAccountsEnabled}
                  onCheckedChange={async (checked) => {
                    try {
                      const { error } = await supabase
                        .from("events")
                        .update({ payment_plans_enabled: checked })
                        .eq("id", eventId);
                      if (error) throw error;
                      setEventData(prev => prev ? ({ ...prev, payment_plans_enabled: checked }) : null);
                      toast({
                        title: "Success",
                        description: checked ? "Payment plans enabled" : "Payment plans disabled"
                      });
                    } catch (error) {
                      console.error("Error updating payment plans setting:", error);
                      toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
                    }
                  }}
                />
              </div>

              {(eventData as any)?.payment_plans_enabled && organizationId && (
                <PaymentPlansManager
                  organizationId={organizationId}
                  eventId={eventId}
                />
              )}
            </CardContent>
          </Card>

          {/* Recurring Events / Event Series */}
          {organizationId && (
            <RecurringEventManager
              organizationId={organizationId}
              eventId={eventId}
            />
          )}

          {/* Delete Event Section */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete this event and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full md:w-auto"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo-codes" className="space-y-6">
          <PromoCodesManager eventId={eventId} />

          {/* Vouchers & Credits */}
          {organizationId && (
            <VoucherManager
              organizationId={organizationId}
              eventId={eventId}
            />
          )}
        </TabsContent>

        <TabsContent value="group-discounts" className="space-y-6">
          <GroupDiscountsManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="cart-recovery" className="space-y-6">
          <AbandonedCartSettings
            eventId={eventId}
            enabled={eventData?.abandoned_cart_enabled || false}
            delayMinutes={eventData?.abandoned_cart_delay_minutes || 60}
            emailSubject={eventData?.abandoned_cart_email_subject || "You left something behind!"}
            emailContent={eventData?.abandoned_cart_email_content || null}
            discountEnabled={eventData?.abandoned_cart_discount_enabled || false}
            discountCode={eventData?.abandoned_cart_discount_code || null}
            discountPercent={eventData?.abandoned_cart_discount_percent || 10}
            onSave={async (settings) => {
              try {
                const { error } = await supabase
                  .from("events")
                  .update({
                    abandoned_cart_enabled: settings.abandoned_cart_enabled,
                    abandoned_cart_delay_minutes: settings.abandoned_cart_delay_minutes,
                    abandoned_cart_email_subject: settings.abandoned_cart_email_subject,
                    abandoned_cart_email_content: settings.abandoned_cart_email_content,
                    abandoned_cart_discount_enabled: settings.abandoned_cart_discount_enabled,
                    abandoned_cart_discount_code: settings.abandoned_cart_discount_code,
                    abandoned_cart_discount_percent: settings.abandoned_cart_discount_percent,
                  })
                  .eq("id", eventId);

                if (error) throw error;

                setEventData((prev) => prev ? {
                  ...prev,
                  ...settings
                } : null);
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to save cart recovery settings",
                  variant: "destructive",
                });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="survey" className="space-y-6">
          <PostEventSurveySettings
            eventId={eventId}
            organizationId={organizationId}
          />
        </TabsContent>

      </Tabs>
      
      {/* Seat Map Designer Modal */}
      {showSeatMapDesigner && eventData && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-7xl w-full h-[90vh] overflow-hidden shadow-xl border">
            <SeatMapDesigner
              eventId={eventId}
              eventName={eventData.name}
              onClose={() => setShowSeatMapDesigner(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog with Password */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Event</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the event and all associated data including tickets, orders, and attendees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Your account password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deletePassword) {
                    handleDeleteEvent();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={!deletePassword || loading}
            >
              {loading ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Template Builder Modal */}
      <CheckoutTemplateBuilder
        open={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
        initialTemplate={(eventData?.widget_customization as any)?.customTemplate || null}
        onSave={async (template) => {
          try {
            const currentCustomization = (eventData?.widget_customization as any) || {};
            const updatedCustomization = {
              ...currentCustomization,
              customTemplate: template,
              useCustomTemplate: true
            };

            const { error } = await supabase
              .from("events")
              .update({ widget_customization: updatedCustomization })
              .eq("id", eventId);

            if (error) throw error;

            setEventData(prev => prev ? ({
              ...prev,
              widget_customization: updatedCustomization as any
            }) : null);
            setWidgetCustomization(updatedCustomization);
          } catch (error) {
            console.error("Error saving template:", error);
            toast({
              title: "Error",
              description: "Failed to save custom template",
              variant: "destructive"
            });
          }
        }}
      />
    </div>
  );
};

export default EventCustomization;