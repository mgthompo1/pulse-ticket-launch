import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { Palette, Globe, Code, Eye, Smartphone, Lock } from "lucide-react";

const FeatureWhiteLabel = () => {
  const benefits = [
    {
      title: "Your Branding, Everywhere",
      description: "Customize colors, logos, fonts, and styling across the entire ticket purchase experience. Your brand, not ours.",
      icon: <Palette className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Custom Domain Support",
      description: "Use your own domain for ticket sales. Attendees never need to know you're using TicketFlo behind the scenes.",
      icon: <Globe className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Embeddable Widget",
      description: "Embed the ticket purchase flow directly on your website. Customers buy tickets without ever leaving your site.",
      icon: <Code className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Branded Confirmations",
      description: "Confirmation emails, tickets, and receipts all feature your branding. Maintain consistency from purchase to event day.",
      icon: <Eye className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Mobile-Optimized",
      description: "Your white-label experience looks perfect on any device. Responsive design that adapts to phones, tablets, and desktops.",
      icon: <Smartphone className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Secure & Reliable",
      description: "Enterprise-grade security and 99.9% uptime. Your customers get a premium experience with the reliability to match.",
      icon: <Lock className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Event Management Companies",
      description: "Offer ticketing services to your clients under your own brand. Build your business without customers knowing about the platform behind it.",
    },
    {
      title: "Venues & Theaters",
      description: "Keep your venue's brand front and center. The entire ticket purchase experience feels native to your website and brand identity.",
    },
    {
      title: "Festivals & Large Events",
      description: "Major events need major branding. Create an immersive ticket-buying experience that matches your event's visual identity.",
    },
    {
      title: "Corporate Event Teams",
      description: "Internal events should feel internal. White-label your company's events so employees see your brand, not a ticketing platform.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="White Label"
      headline="White-Label Ticketing Platform"
      subheadline="Your brand, your domain, your customer experience – powered by TicketFlo"
      introText="Build trust and reinforce your brand with TicketFlo's white-label capabilities. Remove all TicketFlo branding and replace it with your own colors, logo, and styling. Use your own domain, embed ticket sales on your website, and send branded confirmation emails. Your customers get a seamless experience, and you maintain complete brand control throughout the ticket purchase journey."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start White-Labeling Today"
      metaTitle="White-Label Ticketing Platform | TicketFlo Event Ticketing"
      metaDescription="Create a fully branded ticket purchase experience with TicketFlo's white-label solution. Custom domains, embedded widgets, and branded communications included."
      keywords="white label ticketing, custom branded tickets, ticketing platform white label, event ticketing api, embed ticket widget, branded event tickets, custom ticketing solution nz"
    />
  );
};

export default FeatureWhiteLabel;
