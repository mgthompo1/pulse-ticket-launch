import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { CreditCard, Calendar, Percent, Shield, Clock, RefreshCw } from "lucide-react";

const FeaturePaymentPlans = () => {
  const benefits = [
    {
      title: "Deposit Options",
      description: "Let attendees secure their spot with a deposit and pay the balance closer to the event. Configure any percentage you like.",
      icon: <CreditCard className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Flexible Installments",
      description: "Spread payments over weekly, fortnightly, or monthly installments. Make expensive tickets accessible to more people.",
      icon: <Calendar className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Automatic Charging",
      description: "Cards are saved securely and charged automatically on each due date. No manual follow-up needed.",
      icon: <RefreshCw className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Payment Plan Fees",
      description: "Optionally add a small fee for payment plans to cover processing costs, or offer them free as a perk.",
      icon: <Percent className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Secure Card Storage",
      description: "Payment details are stored securely with Stripe. PCI compliant with bank-level encryption.",
      icon: <Shield className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Configurable Timing",
      description: "Set when the final balance is due, how many installments to offer, and the minimum order amount for eligibility.",
      icon: <Clock className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Multi-day Festivals & Conferences",
      description: "Premium tickets for festivals and conferences can cost hundreds of dollars. Payment plans let attendees commit early and pay over time, increasing your sales and reducing drop-offs.",
    },
    {
      title: "Youth Camps & Retreats",
      description: "Camp fees can be a big expense for families. Offering deposits and installments makes it easier for parents to say yes, and gives you committed attendees months in advance.",
    },
    {
      title: "Premium VIP Experiences",
      description: "High-value VIP packages and meet-and-greets become more accessible when customers can spread the cost. Capture sales you'd otherwise lose to sticker shock.",
    },
    {
      title: "Group & School Trips",
      description: "When groups are booking for dozens of students or members, the total can be substantial. Payment plans help group coordinators manage cash flow and get more sign-ups.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Payment Plans"
      headline="Payment Plans & Deposits"
      subheadline="Let attendees pay over time with deposits and installment plans"
      introText="Not everyone can pay the full ticket price upfront. TicketFlo's Payment Plans feature lets you offer flexible payment options that work for your attendees and your event. Accept deposits to lock in bookings early, or spread payments across multiple installments. Cards are stored securely and charged automatically — you focus on your event while we handle the payments."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start Offering Payment Plans"
      metaTitle="Payment Plans & Deposits | TicketFlo Event Ticketing"
      metaDescription="Offer flexible payment options for your events. Accept deposits, spread payments with installments, and let attendees pay over time. Automatic charging with secure card storage."
      keywords="payment plans for events, event ticket deposits, installment payments tickets, buy now pay later events, flexible ticket payments, event payment options, ticket layaway, deposit for event tickets, split payment tickets nz"
    />
  );
};

export default FeaturePaymentPlans;
