import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { Users, School, Building2, Church, Ticket, Shield } from "lucide-react";

const FeatureGroupSales = () => {
  const benefits = [
    {
      title: "Bulk Ticket Allocation",
      description: "Allocate blocks of tickets to schools, churches, or corporate groups with a few clicks. They manage their own distribution.",
      icon: <Ticket className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Group Admin Portal",
      description: "Give group leaders access to a dedicated portal where they can manage, assign, and track their allocated tickets.",
      icon: <Users className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Flexible Payment Options",
      description: "Allow groups to pay in bulk or let individual members pay for their own tickets within the allocation.",
      icon: <Building2 className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Real-time Tracking",
      description: "Monitor allocation status, see which tickets have been claimed, and get notified when groups are running low.",
      icon: <Shield className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Custom Group Pricing",
      description: "Set special pricing tiers for different groups. Offer discounts for schools or premium packages for corporates.",
      icon: <School className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Automated Communications",
      description: "Set up automatic reminders and updates that go out to group administrators and their members.",
      icon: <Church className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "School Events & Performances",
      description: "Allocate tickets to each class or year group. Teachers can manage their allocation and parents purchase directly through a unique link. Perfect for school productions, graduations, and sports days.",
    },
    {
      title: "Church & Religious Events",
      description: "Give congregation leaders blocks of tickets for special services, conferences, or community events. Track attendance across different groups and locations.",
    },
    {
      title: "Corporate Events & Team Building",
      description: "Allocate tickets to different departments or offices. HR managers can track registrations and the company can be invoiced in bulk or individuals can pay their own way.",
    },
    {
      title: "Sports Clubs & Competitions",
      description: "Manage team registrations for tournaments and events. Each club gets their allocation and handles distribution to their members with full visibility into registration status.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Group Sales"
      headline="Group Sales & Ticket Allocation"
      subheadline="The easiest way to manage bulk tickets for schools, churches, corporations, and organizations"
      introText="Managing group ticket sales shouldn't be complicated. TicketFlo's Group Sales feature lets you allocate blocks of tickets to organizations, give group leaders their own management portal, and track everything in real-time. Whether you're running a school production, church conference, or corporate event, our group sales system saves you hours of manual work and provides a better experience for everyone involved."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start Free with Group Sales"
      metaTitle="Group Sales & Ticket Allocation | TicketFlo Event Ticketing"
      metaDescription="Manage bulk ticket allocations for schools, churches, and corporate groups. TicketFlo's group sales feature includes admin portals, flexible payment, and real-time tracking."
      keywords="group ticket sales, bulk ticket allocation, school event tickets, church event tickets, corporate event tickets, group booking system, ticket allocation software, school production tickets nz"
    />
  );
};

export default FeatureGroupSales;
