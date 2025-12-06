import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { MapPin, Grid3X3, MousePointerClick, Eye, Palette, Accessibility } from "lucide-react";

const FeatureSeating = () => {
  const benefits = [
    {
      title: "Interactive Seat Maps",
      description: "Let attendees see the venue layout and choose their exact seats. They can zoom, pan, and click to select the perfect spot.",
      icon: <MousePointerClick className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Custom Venue Builder",
      description: "Create seat maps for any venue configuration. From traditional theater seating to complex multi-section layouts.",
      icon: <Grid3X3 className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Seat Categories & Pricing",
      description: "Define different seat categories with unique pricing. Premium front-row seats, standard seating, and budget-friendly options.",
      icon: <MapPin className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Real-time Availability",
      description: "Attendees see live seat availability as they browse. No double-bookings or disappointments at checkout.",
      icon: <Eye className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Accessible Seating",
      description: "Mark and manage accessible seating options. Ensure compliance and provide an inclusive experience for all attendees.",
      icon: <Accessibility className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Custom Styling",
      description: "Match your seat map colors and styling to your brand. Create a cohesive visual experience from browsing to checkout.",
      icon: <Palette className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Theater & Performing Arts",
      description: "Perfect for theaters, concert halls, and performing arts venues. Attendees can see stage proximity and select seats based on their viewing preferences.",
    },
    {
      title: "Sports Venues & Stadiums",
      description: "Manage complex stadium layouts with multiple sections, tiers, and categories. Show court-side vs general admission clearly.",
    },
    {
      title: "Conferences & Seminars",
      description: "Set up table seating for galas, row seating for conferences, or mixed layouts for awards nights and corporate events.",
    },
    {
      title: "Schools & Community Halls",
      description: "Even simple venues benefit from seat selection. Give parents the chance to choose where they sit for school performances.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Seat Selection"
      headline="Interactive Seat Selection"
      subheadline="Let your attendees choose exactly where they want to sit with beautiful, interactive seat maps"
      introText="Reserved seating transforms the ticket-buying experience. With TicketFlo's interactive seat maps, your attendees can explore the venue, compare options, and select their perfect seats. Our visual seat selection tool works on any device and provides real-time availability so there are never any surprises. Create custom seating layouts for any venue and let your customers choose their experience."
      benefits={benefits}
      useCases={useCases}
      ctaText="Try Seat Selection Free"
      metaTitle="Interactive Seat Selection & Seat Maps | TicketFlo Event Ticketing"
      metaDescription="Let attendees choose their seats with interactive seat maps. TicketFlo's seat selection feature includes custom venue builders, pricing tiers, and real-time availability."
      keywords="seat selection software, interactive seat map, reserved seating tickets, venue seat map builder, theater ticketing system, concert seat selection, event seat booking nz"
    />
  );
};

export default FeatureSeating;
