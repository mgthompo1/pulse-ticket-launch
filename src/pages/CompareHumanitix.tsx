import { ComparisonPageTemplate } from "@/components/ComparisonPageTemplate";

const CompareHumanitix = () => {
  const features = [
    { feature: "Platform Fee", ticketflo: "1% + $0.50", competitor: "Free (charity-funded)", highlight: true },
    { feature: "Profit Model", ticketflo: "Transparent fees", competitor: "Buyer fees donated to charity", highlight: true },
    { feature: "Custom Branding", ticketflo: true, competitor: "Limited" },
    { feature: "Seat Selection/Maps", ticketflo: true, competitor: true },
    { feature: "Group Sales & Allocations", ticketflo: true, competitor: false, highlight: true },
    { feature: "Built-in CRM", ticketflo: true, competitor: false },
    { feature: "Digital Waivers", ticketflo: true, competitor: false },
    { feature: "Mobile Check-in App", ticketflo: true, competitor: true },
    { feature: "Custom Questions", ticketflo: true, competitor: true },
    { feature: "Promo Codes", ticketflo: true, competitor: true },
    { feature: "Multi-currency Support", ticketflo: true, competitor: "Limited" },
    { feature: "Refund Management", ticketflo: true, competitor: true },
    { feature: "Analytics Dashboard", ticketflo: true, competitor: "Basic" },
    { feature: "Email Marketing", ticketflo: true, competitor: "Basic" },
    { feature: "White-label Solution", ticketflo: true, competitor: false, highlight: true },
    { feature: "API Access", ticketflo: true, competitor: "Limited" },
    { feature: "NZ/AU Payment Processing", ticketflo: "Optimized", competitor: "Standard", highlight: true },
    { feature: "24/7 Support", ticketflo: true, competitor: "Business hours" },
  ];

  const ticketfloBenefits = [
    "Full control over your ticket pricing and fee structure",
    "Advanced group sales features for schools, churches, and corporate events",
    "Complete white-label capabilities to maintain your brand identity",
    "Built-in CRM to manage attendee relationships across all events",
    "Digital waivers and liability forms included at no extra cost",
    "Powerful customization options without limitations",
    "Dedicated support team available 24/7",
    "API access for seamless integrations with your existing systems",
  ];

  const competitorDrawbacks = [
    "Limited customization and branding options",
    "No group allocation system for organizations",
    "No white-label solution available",
    "Basic analytics and reporting compared to professional platforms",
    "Buyer fees model may confuse some attendees",
    "Limited API access restricts integration possibilities",
    "Support only available during business hours",
    "Fewer advanced features for professional event management",
  ];

  return (
    <ComparisonPageTemplate
      competitorName="Humanitix"
      headline="TicketFlo vs Humanitix"
      subheadline="Compare professional event ticketing features and discover which platform is right for your events"
      introText="Humanitix has gained popularity with its charity-focused model where booking fees are donated to good causes. While this is admirable, many professional event organizers need more than charitable giving – they need powerful features, full customization, and enterprise-grade tools. TicketFlo offers a professional ticketing platform with transparent pricing, advanced features like group sales and white-labeling, and is purpose-built for the ANZ market."
      features={features}
      ticketfloBenefits={ticketfloBenefits}
      competitorDrawbacks={competitorDrawbacks}
      ctaText="Try TicketFlo Free"
      metaTitle="TicketFlo vs Humanitix: Compare Event Ticketing Platforms 2025"
      metaDescription="Compare TicketFlo and Humanitix for event ticketing. See why professional event organizers choose TicketFlo for advanced features, white-labeling, and group sales."
      keywords="humanitix alternative, ticketflo vs humanitix, event ticketing comparison, humanitix fees, humanitix alternative nz, humanitix alternative australia, professional event ticketing"
    />
  );
};

export default CompareHumanitix;
