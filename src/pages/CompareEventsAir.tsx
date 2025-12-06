import { ComparisonPageTemplate } from "@/components/ComparisonPageTemplate";

const CompareEventsAir = () => {
  const features = [
    { feature: "Platform Fee", ticketflo: "1% + $0.50", competitor: "Custom enterprise pricing", highlight: true },
    { feature: "Setup Required", ticketflo: "Self-service", competitor: "Implementation required", highlight: true },
    { feature: "Time to Launch", ticketflo: "Minutes", competitor: "Weeks/Months", highlight: true },
    { feature: "Custom Branding", ticketflo: true, competitor: true },
    { feature: "Seat Selection/Maps", ticketflo: true, competitor: true },
    { feature: "Group Sales & Allocations", ticketflo: true, competitor: true },
    { feature: "Built-in CRM", ticketflo: true, competitor: true },
    { feature: "Digital Waivers", ticketflo: true, competitor: "Add-on" },
    { feature: "Mobile Check-in App", ticketflo: true, competitor: true },
    { feature: "Custom Questions", ticketflo: true, competitor: true },
    { feature: "Promo Codes", ticketflo: true, competitor: true },
    { feature: "Conference Management", ticketflo: "Basic", competitor: true },
    { feature: "Abstract Submission", ticketflo: false, competitor: true },
    { feature: "Exhibitor Management", ticketflo: "Basic", competitor: true },
    { feature: "Transparent Pricing", ticketflo: true, competitor: false, highlight: true },
    { feature: "No Minimum Contract", ticketflo: true, competitor: false, highlight: true },
    { feature: "Self-Service Platform", ticketflo: true, competitor: false },
    { feature: "NZ/AU Focused", ticketflo: true, competitor: true },
  ];

  const ticketfloBenefits = [
    "Get started in minutes with self-service setup – no implementation team required",
    "Transparent pricing at just 1% + $0.50 per ticket with no hidden costs",
    "No minimum contract or commitment – pay only when you sell tickets",
    "Perfect for events of all sizes, from small gatherings to large conferences",
    "Built-in group sales and allocation features for schools and organizations",
    "Modern, mobile-first design that attendees love",
    "Local support team that understands the NZ/AU market",
    "Simple enough for occasional events, powerful enough for professionals",
  ];

  const competitorDrawbacks = [
    "Enterprise pricing requires custom quotes and sales negotiations",
    "Complex implementation process that can take weeks or months",
    "Designed primarily for large conferences and corporate events",
    "Overkill for most events – you pay for features you don't need",
    "Steep learning curve for platform administrators",
    "Long-term contracts often required",
    "Higher total cost of ownership for small to medium events",
    "Implementation and training costs add to the total price",
  ];

  return (
    <ComparisonPageTemplate
      competitorName="EventsAir"
      headline="TicketFlo vs EventsAir"
      subheadline="Enterprise event management vs simple, powerful ticketing – choose the right tool for your needs"
      introText="EventsAir is a comprehensive enterprise event management platform designed for large conferences and corporate events. While it offers extensive features, it comes with enterprise-level complexity and pricing. TicketFlo provides a modern, self-service alternative that's perfect for event organizers who want professional ticketing without the enterprise overhead. Get started in minutes with transparent pricing and all the features you need."
      features={features}
      ticketfloBenefits={ticketfloBenefits}
      competitorDrawbacks={competitorDrawbacks}
      ctaText="Start Free with TicketFlo"
      metaTitle="TicketFlo vs EventsAir: Compare Event Ticketing Platforms 2025"
      metaDescription="Compare TicketFlo and EventsAir for event ticketing. TicketFlo offers simple setup, transparent pricing (1% + $0.50), and powerful features without enterprise complexity."
      keywords="eventsair alternative, ticketflo vs eventsair, event ticketing comparison, eventsair pricing, event management software nz, event management software australia, conference ticketing"
    />
  );
};

export default CompareEventsAir;
