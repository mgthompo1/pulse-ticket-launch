import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  X, 
  Palette, 
  Layout, 
  Mail, 
  Ticket, 
  MapPin, 
  Users, 
  Package, 
  Settings, 
  BarChart3,
  CreditCard,
  TrendingUp,
  Link,
  Shield,
  Calendar,
  BookOpen,
  Lightbulb,
  Info
} from "lucide-react";

interface DashboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardHelp: React.FC<DashboardHelpProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!isOpen) return null;

  const helpSections = {
    overview: {
      title: "Dashboard Overview",
      description: "Your central command center for managing events, tracking performance, and configuring your organization.",
      items: [
        {
          title: "Total Events",
          description: "Shows the number of active events you have created and are currently managing.",
          icon: Calendar
        },
        {
          title: "Tickets Sold",
          description: "Total number of tickets sold across all your events, including both completed and pending orders.",
          icon: Ticket
        },
        {
          title: "Revenue",
          description: "Total revenue generated from ticket sales, calculated before platform fees and processing costs.",
          icon: BarChart3
        },
        {
          title: "Platform Fees",
          description: "Estimated fees that will be deducted from your revenue based on your current pricing plan.",
          icon: Users
        }
      ]
    },
    events: {
      title: "Events Management",
      description: "Create, manage, and monitor all your events from one central location.",
      items: [
        {
          title: "Create New Event",
          description: "Start building a new event by providing basic information like name, date, venue, and capacity.",
          icon: Calendar
        },
        {
          title: "Event Status",
          description: "Track whether events are in draft, published, or completed status. Only published events can sell tickets.",
          icon: Settings
        },
        {
          title: "Quick Actions",
          description: "Access common tasks like editing, duplicating, or deleting events directly from the events list.",
          icon: Layout
        }
      ]
    },
    "event-details": {
      title: "Event Customization",
      description: "Comprehensive customization options to make your event ticketing experience unique and branded.",
      items: [
        {
          title: "Widget Customization",
          description: "Customize how your public ticket widget appears to customers.",
          icon: Layout
        },
        {
          title: "Seat Maps",
          description: "Design custom seating layouts and enable seat selection for your events.",
          icon: MapPin
        },
        {
          title: "Ticket Design",
          description: "Customize how your tickets look when sent to customers, including templates and branding.",
          icon: Ticket
        },
        {
          title: "Email Templates",
          description: "Personalize confirmation emails, reminders, and other communications sent to customers.",
          icon: Mail
        },
        {
          title: "Merchandise",
          description: "Add merchandise items like t-shirts, programs, or other items to your ticket sales.",
          icon: Package
        },
        {
          title: "Attendee Management",
          description: "Manage guest lists, check-ins, and attendee information for your events.",
          icon: Users
        }
      ]
    },
    analytics: {
      title: "Analytics & Reporting",
      description: "Comprehensive insights into your event performance, ticket sales, and customer behavior.",
      items: [
        {
          title: "Sales Analytics",
          description: "Track ticket sales over time, identify peak selling periods, and monitor conversion rates.",
          icon: TrendingUp
        },
        {
          title: "Event Performance",
          description: "Compare performance across different events, ticket types, and marketing campaigns.",
          icon: BarChart3
        },
        {
          title: "Customer Insights",
          description: "Understand your audience demographics, purchasing patterns, and engagement metrics.",
          icon: Users
        },
        {
          title: "Revenue Tracking",
          description: "Monitor revenue trends, track refunds, and analyze profitability by event and ticket type.",
          icon: CreditCard
        }
      ]
    },
    payments: {
      title: "Payment Configuration",
      description: "Set up and manage payment processing, including Stripe, Windcave, and other payment methods.",
      items: [
        {
          title: "Payment Providers",
          description: "Configure Stripe, Windcave, or other payment gateways to accept customer payments.",
          icon: CreditCard
        },
        {
          title: "Processing Fees",
          description: "Set up credit card processing fees and understand how they affect your pricing.",
          icon: Settings
        },
        {
          title: "Payment Security",
          description: "Ensure PCI compliance and secure payment processing for your customers.",
          icon: Shield
        }
      ]
    },
    marketing: {
      title: "Marketing Tools",
      description: "Promote your events and engage with your audience through various marketing channels.",
      items: [
        {
          title: "Email Marketing",
          description: "Send promotional emails, newsletters, and updates to your subscriber list.",
          icon: Mail
        },
        {
          title: "Social Media",
          description: "Generate shareable content and integrate with social media platforms.",
          icon: Link
        },
        {
          title: "Promotional Codes",
          description: "Create discount codes and special offers to boost ticket sales.",
          icon: Ticket
        }
      ]
    },
    billing: {
      title: "Billing & Subscriptions",
      description: "Manage your subscription plan, billing information, and usage tracking.",
      items: [
        {
          title: "Subscription Plans",
          description: "View and upgrade your current plan based on your event volume and feature needs.",
          icon: CreditCard
        },
        {
          title: "Usage Tracking",
          description: "Monitor your current usage against plan limits and understand billing cycles.",
          icon: BarChart3
        },
        {
          title: "Payment History",
          description: "View invoices, payment history, and download receipts for your records.",
          icon: Settings
        }
      ]
    },
    integrations: {
      title: "Apps & Integrations",
      description: "Connect with third-party services to extend your event management capabilities.",
      items: [
        {
          title: "Xero Integration",
          description: "Sync your event revenue and expenses with Xero accounting software.",
          icon: Link
        },
        {
          title: "Mailchimp Sync",
          description: "Automatically sync customer data with Mailchimp for email marketing campaigns.",
          icon: Mail
        },
        {
          title: "API Access",
          description: "Use our API to integrate with your own systems or third-party applications.",
          icon: Settings
        }
      ]
    },
    security: {
      title: "Security & Access",
      description: "Manage user access, security settings, and protect your event data.",
      items: [
        {
          title: "User Management",
          description: "Control who has access to your dashboard and what permissions they have.",
          icon: Users
        },
        {
          title: "Two-Factor Authentication",
          description: "Enable additional security measures to protect your account and data.",
          icon: Shield
        },
        {
          title: "Audit Logs",
          description: "Track all changes and actions taken in your dashboard for security monitoring.",
          icon: Settings
        }
      ]
    },
    settings: {
      title: "Organization Settings",
      description: "Configure your organization profile, branding, and global preferences.",
      items: [
        {
          title: "Organization Profile",
          description: "Update your organization name, logo, and contact information.",
          icon: Settings
        },
        {
          title: "Branding",
          description: "Set default colors, fonts, and styling that will be applied to all your events.",
          icon: Palette
        },
        {
          title: "Notification Preferences",
          description: "Configure how and when you receive notifications about events and sales.",
          icon: Mail
        }
      ]
    }
  };

  const eventCustomizationDetails = {
    widget: {
      title: "Widget Customization",
      description: "Customize how your public ticket widget appears to customers.",
      sections: [
        {
          title: "Theme & Colors",
          items: [
            "Primary Color: Main brand color used for buttons and highlights",
            "Secondary Color: Supporting color for backgrounds and accents",
            "Background Color: Main background color of the widget",
            "Text Color: Primary text color for readability",
            "Font Family: Typography style (Inter, Arial, etc.)"
          ]
        },
        {
          title: "Layout Options",
          items: [
            "Show Event Image: Display your event logo or featured image",
            "Show Description: Include event description text",
            "Show Venue: Display venue information",
            "Show Capacity: Show total event capacity",
            "Ticket Layout: Choose between list or grid view for tickets"
          ]
        },
        {
          title: "Branding",
          items: [
            "Show Organization Logo: Display your company logo",
            "Custom CSS: Add custom styling rules",
            "Custom Header Text: Add personalized text above tickets",
            "Custom Footer Text: Add text below the ticket selection"
          ]
        },
        {
          title: "Seat Maps",
          items: [
            "Enable Seat Maps: Allow customers to select specific seats",
            "Seat Map Designer: Create custom seating layouts",
            "Seat Types: Define different seat categories (standard, premium, VIP)"
          ]
        },
        {
          title: "Custom Questions",
          items: [
            "Enable Custom Questions: Add required fields for customers",
            "Question Types: Text, select, checkbox, email, phone",
            "Required Fields: Mark questions as mandatory for purchase"
          ]
        },
        {
          title: "Payment & Checkout",
          items: [
            "Success URL: Custom redirect after successful payment",
            "Checkout Mode: Single-page or multi-step checkout process"
          ]
        }
      ]
    },
    seats: {
      title: "Seat Map Management",
      description: "Design and manage custom seating layouts for your events.",
      sections: [
        {
          title: "Seat Map Designer",
          items: [
            "Interactive Canvas: Drag and drop interface for creating layouts",
            "Seat Types: Define different seat categories with colors",
            "Row Management: Organize seats into logical rows and sections",
            "Entrance Markers: Add entrance and exit indicators",
            "Grid System: Use grid snapping for precise seat placement"
          ]
        },
        {
          title: "Seat Configuration",
          items: [
            "Seat Numbers: Automatic or custom seat numbering",
            "Row Labels: Use letters, numbers, or custom labels for rows",
            "Seat Spacing: Adjust spacing between seats and rows",
            "Section Divisions: Create logical sections within your venue"
          ]
        },
        {
          title: "Pricing & Availability",
          items: [
            "Price Overrides: Set different prices for specific seats",
            "Availability Control: Mark seats as available or occupied",
            "Seat Reservations: Reserve seats for specific purposes"
          ]
        }
      ]
    },
    tickets: {
      title: "Ticket Design & Management",
      description: "Customize ticket appearance and manage ticket types and pricing.",
      sections: [
        {
          title: "Ticket Types",
          items: [
            "Multiple Categories: Create different ticket tiers (General, VIP, Premium)",
            "Pricing Strategy: Set different prices for each ticket type",
            "Quantity Limits: Control how many tickets of each type can be sold",
            "Sale Dates: Set specific start and end dates for ticket sales"
          ]
        },
        {
          title: "Ticket Design",
          items: [
            "Templates: Choose from modern, classic, minimal, or elegant designs",
            "Colors: Customize background, text, and border colors",
            "QR Code Position: Place QR codes for easy scanning",
            "Logo Display: Show event or organization logos on tickets"
          ]
        },
        {
          title: "Ticket Content",
          items: [
            "Event Details: Include date, time, venue, and other information",
            "Custom Fields: Add additional information like dietary requirements",
            "Terms & Conditions: Include important event policies"
          ]
        }
      ]
    },
    emails: {
      title: "Email Customization",
      description: "Personalize all email communications sent to your customers.",
      sections: [
        {
          title: "Email Templates",
          items: [
            "Confirmation Emails: Sent immediately after ticket purchase",
            "Reminder Emails: Sent before the event with important details",
            "Update Emails: Notify customers of event changes",
            "Follow-up Emails: Post-event communications and feedback requests"
          ]
        },
        {
          title: "Design Options",
          items: [
            "Header Colors: Customize email header styling",
            "Background Colors: Set email background colors",
            "Text Colors: Ensure readability and brand consistency",
            "Button Colors: Make call-to-action buttons stand out"
          ]
        },
        {
          title: "Content Customization",
          items: [
            "Subject Lines: Write compelling email subject lines",
            "Header Text: Add personalized greetings and introductions",
            "Body Content: Include event details, directions, and policies",
            "Footer Text: Add contact information and social media links"
          ]
        }
      ]
    },
    merchandise: {
      title: "Merchandise Management",
      description: "Add merchandise items to increase revenue and enhance the event experience.",
      sections: [
        {
          title: "Product Management",
          items: [
            "Product Categories: Organize items by type (apparel, programs, etc.)",
            "Inventory Tracking: Monitor stock levels and availability",
            "Pricing: Set individual prices for each merchandise item",
            "Product Images: Add high-quality photos of merchandise"
          ]
        },
        {
          title: "Variants & Options",
          items: [
            "Size Options: Offer different sizes for clothing items",
            "Color Options: Provide multiple color choices",
            "Quantity Limits: Control how many items each customer can buy",
            "Bundle Deals: Create package offers with tickets and merchandise"
          ]
        }
      ]
    },
    attendees: {
      title: "Attendee Management",
      description: "Manage your guest list, check-ins, and attendee information.",
      sections: [
        {
          title: "Guest List Management",
          items: [
            "Attendee Database: Store customer information and preferences",
            "Check-in System: Track who has arrived at your event",
            "Waitlist Management: Handle overflow when events sell out",
            "Group Bookings: Manage bookings made by organizations or groups"
          ]
        },
        {
          title: "Communication Tools",
          items: [
            "Bulk Messaging: Send updates to all attendees at once",
            "Personalized Communications: Address attendees by name",
            "Emergency Notifications: Send urgent updates about event changes"
          ]
        }
      ]
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Dashboard Help Center</h2>
              <p className="text-muted-foreground">Learn how to use every feature of your dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="w-full justify-start border-b rounded-none h-14 px-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="event-details">Event Customization</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Main Dashboard Sections */}
              {activeTab !== "event-details" && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold mb-2">
                      {helpSections[activeTab as keyof typeof helpSections]?.title}
                    </h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      {helpSections[activeTab as keyof typeof helpSections]?.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {helpSections[activeTab as keyof typeof helpSections]?.items.map((item, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <item.icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Customization Detailed Help */}
              {activeTab === "event-details" && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Event Customization Guide</h3>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Comprehensive guide to customizing every aspect of your event, from appearance to functionality.
                    </p>
                  </div>

                  <Tabs defaultValue="widget" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="widget">Widget</TabsTrigger>
                      <TabsTrigger value="seats">Seats</TabsTrigger>
                      <TabsTrigger value="tickets">Tickets</TabsTrigger>
                      <TabsTrigger value="emails">Emails</TabsTrigger>
                      <TabsTrigger value="merchandise">Merchandise</TabsTrigger>
                      <TabsTrigger value="attendees">Attendees</TabsTrigger>
                    </TabsList>

                    {Object.entries(eventCustomizationDetails).map(([key, section]) => (
                      <TabsContent key={key} value={key} className="space-y-6">
                        <div className="text-center mb-6">
                          <h4 className="text-xl font-semibold mb-2">{section.title}</h4>
                          <p className="text-muted-foreground">{section.description}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {section.sections.map((subsection, index) => (
                            <Card key={index}>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                                  {subsection.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {subsection.items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Need more help? Contact our support team</span>
            </div>
            <Button onClick={onClose} variant="outline">
              Close Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
