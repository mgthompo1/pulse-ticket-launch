import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, Calendar, TrendingUp, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroDemo = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleContactSales = () => {
    navigate('/contact');
  };

  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-black">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff4d00]/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Trust badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#ff4d00]/10 border border-[#ff4d00]/20 mb-8">
            <CheckCircle2 className="h-4 w-4 text-[#ff4d00]" />
            <span className="text-sm font-medium text-gray-300 font-manrope">Trusted by 10,000+ event organizers</span>
          </div>

          {/* Main headline - Highnote style */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05] font-dm-sans">
            The modern ticketing platform built for{" "}
            <span className="text-[#ff4d00]">event organizers</span>
          </h1>

          {/* Subheadline - value-focused */}
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-manrope">
            Issue tickets, accept payments, and manage events—all on one platform.
            Built for simplicity, trusted by thousands.
          </p>

          {/* Dual CTAs - Highnote pattern */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              variant="hero"
              size="lg"
              className="group hover:bg-[#e64400] border-0 px-8 py-6 rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-[#ff4d00]/25 hover:-translate-y-0.5 w-full sm:w-auto"
              onClick={handleGetStarted}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="font-manrope font-semibold px-8 py-6 text-base rounded-lg transition-all duration-200 border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white hover:bg-gray-800/50 w-full sm:w-auto"
              onClick={handleContactSales}
            >
              Contact Sales
            </Button>
          </div>

          {/* Social proof stats - enhanced spacing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-4xl mx-auto pt-8 border-t border-gray-800/50">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              </div>
              <div className="text-3xl font-bold text-white font-dm-sans mb-1">4.9/5</div>
              <div className="text-sm text-gray-500 font-manrope">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Users className="h-9 w-9 text-[#ff4d00]" />
              </div>
              <div className="text-3xl font-bold text-white font-dm-sans mb-1">10K+</div>
              <div className="text-sm text-gray-500 font-manrope">Event Organizers</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Calendar className="h-9 w-9 text-[#ff4d00]" />
              </div>
              <div className="text-3xl font-bold text-white font-dm-sans mb-1">50K+</div>
              <div className="text-sm text-gray-500 font-manrope">Events Created</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="h-9 w-9 text-[#ff4d00]" />
              </div>
              <div className="text-3xl font-bold text-white font-dm-sans mb-1">$2M+</div>
              <div className="text-sm text-gray-500 font-manrope">In Ticket Sales</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
    </section>
  );
};
