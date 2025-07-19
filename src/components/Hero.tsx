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
    <section className="relative pt-20 pb-16 overflow-hidden">
      {/* Beta Banner */}
      <div className="absolute top-0 left-0 w-full flex justify-center z-20">
        <div className="bg-yellow-400 text-black font-semibold px-6 py-2 rounded-b-lg shadow-lg text-sm tracking-wide">
          🚧 Ticket2 is currently in <span className="font-bold">Beta</span> — Features may change, and your feedback is welcome!
        </div>
      </div>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Beta Badge */}
          <div className="flex justify-center mb-4">
            <Badge variant="destructive" className="px-4 py-2 text-sm font-bold uppercase tracking-wider bg-yellow-400 text-black border-yellow-500">
              Beta
            </Badge>
          </div>
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              {getContentByKey('hero', 'badge_text') || '🎉 Trusted by 10,000+ event organizers worldwide'}
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Ticket2 is in <span className="text-yellow-500">Beta</span>
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Early Access Event Ticketing
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
            You’re using an early-access version of Ticket2. Features may change, bugs may exist, and your feedback will help shape the future of the platform.
          </p>
          <p className="text-base text-yellow-700 mb-8 max-w-2xl mx-auto">
            <strong>What does Beta mean?</strong> Ticket2 is still under active development. We welcome your feedback and suggestions. Please report any issues or ideas to our team!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button variant="hero" size="xl" className="group" onClick={handleStartTrial}>
              {getContentByKey('hero', 'cta_primary') || 'Sign Up Now'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" className="group" onClick={handleWatchDemo}>
              <Play className="mr-2 h-5 w-5" />
              {getContentByKey('hero', 'cta_secondary') || 'Watch Demo'}
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
              <div className="text-2xl font-bold text-foreground">{getContentByKey('hero_stats', 'rating_value') || '4.9/5'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'rating_label') || 'User Rating'}</div>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{getContentByKey('hero_stats', 'organizers_value') || '10K+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'organizers_label') || 'Organizers'}</div>
            </div>
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{getContentByKey('hero_stats', 'events_value') || '50K+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'events_label') || 'Events Created'}</div>
            </div>
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{getContentByKey('hero_stats', 'tickets_value') || '$2M+'}</div>
              <div className="text-sm text-muted-foreground">{getContentByKey('hero_stats', 'tickets_label') || 'Tickets Sold'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-gradient-primary/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute top-1/3 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute bottom-1/4 left-1/4 w-16 h-16 bg-primary/30 rounded-full blur-lg animate-pulse delay-500" />
    </section>
  );
};