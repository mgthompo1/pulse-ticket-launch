import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { Plug, RefreshCw, FileSpreadsheet, Mail, CreditCard, Webhook } from "lucide-react";

const FeatureIntegrations = () => {
  const benefits = [
    {
      title: "HubSpot Integration",
      description: "Sync attendees to HubSpot automatically. Create contacts, update properties, and trigger workflows based on ticket purchases.",
      icon: <Plug className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Xero Accounting",
      description: "Automatic invoice creation and payment reconciliation in Xero. Keep your books up to date without manual data entry.",
      icon: <FileSpreadsheet className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "NetSuite ERP",
      description: "Enterprise-grade integration with NetSuite for organizations that need full financial system connectivity.",
      icon: <RefreshCw className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Mailchimp & Email Tools",
      description: "Automatically add ticket buyers to your Mailchimp lists. Segment by event type, ticket tier, or purchase date.",
      icon: <Mail className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Payment Processors",
      description: "Native Stripe integration with support for multiple currencies, payment methods, and automatic payouts.",
      icon: <CreditCard className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Webhooks & API",
      description: "Build custom integrations with our webhooks and REST API. Connect TicketFlo to any system in your stack.",
      icon: <Webhook className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Marketing Automation",
      description: "Connect to HubSpot or Mailchimp to automatically nurture attendees post-event, send surveys, and promote upcoming events.",
    },
    {
      title: "Financial Reconciliation",
      description: "Xero and NetSuite integrations ensure your ticket sales flow directly into your accounting system with proper categorization.",
    },
    {
      title: "Custom Workflows",
      description: "Use webhooks to trigger actions in Zapier, Make, or your own systems. Send Slack notifications, update spreadsheets, or sync with any tool.",
    },
    {
      title: "Enterprise Systems",
      description: "Large organizations can connect TicketFlo to their existing ERP, CRM, and marketing stack without replacing what works.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Integrations"
      headline="Out-of-the-Box Integrations"
      subheadline="Connect TicketFlo to HubSpot, Xero, NetSuite, Mailchimp, and your entire tech stack"
      introText="Your ticketing platform shouldn't be an island. TicketFlo integrates seamlessly with the tools you already use — from CRM and marketing automation to accounting and ERP systems. Set up connections in minutes, not days. Automatically sync customer data, reconcile payments, and trigger workflows across your entire business."
      benefits={benefits}
      useCases={useCases}
      ctaText="Explore Integrations"
      metaTitle="Event Ticketing Integrations | HubSpot, Xero, NetSuite & More"
      metaDescription="TicketFlo integrates with HubSpot, Xero, NetSuite, Mailchimp, Stripe and more. Connect your ticketing to CRM, accounting, and marketing tools."
      keywords="ticketing integrations, hubspot event integration, xero ticketing, netsuite events, mailchimp ticket sales, event api, ticketing webhooks, zapier events"
    />
  );
};

export default FeatureIntegrations;
