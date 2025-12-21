import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { UserCircle, Ticket, History, CreditCard, Bell, Users } from "lucide-react";

const FeatureMembership = () => {
  const benefits = [
    {
      title: "Customer Accounts",
      description: "Attendees can create accounts to view their tickets, track orders, and manage their bookings all in one place.",
      icon: <UserCircle className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Digital Ticket Wallet",
      description: "All tickets stored in one place. Attendees can access, download, or transfer tickets anytime from their account.",
      icon: <Ticket className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Order History",
      description: "Complete purchase history across all your events. Customers can view past orders and download invoices.",
      icon: <History className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Saved Payment Methods",
      description: "Returning customers can save their payment details for faster checkout on future purchases.",
      icon: <CreditCard className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Payment Plan Management",
      description: "Customers can view upcoming payments, see their payment schedule, and manage installment plans.",
      icon: <Bell className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Guest Checkout Option",
      description: "Accounts are optional. Customers can still checkout as guests if they prefer a quick one-time purchase.",
      icon: <Users className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Recurring Event Attendees",
      description: "For venues and organizers with regular events, member accounts make repeat purchases seamless. Customers save time and you build lasting relationships.",
    },
    {
      title: "Season Pass Holders",
      description: "Members can view their season passes, see which events they've attended, and access their tickets for upcoming shows all from one dashboard.",
    },
    {
      title: "Conference & Festival Goers",
      description: "Multi-day events with add-ons, workshops, and sessions are easier to manage. Attendees can view their complete itinerary and all associated tickets.",
    },
    {
      title: "Community Organizations",
      description: "Churches, clubs, and community groups can give their members a personalized experience. Members see their involvement history and upcoming events.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Member Accounts"
      headline="Member Accounts & Ticket Wallet"
      subheadline="Give your attendees a personalized experience with customer accounts"
      introText="Build stronger relationships with your attendees by offering member accounts. Customers can create an account to access all their tickets in one place, view order history, manage payment plans, and checkout faster on return visits. It's optional for attendees but valuable for building a loyal community around your events."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start Building Your Community"
      metaTitle="Member Accounts & Ticket Wallet | TicketFlo Event Ticketing"
      metaDescription="Let attendees create accounts to manage tickets, view order history, and checkout faster. Digital ticket wallet, payment plan tracking, and personalized experience."
      keywords="event member accounts, customer accounts ticketing, digital ticket wallet, event attendee portal, ticket management system, customer portal events, attendee accounts, event membership system, recurring event customers nz"
    />
  );
};

export default FeatureMembership;
