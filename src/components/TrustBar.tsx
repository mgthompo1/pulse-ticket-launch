import { Building2 } from "lucide-react";

export const TrustBar = () => {
  const customers = [
    "Edge Creative",
    "Pulse Events",
    "Urban Music Festival",
    "Tech Summit 2024",
    "Community Arts Center",
    "Sports League Inc"
  ];

  return (
    <section className="relative py-16 bg-gradient-to-b from-black to-gray-950 border-y border-gray-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider font-manrope mb-8">
            Trusted by event organizers worldwide
          </p>
        </div>

        {/* Customer logos grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {customers.map((customer, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-900/50 transition-colors group"
            >
              <Building2 className="h-8 w-8 text-gray-600 group-hover:text-[#ff4d00] transition-colors mb-3" />
              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-400 transition-colors text-center font-manrope">
                {customer}
              </span>
            </div>
          ))}
        </div>

        {/* Stats below */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center p-6 rounded-lg bg-gray-900/30 border border-gray-800/50">
            <div className="text-3xl font-bold text-white font-dm-sans mb-2">99.9%</div>
            <div className="text-sm text-gray-500 font-manrope">Uptime SLA</div>
          </div>
          <div className="text-center p-6 rounded-lg bg-gray-900/30 border border-gray-800/50">
            <div className="text-3xl font-bold text-white font-dm-sans mb-2">&lt;2s</div>
            <div className="text-sm text-gray-500 font-manrope">Avg Checkout Time</div>
          </div>
          <div className="text-center p-6 rounded-lg bg-gray-900/30 border border-gray-800/50">
            <div className="text-3xl font-bold text-white font-dm-sans mb-2">24/7</div>
            <div className="text-sm text-gray-500 font-manrope">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  );
};
