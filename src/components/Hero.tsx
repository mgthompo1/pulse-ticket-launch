import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, Users, Calendar, CreditCard } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              🎉 Trusted by 10,000+ event organizers worldwide
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Beautiful Event Ticketing
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Create stunning ticketing experiences, manage events effortlessly, and grow your audience with our all-in-one platform. No technical skills required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button variant="hero" size="xl" className="group">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" className="group">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
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
              <div className="text-2xl font-bold text-foreground">4.9/5</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">10K+</div>
              <div className="text-sm text-muted-foreground">Organizers</div>
            </div>
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">50K+</div>
              <div className="text-sm text-muted-foreground">Events Created</div>
            </div>
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">$2M+</div>
              <div className="text-sm text-muted-foreground">Tickets Sold</div>
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