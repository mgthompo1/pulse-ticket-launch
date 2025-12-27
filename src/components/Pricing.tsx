import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

const plans = [
  {
    name: "Simple & Transparent",
    icon: Zap,
    price: "1.00%",
    period: "+ $0.50 per ticket",
    description: "Pay only when you sell tickets - no monthly fees, no hidden costs",
    badge: "All Features Included",
    badgeVariant: "default" as const,
    features: [
      "Unlimited events & tickets",
      "Complete customization",
      "Advanced analytics & reporting",
      "Reserved seating & interactive charts",
      "Email marketing campaigns",
      "Discount codes & promotions",
      "White-label ticketing widget",
      "Mobile-optimized checkout",
      "24/7 priority support",
      "API access & integrations",
      "AI-powered insights",
      "Multi-venue management"
    ],
    cta: "Start Selling Tickets",
    ctaVariant: "gradient" as const,
    popular: true
  }
];

export const Pricing = () => {
  const navigate = useNavigate();
  const { getContentByKey } = useLandingPageContent();

  const handlePlanClick = () => {
    navigate('/auth');
  };
  return (
    <section id="pricing" className="py-20 bg-[#FFFAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30 font-manrope opacity-0">
            {getContentByKey('pricing', 'badge_text') || '💎 Simple Pricing'}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 font-dm-sans">
            {getContentByKey('pricing', 'title') || 'Pay Only When You'}
            <span className="block text-[#ff4d00]">
              {getContentByKey('pricing', 'title_accent') || 'Sell Tickets'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-manrope">
            {getContentByKey('pricing', 'description') || 'No monthly fees, no setup costs, no hidden charges. Just a simple platform fee when you make sales.'}
          </p>
        </div>

        {/* Single pricing card */}
        <div className="flex justify-center max-w-2xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative group transition-all duration-300 hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-[#ff4d00]/50 shadow-2xl ring-2 ring-[#ff4d00]/20' 
                  : 'border-gray-200/50 hover:shadow-2xl'
              } bg-white backdrop-blur-sm`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-[#ff4d00] text-white px-4 py-1 text-sm font-medium font-manrope">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center space-y-4 pt-8">
                <div className="flex items-center justify-center">
                  <div className={`p-3 rounded-lg ${
                    plan.popular 
                      ? 'bg-[#ff4d00] text-white' 
                      : 'bg-[#ff4d00]/10 text-[#ff4d00]'
                  }`}>
                    <plan.icon className="h-6 w-6" />
                  </div>
                </div>
                
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 font-dm-sans">{plan.name}</CardTitle>
                  <CardDescription className="mt-2 text-gray-600 font-manrope">{plan.description}</CardDescription>
                </div>

                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-bold text-gray-900 font-dm-sans">{plan.price}</span>
                  <span className="text-gray-500 font-manrope">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button 
                  variant={plan.ctaVariant} 
                  size="lg" 
                  className="w-full group-hover:scale-105 transition-transform"
                  onClick={() => handlePlanClick()}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-black font-manrope">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom section */}
        <div className="text-center mt-16 space-y-6">
          <div className="bg-gray-50 rounded-lg p-6 max-w-4xl mx-auto border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-dm-sans">Complete Fee Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="font-medium text-gray-900 mb-2 font-manrope">Platform Fee</div>
                <div className="text-2xl font-bold text-[#ff4d00] font-dm-sans">1.00% + $0.50</div>
                <div className="text-gray-600 font-manrope">per ticket sold</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="font-medium text-gray-900 mb-2 font-manrope">Payment Processing</div>
                <div className="text-lg font-semibold text-gray-600 font-manrope">2.9% + 30¢</div>
                <div className="text-gray-600 font-manrope">standard Stripe fees</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 font-manrope">
              Example: On a $20 ticket, total fees are $1.38 (6.9%) - you keep $18.62
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-manrope">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No monthly fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No setup costs</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>All features included</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>24/7 support</span>
            </div>
          </div>
          
          <p className="text-gray-600 font-manrope">
            Questions about fees or features? 
            <a href="#support" className="text-[#ff4d00] hover:text-[#e64400] ml-1 underline font-manrope">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};