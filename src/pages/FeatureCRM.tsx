import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { Users, UserCheck, Mail, BarChart3, Tag, History } from "lucide-react";

const FeatureCRM = () => {
  const benefits = [
    {
      title: "Unified Customer Profiles",
      description: "Every attendee gets a profile that tracks their purchase history, event attendance, and preferences across all your events.",
      icon: <UserCheck className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Smart Segmentation",
      description: "Create audience segments based on purchase behavior, event types, spend levels, and engagement to target the right people.",
      icon: <Tag className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Purchase History",
      description: "See every ticket purchase, refund, and interaction in one place. Know your VIPs and identify your most loyal customers.",
      icon: <History className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Email Marketing Built-in",
      description: "Send targeted email campaigns to your segments. Promote new events to people who attended similar ones before.",
      icon: <Mail className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Attendee Insights",
      description: "Understand your audience with detailed analytics on demographics, purchasing patterns, and engagement metrics.",
      icon: <BarChart3 className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Import & Export",
      description: "Bring in existing customer lists or export your data anytime. Your customer data belongs to you.",
      icon: <Users className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Recurring Event Series",
      description: "Track attendees across your monthly meetups, annual conferences, or seasonal festivals. See who keeps coming back and who you're losing.",
    },
    {
      title: "VIP & Loyalty Programs",
      description: "Identify your top spenders and most engaged attendees. Create VIP experiences and early access for your best customers.",
    },
    {
      title: "Multi-Event Organizations",
      description: "If you run multiple event types, understand which audiences overlap and cross-promote effectively between your different events.",
    },
    {
      title: "Sponsor & Partner Reporting",
      description: "Generate detailed attendee reports for sponsors. Show them the value of your audience with real engagement data.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="CRM"
      headline="Built-in Customer Relationship Management"
      subheadline="Know your attendees, build relationships, and grow your audience with every event"
      introText="Most ticketing platforms treat each event as isolated. TicketFlo's built-in CRM connects the dots across all your events, giving you a complete picture of every customer. Track purchase history, segment your audience, and send targeted communications — all without needing a separate CRM tool. Build lasting relationships with your attendees and turn one-time buyers into loyal fans."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start Building Relationships"
      metaTitle="Built-in Event CRM | TicketFlo Customer Management"
      metaDescription="TicketFlo's built-in CRM tracks attendees across all your events. Customer profiles, smart segmentation, purchase history, and email marketing included free."
      keywords="event crm, attendee management, customer relationship management events, ticketing crm, event customer database, attendee tracking, event marketing crm"
    />
  );
};

export default FeatureCRM;
