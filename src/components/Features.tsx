import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  MapPin,
  Gift,
  Code,
  Sparkles,
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
    icon: Users,
    title: "Group Sales",
    description: "Bulk bookings for schools, churches, and corporates with dedicated admin portals.",
    badge: "Groups",
    highlight: true
  },
  {
    icon: MapPin,
    title: "Seat Selection",
    description: "Interactive seating charts for theaters, stadiums, and venues.",
    badge: "Seating",
    highlight: true
  },
  {
    icon: Smartphone,
    title: "Check-in App",
    description: "Scan tickets, track attendance, and manage entry in real-time.",
    badge: "Mobile",
    highlight: true
  },
  {
    icon: Code,
    title: "White Label",
    description: "Fully branded experience on your domain with embeddable widgets.",
    badge: "Branding",
    highlight: true
  },
  {
    icon: UserCheck,
    title: "Built-in CRM",
    description: "Track customers across events and segment your audience.",
    badge: "CRM"
  },
  {
    icon: Shield,
    title: "Digital Waivers",
    description: "Collect liability forms for camps, activities, and youth programs.",
    badge: "Safety"
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Real-time sales insights and event performance dashboards.",
    badge: "Insights"
  },
  {
    icon: Gift,
    title: "Promo Codes",
    description: "Discounts, early bird pricing, and affiliate marketing tools.",
    badge: "Sales"
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
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white overflow-hidden"
            >
              <CardHeader className="space-y-4 pb-2">
                <div className="flex items-center gap-4">
                  <div className="bg-[#ff4d00] p-3 rounded-xl">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-[#ff4d00] transition-colors text-gray-900 font-dm-sans">
                      {feature.title}
                    </CardTitle>
                  </div>
                </div>
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