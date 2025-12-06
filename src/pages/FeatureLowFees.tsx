import { FeaturePageTemplate } from "@/components/FeaturePageTemplate";
import { DollarSign, TrendingDown, Calculator, Percent, CreditCard, Banknote } from "lucide-react";

const FeatureLowFees = () => {
  const benefits = [
    {
      title: "Just 1% + $0.50 Per Ticket",
      description: "Our platform fee is one of the lowest in the industry. For a $50 ticket, you pay just $1 – not $3-5 like other platforms.",
      icon: <Percent className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "No Monthly Subscriptions",
      description: "Never pay for features you don't use. There are no monthly fees, setup costs, or minimum commitments with TicketFlo.",
      icon: <DollarSign className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Transparent Pricing",
      description: "What you see is what you pay. No hidden fees, no surprise charges, no complicated tier structures to navigate.",
      icon: <Calculator className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Pass Fees or Absorb",
      description: "Choose whether to include fees in the ticket price or add them at checkout. Full flexibility to match your pricing strategy.",
      icon: <TrendingDown className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Local Payment Processing",
      description: "Optimized for NZ and AU payment methods. Fast processing, local currency, and lower interchange rates.",
      icon: <CreditCard className="h-5 w-5 text-[#ff4d00]" />,
    },
    {
      title: "Quick Payouts",
      description: "Get your money fast with regular payouts directly to your bank account. No waiting weeks to access your ticket revenue.",
      icon: <Banknote className="h-5 w-5 text-[#ff4d00]" />,
    },
  ];

  const useCases = [
    {
      title: "Community & Non-Profit Events",
      description: "Every dollar counts when you're running events for a cause. Low fees mean more money goes to your organization, not to platform costs.",
    },
    {
      title: "School Fundraisers & Productions",
      description: "Schools need affordable ticketing. With fees as low as $1 per ticket, you keep more of what you raise for your school community.",
    },
    {
      title: "Independent Event Organizers",
      description: "Starting out or running small events? Low fees and no monthly costs mean you only pay when you sell – making TicketFlo accessible for events of any size.",
    },
    {
      title: "High-Volume Events",
      description: "The more tickets you sell, the more you save. Our percentage-based fee structure means big events benefit from significant savings compared to per-ticket pricing.",
    },
  ];

  return (
    <FeaturePageTemplate
      featureName="Low Fees"
      headline="The Lowest Ticketing Fees in NZ & AU"
      subheadline="Keep more of your ticket revenue with our industry-leading 1% + $0.50 per ticket pricing"
      introText="Why give away 3-5% of every ticket sale when you don't have to? TicketFlo offers the lowest platform fees in New Zealand and Australia, charging just 1% + $0.50 per ticket. No monthly subscriptions, no setup fees, no hidden charges. With transparent pricing that puts you in control, you'll save thousands compared to platforms like Eventbrite and others. Your ticket revenue should go to your event, not to platform fees."
      benefits={benefits}
      useCases={useCases}
      ctaText="Start Saving on Fees"
      metaTitle="Lowest Event Ticketing Fees NZ & Australia | TicketFlo"
      metaDescription="TicketFlo offers the lowest ticketing fees at just 1% + $0.50 per ticket. No monthly fees, no setup costs. Compare and save vs Eventbrite, Humanitix, and more."
      keywords="low fee ticketing, cheap event ticketing, ticketing platform fees, eventbrite alternative low fees, ticket fees nz, affordable ticketing platform, event ticketing pricing"
    />
  );
};

export default FeatureLowFees;
