import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

export const Hero = () => {
  const navigate = useNavigate();
  const { getContentByKey } = useLandingPageContent();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  return (
    <section className="relative pt-24 pb-20 overflow-hidden">
      {/* Background gradient refined */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border-primary/20 rounded-full">
              {getContentByKey('hero', 'badge_text') || '🎉 Trusted by 10,000+ event organizers worldwide'}
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground mb-6 leading-[1.05]">
            A modern ticketing platform for all your events
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create manage and sell tickets - beautifully. Built for simplicity, ease of use and conversion.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center mb-12">
            <Button variant="default" size="xl" className="group" onClick={handleStartTrial}>
              {getContentByKey('hero', 'cta_primary') || 'Get started'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

        </div>
      </div>
      {/* Subtle vignette instead of floating blobs */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
    </section>
  );
};