import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building } from "lucide-react";

const plans = [
  {
    name: "Starter",
    icon: Zap,
    price: "Free",
    period: "forever",
    description: "Perfect for small events and testing the platform",
    badge: "Most Popular",
    badgeVariant: "default" as const,
    features: [
      "Up to 100 tickets per event",
      "Basic customization",
      "Email support",
      "Standard reporting",
      "Mobile-optimized checkout",
      "Payment processing"
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const
  },
  {
    name: "Professional",
    icon: Crown,
    price: "$29",
    period: "per month",
    description: "For growing events and professional organizers",
    badge: "Best Value",
    badgeVariant: "default" as const,
    features: [
      "Unlimited tickets",
      "Advanced customization",
      "Priority support",
      "Advanced analytics",
      "Reserved seating",
      "Email campaigns",
      "Discount codes",
      "Custom branding",
      "API access"
    ],
    cta: "Start Professional Trial",
    ctaVariant: "gradient" as const,
    popular: true
  },
  {
    name: "Enterprise",
    icon: Building,
    price: "Custom",
    period: "pricing",
    description: "For large organizations and high-volume events",
    badge: "Custom Solution",
    badgeVariant: "secondary" as const,
    features: [
      "Everything in Professional",
      "White-label solution",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantees",
      "Advanced security",
      "Multi-venue management",
      "Custom reporting",
      "24/7 phone support"
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const
  }
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
            💎 Simple Pricing
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Choose Your Perfect
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Ticketing Plan
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free, scale as you grow. No hidden fees, transparent pricing, and incredible value at every level.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative group transition-all duration-300 hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-primary/50 shadow-glow ring-2 ring-primary/20' 
                  : 'border-border/50 hover:shadow-card'
              } bg-card/50 backdrop-blur-sm`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-gradient-primary text-white px-4 py-1 text-sm font-medium">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center space-y-4 pt-8">
                <div className="flex items-center justify-center">
                  <div className={`p-3 rounded-lg ${
                    plan.popular 
                      ? 'bg-gradient-primary text-white' 
                      : 'bg-gradient-primary/10 text-primary'
                  }`}>
                    <plan.icon className="h-6 w-6" />
                  </div>
                </div>
                
                <div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </div>

                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button 
                  variant={plan.ctaVariant} 
                  size="lg" 
                  className="w-full group-hover:scale-105 transition-transform"
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom section */}
        <div className="text-center mt-16 space-y-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>24/7 support</span>
            </div>
          </div>
          
          <p className="text-muted-foreground">
            Questions about pricing? 
            <a href="#support" className="text-primary hover:text-primary-glow ml-1 underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};