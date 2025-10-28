import { ArrowRight, Ticket, Palette, BarChart3, Code } from "lucide-react";

const features = [
  {
    icon: Ticket,
    title: "Complete Ticketing Platform",
    description: "Issue tickets, process payments, and manage attendees all in one place. Support for multiple ticket types, pricing tiers, and automated delivery.",
    highlights: [
      "Unlimited ticket types and pricing",
      "Instant digital ticket delivery",
      "QR code check-in system",
      "Group booking support"
    ],
    color: "from-[#ff4d00] to-orange-600"
  },
  {
    icon: Palette,
    title: "White-Label Customization",
    description: "Match your brand perfectly with our powerful customization tools. From colors to checkout flows, make it yours.",
    highlights: [
      "Custom colors and branding",
      "Embeddable widget for your site",
      "Branded confirmation emails",
      "Custom domain support"
    ],
    color: "from-purple-500 to-pink-600"
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Gain deep insights into your event performance with comprehensive reporting and live dashboards.",
    highlights: [
      "Live sales tracking",
      "Customer behavior insights",
      "Revenue forecasting",
      "Exportable reports"
    ],
    color: "from-blue-500 to-cyan-600"
  },
  {
    icon: Code,
    title: "Developer-Friendly API",
    description: "Build custom integrations and automate your workflow with our comprehensive REST API and webhooks.",
    highlights: [
      "RESTful API access",
      "Webhook notifications",
      "Extensive documentation",
      "OAuth 2.0 support"
    ],
    color: "from-green-500 to-emerald-600"
  }
];

export const FeaturesDemo = () => {
  return (
    <section id="features" className="relative py-24 bg-black overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-gray-950" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 font-dm-sans">
            Everything you need to
            <br />
            <span className="text-[#ff4d00]">power your events</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-manrope">
            Built for simplicity, designed for scale. TicketFlo gives you all the tools
            you need to create, manage, and grow your events.
          </p>
        </div>

        {/* Large feature cards - 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-2xl hover:shadow-[#ff4d00]/10"
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} rounded-t-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-7 w-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-4 font-dm-sans group-hover:text-[#ff4d00] transition-colors">
                {feature.title}
              </h3>

              <p className="text-gray-400 text-base mb-6 leading-relaxed font-manrope">
                {feature.description}
              </p>

              {/* Highlights */}
              <ul className="space-y-3 mb-6">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-500 font-manrope">
                    <ArrowRight className="h-4 w-4 text-[#ff4d00] mr-3 mt-0.5 flex-shrink-0" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* Learn more link */}
              <a
                href="#"
                className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-[#ff4d00] transition-colors group/link font-manrope"
              >
                Learn more
                <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 pt-16 border-t border-gray-800/50">
          <p className="text-lg text-gray-400 mb-6 font-manrope">
            Want to see all features in detail?
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center text-[#ff4d00] hover:text-[#e64400] font-semibold transition-colors group font-manrope"
          >
            View full feature comparison
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};
