import { ComparisonPageTemplate } from "@/components/ComparisonPageTemplate";

const CompareEventbrite = () => {
  const features = [
    { feature: "Platform Fee", ticketflo: "1% + $0.50", competitor: "3.7% + $1.79", highlight: true },
    { feature: "Monthly Subscription", ticketflo: "Free", competitor: "From $0-$499/mo", highlight: true },
    { feature: "Custom Branding", ticketflo: true, competitor: "Paid plans only" },
    { feature: "Seat Selection/Maps", ticketflo: true, competitor: true },
    { feature: "Group Sales & Allocations", ticketflo: true, competitor: false, highlight: true },
    { feature: "Built-in CRM", ticketflo: true, competitor: false },
    { feature: "Digital Waivers", ticketflo: true, competitor: false },
    { feature: "Mobile Check-in App", ticketflo: true, competitor: true },
    { feature: "Custom Questions", ticketflo: true, competitor: true },
    { feature: "Promo Codes", ticketflo: true, competitor: true },
    { feature: "Multi-currency Support", ticketflo: true, competitor: true },
    { feature: "Refund Management", ticketflo: true, competitor: true },
    { feature: "Analytics Dashboard", ticketflo: true, competitor: true },
    { feature: "Email Marketing", ticketflo: true, competitor: "Basic" },
    { feature: "White-label Solution", ticketflo: true, competitor: "Enterprise only" },
    { feature: "API Access", ticketflo: true, competitor: "Paid plans" },
    { feature: "NZ/AU Payment Processing", ticketflo: "Optimized", competitor: "Standard", highlight: true },
    { feature: "24/7 Support", ticketflo: true, competitor: "Paid plans" },
  ];

  const ticketfloBenefits = [
    "Save up to 70% on fees compared to Eventbrite's standard pricing",
    "No monthly fees or subscriptions - only pay when you sell tickets",
    "Purpose-built for New Zealand and Australian events with local payment processing",
    "Advanced group sales features for schools, churches, and corporate events",
    "Built-in CRM to manage attendee relationships across all your events",
    "Digital waivers and liability forms included at no extra cost",
    "Dedicated support team that understands local event requirements",
    "Full white-label capabilities to maintain your brand identity",
  ];

  const competitorDrawbacks = [
    "High service fees that eat into your ticket revenue (3.7% + $1.79 per ticket)",
    "Monthly subscription fees for advanced features ($79-$499/month)",
    "Limited customization on free and basic plans",
    "No built-in group allocation system for schools or organizations",
    "Generic platform not optimized for NZ/AU market",
    "Customer support can be slow and impersonal",
    "White-label and API access locked behind expensive enterprise plans",
    "Complex pricing structure with hidden fees",
  ];

  return (
    <ComparisonPageTemplate
      competitorName="Eventbrite"
      headline="TicketFlo vs Eventbrite"
      subheadline="See why event organizers are switching from Eventbrite to TicketFlo for lower fees and better features"
      introText="Eventbrite is one of the most well-known ticketing platforms globally, but its high fees and US-centric approach often leave New Zealand and Australian event organizers looking for alternatives. TicketFlo offers a modern, locally-focused solution with significantly lower fees, advanced features like group sales and built-in CRM, and dedicated support for the ANZ market."
      features={features}
      ticketfloBenefits={ticketfloBenefits}
      competitorDrawbacks={competitorDrawbacks}
      ctaText="Switch from Eventbrite Today"
      metaTitle="TicketFlo vs Eventbrite: Compare Event Ticketing Platforms 2025"
      metaDescription="Compare TicketFlo and Eventbrite for event ticketing. See how TicketFlo offers lower fees (1% vs 3.7%), better features, and is built for NZ & AU events."
      keywords="eventbrite alternative, ticketflo vs eventbrite, event ticketing comparison, eventbrite fees, eventbrite alternative nz, eventbrite alternative australia, cheap event ticketing"
    />
  );
};

export default CompareEventbrite;
