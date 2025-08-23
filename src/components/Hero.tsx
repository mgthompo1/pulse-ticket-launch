import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Users, Calendar, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

export const Hero = () => {
  const navigate = useNavigate();
  const { getContentByKey } = useLandingPageContent();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  return (
    <section className="relative pt-24 pb-0 overflow-hidden min-h-screen">
      {/* Background solid black */}
      <div className="absolute inset-0 bg-black" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge - Hidden but spacing preserved */}
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-[#ff4d00]/20 text-white border-[#ff4d00]/30 rounded-full font-manrope opacity-0">
              &nbsp;
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.05] font-dm-sans">
            A modern ticketing platform for all your events
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed font-manrope">
            Create manage and sell tickets - beautifully. Built for simplicity, ease of use and conversion.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center mb-12">
            <Button variant="default" size="xl" className="group bg-[#ff4d00] hover:bg-[#e64400] text-white border-0 font-manrope font-medium px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#ff4d00]/25" onClick={handleStartTrial}>
              {getContentByKey('hero', 'cta_primary') || 'Get started'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 h-8">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              </div>
              <div className="text-2xl font-semibold text-white font-dm-sans">{getContentByKey('hero_stats', 'rating_value') || '4.9/5'}</div>
              <div className="text-sm text-gray-400 font-manrope">{getContentByKey('hero_stats', 'rating_label') || 'User Rating'}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-[#ff4d00]" />
              </div>
              <div className="text-2xl font-semibold text-white font-dm-sans">{getContentByKey('hero_stats', 'organizers_value') || '10K+'}</div>
              <div className="text-sm text-gray-400 font-manrope">{getContentByKey('hero_stats', 'organizers_label') || 'Organizers'}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-8 w-8 text-[#ff4d00]" />
              </div>
              <div className="text-2xl font-semibold text-white font-dm-sans">{getContentByKey('hero_stats', 'events_value') || '50K+'}</div>
              <div className="text-sm text-gray-400 font-manrope">{getContentByKey('hero_stats', 'events_label') || 'Events Created'}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CreditCard className="h-8 w-8 text-[#ff4d00]" />
              </div>
              <div className="text-2xl font-semibold text-white font-dm-sans">{getContentByKey('hero_stats', 'tickets_value') || '$2M+'}</div>
              <div className="text-sm text-gray-400 font-manrope">{getContentByKey('hero_stats', 'tickets_label') || 'Tickets Sold'}</div>
            </div>
          </div>

        </div>
      </div>
      {/* Subtle vignette instead of floating blobs */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
    </section>
  );
};