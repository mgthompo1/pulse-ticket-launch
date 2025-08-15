import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, Users, Calendar, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

export const Hero = () => {
  const navigate = useNavigate();
  const { getContentByKey } = useLandingPageContent();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  const handleWatchDemo = () => {
    // Scroll to features section for demo
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
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
            A modern ticket platform for all events
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create manage and sell tickets - beautifully. Built for simplicity, ease of use and conversion.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Button variant="default" size="xl" className="group" onClick={handleStartTrial}>
              {getContentByKey('hero', 'cta_primary') || 'Get started'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" className="group" onClick={handleWatchDemo}>
              <Play className="mr-2 h-5 w-5" />
              {getContentByKey('hero', 'cta_secondary') || 'View demo'}
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              </div>
              <div className="text-2xl font-semibold text-foreground">{getContentByKey('hero_stats', 'rating_value') || '4.9/5'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'rating_label') || 'User Rating'}</div>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold text-foreground">{getContentByKey('hero_stats', 'organizers_value') || '10K+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'organizers_label') || 'Organizers'}</div>
            </div>
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold text-foreground">{getContentByKey('hero_stats', 'events_value') || '50K+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'events_label') || 'Events Created'}</div>
            </div>
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold text-foreground">{getContentByKey('hero_stats', 'tickets_value') || '$2M+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'tickets_label') || 'Tickets Sold'}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Subtle vignette instead of floating blobs */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
    </section>
  );
};