import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  BarChart3, 
  MapPin, 
  Layout, 
  Mail, 
  TrendingUp, 
  Gift, 
  MessageSquare,
  Code,
  Infinity as InfinityIcon,
  Sparkles,
  Zap
} from "lucide-react";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

const features = [
  {
    icon: InfinityIcon,
    title: "Unlimited Ticket Types",
    description: "Create as many ticket categories as you need with flexible pricing, quantities, and availability windows.",
    badge: "Core Feature"
  },
  {
    icon: Palette,
    title: "Beautiful Design Customization",
    description: "Match your brand perfectly with our intuitive design tools. Custom colors, fonts, and layouts.",
    badge: "Design"
  },
  {
    icon: BarChart3,
    title: "Rich Reporting & Analytics",
    description: "Deep insights into sales, customer behavior, and event performance with real-time dashboards.",
    badge: "Analytics"
  },
  {
    icon: MapPin,
    title: "Reserved Seating",
    description: "Interactive seating charts with drag-and-drop functionality for theaters, stadiums, and venues.",
    badge: "Premium"
  },
  {
    icon: Layout,
    title: "Event Templates",
    description: "Professional templates for concerts, conferences, workshops, and more. Launch in minutes.",
    badge: "Templates"
  },
  {
    icon: Mail,
    title: "Email Campaigns",
    description: "Built-in email marketing tools to promote your events and engage with your audience.",
    badge: "Marketing"
  },
  {
    icon: TrendingUp,
    title: "Live Analytics",
    description: "Monitor ticket sales, traffic, and conversions in real-time with beautiful charts and metrics.",
    badge: "Real-time"
  },
  {
    icon: Gift,
    title: "Promotion Tools",
    description: "Discount codes, early bird pricing, bundle deals, and affiliate marketing capabilities.",
    badge: "Sales"
  },
  {
    icon: MessageSquare,
    title: "Checkout Questions",
    description: "Collect custom information from attendees with flexible forms and questionnaires.",
    badge: "Customization"
  },
  {
    icon: Code,
    title: "Embed on Your Website",
    description: "White-label ticketing widget that seamlessly integrates with your existing website.",
    badge: "Integration"
  },
  {
    icon: Zap,
    title: "Lightning Fast Checkout",
    description: "Optimized checkout flow with multiple payment options and mobile-first design.",
    badge: "Performance"
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Smart recommendations for pricing, marketing, and event optimization using machine learning.",
    badge: "AI"
  }
];

export const Features = () => {
  const { getContentByKey } = useLandingPageContent();
  return (
    <section id="features" className="pt-20 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium bg-transparent text-transparent border-transparent font-manrope invisible">
            {getContentByKey('features', 'badge_text') || '✨ Powerful Features'}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 font-dm-sans">
            {getContentByKey('features', 'title') || 'Everything You Need to'}
            <span className="block text-[#ff4d00]">
              {getContentByKey('features', 'title_accent') || 'Sell More Tickets'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-manrope">
            {getContentByKey('features', 'description') || 'From simple events to complex productions, our platform adapts to your needs with professional-grade tools and stunning design.'}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-gray-200 bg-white backdrop-blur-sm"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="bg-[#ff4d00]/10 p-3 rounded-lg group-hover:bg-[#ff4d00]/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-[#ff4d00]" />
                  </div>
                  <Badge variant="outline" className="text-xs text-black border-gray-600 font-manrope">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-[#ff4d00] transition-colors text-gray-900 font-dm-sans">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed font-manrope">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>


      </div>
    </section>
  );
};