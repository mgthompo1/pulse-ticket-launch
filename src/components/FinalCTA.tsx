import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-950 to-black">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#ff4d00]/10 via-transparent to-[#ff4d00]/10 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff4d00]/10 border border-[#ff4d00]/20 mb-8">
          <Sparkles className="h-8 w-8 text-[#ff4d00]" />
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight font-dm-sans">
          Ready to transform your
          <br />
          event ticketing?
        </h2>

        {/* Subheadline */}
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-manrope">
          Join thousands of event organizers who trust TicketFlo to power their events.
          Get started in minutes, no credit card required.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button
            variant="default"
            size="lg"
            className="group bg-[#ff4d00] hover:bg-[#e64400] text-white border-0 font-manrope font-semibold px-8 py-6 text-base rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-[#ff4d00]/25 hover:-translate-y-0.5 w-full sm:w-auto"
            onClick={() => navigate('/auth')}
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="font-manrope font-semibold px-8 py-6 text-base rounded-lg transition-all duration-200 border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white hover:bg-gray-800/50 w-full sm:w-auto"
            onClick={() => navigate('/contact')}
          >
            Talk to Sales
          </Button>
        </div>

        {/* Fine print */}
        <p className="text-sm text-gray-600 font-manrope">
          No credit card required • Setup in under 5 minutes • Cancel anytime
        </p>
      </div>
    </section>
  );
};
