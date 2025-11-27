import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  BarChart3,
  MapPin,
  Mail,
  Gift,
  MessageSquare,
  Code,
  Infinity as InfinityIcon,
  Sparkles,
  Zap,
  Smartphone,
  Users,
  Shield,
  UserCheck,
  Building2,
  FileCheck
} from "lucide-react";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

const features = [
  {
    icon: Smartphone,
    title: "Organiser App",
    description: "Streamline event entry with our native app. Scan tickets, track attendance, and manage check-ins in real-time.",
    badge: "Mobile",
    highlight: true
  },
  {
    icon: Users,
    title: "Group Sales & Management",
    description: "Handle bulk bookings with ease. Perfect for schools, corporate events, and tour groups with dedicated group management tools.",
    badge: "Groups",
    highlight: true
  },
  {
    icon: UserCheck,
    title: "Customer CRM",
    description: "Built-in customer relationship management. Track purchase history, segment audiences, and build lasting relationships.",
    badge: "CRM",
    highlight: true
  },
  {
    icon: Shield,
    title: "Digital Waivers",
    description: "Collect liability waivers and consent forms digitally. Perfect for camps, adventure activities, churches, and youth programs.",
    badge: "Safety",
    highlight: true
  },
  {
    icon: InfinityIcon,
    title: "Unlimited Ticket Types",
    description: "Create as many ticket categories as you need with flexible pricing, quantities, and availability windows.",
    badge: "Core"
  },
  {
    icon: Palette,
    title: "Brand Customization",
    description: "Match your brand perfectly with our intuitive design tools. Custom colors, fonts, and layouts.",
    badge: "Design"
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Deep insights into sales, customer behavior, and event performance with live dashboards.",
    badge: "Analytics"
  },
  {
    icon: MapPin,
    title: "Reserved Seating",
    description: "Interactive seating charts with drag-and-drop functionality for theaters, stadiums, and venues.",
    badge: "Premium"
  },
  {
    icon: Mail,
    title: "Email Campaigns",
    description: "Built-in email marketing tools to promote your events and engage with your audience.",
    badge: "Marketing"
  },
  {
    icon: Gift,
    title: "Promotion Tools",
    description: "Discount codes, early bird pricing, bundle deals, and affiliate marketing capabilities.",
    badge: "Sales"
  },
  {
    icon: Code,
    title: "Embed Anywhere",
    description: "White-label ticketing widget that seamlessly integrates with your existing website.",
    badge: "Integration"
  },
  {
    icon: Zap,
    title: "Fast Checkout",
    description: "Optimized checkout flow with multiple payment options and mobile-first design.",
    badge: "Performance"
  }
];

export const Features = () => {
  const { getContentByKey } = useLandingPageContent();

  // Separate highlighted and regular features
  const highlightedFeatures = features.filter(f => f.highlight);
  const regularFeatures = features.filter(f => !f.highlight);

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20 font-manrope">
            ✨ Powerful Features
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 font-dm-sans">
            Everything you need to
            <span className="block bg-gradient-to-r from-[#ff4d00] to-[#ff6b2c] bg-clip-text text-transparent">
              run successful events
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-manrope">
            From ticket sales to check-in, group bookings to customer management — we've built the complete toolkit for modern event organizers.
          </p>
        </div>

        {/* Highlighted Features - 2x2 grid with larger cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {highlightedFeatures.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-[#ff4d00]/20 bg-gradient-to-br from-white to-orange-50/30 backdrop-blur-sm overflow-hidden relative"
            >
              {/* Accent border top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff4d00] to-[#ff6b2c]" />

              <CardHeader className="space-y-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="bg-[#ff4d00] p-3 rounded-xl shadow-lg shadow-[#ff4d00]/25">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-[#ff4d00] text-white border-0 font-manrope text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-2xl group-hover:text-[#ff4d00] transition-colors text-gray-900 font-dm-sans">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed font-manrope text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Regular Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {regularFeatures.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white"
            >
              <CardHeader className="space-y-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="bg-gray-100 p-2.5 rounded-lg group-hover:bg-[#ff4d00]/10 transition-colors">
                    <feature.icon className="h-5 w-5 text-gray-700 group-hover:text-[#ff4d00] transition-colors" />
                  </div>
                  <Badge variant="outline" className="text-xs text-gray-600 border-gray-300 font-manrope">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg group-hover:text-[#ff4d00] transition-colors text-gray-900 font-dm-sans">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-gray-500 leading-relaxed font-manrope text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider font-manrope">Built for</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-gray-400">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-manrope text-sm">Conferences</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-manrope text-sm">Camps & Churches</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-manrope text-sm">Festivals</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="font-manrope text-sm">Theaters & Venues</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              <span className="font-manrope text-sm">Sports Events</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};