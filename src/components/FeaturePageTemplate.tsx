import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";

interface FeaturePageProps {
  featureName: string;
  headline: string;
  subheadline: string;
  heroImage?: string;
  introText: string;
  benefits: Array<{
    title: string;
    description: string;
    icon?: ReactNode;
  }>;
  useCases?: Array<{
    title: string;
    description: string;
  }>;
  ctaText?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

export const FeaturePageTemplate = ({
  featureName,
  headline,
  subheadline,
  introText,
  benefits,
  useCases,
  ctaText = "Get Started Free",
  metaTitle,
  metaDescription,
  keywords,
}: FeaturePageProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": metaTitle,
    "description": metaDescription,
    "url": `https://www.ticketflo.org/features/${featureName.toLowerCase().replace(/\s+/g, '-')}`,
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "TicketFlo",
      "applicationCategory": "Event Ticketing Platform",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "NZD"
      }
    }
  };

  return (
    <>
      <SEOHead
        title={metaTitle}
        description={metaDescription}
        canonical={`https://www.ticketflo.org/features/${featureName.toLowerCase().replace(/\s+/g, '-')}`}
        structuredData={structuredData}
        keywords={keywords}
      />
      <div className="min-h-screen bg-white">
        <Navigation />

        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff4d00]/10 rounded-full mb-6">
                <Ticket className="h-4 w-4 text-[#ff4d00]" />
                <span className="text-sm font-medium text-[#ff4d00]">Feature</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-dm-sans">
                {headline}
              </h1>
              <p className="text-xl text-gray-600 mb-8 font-manrope">
                {subheadline}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="bg-[#ff4d00] hover:bg-[#e64500] text-white px-8 py-6 text-lg font-semibold rounded-xl"
                >
                  {ctaText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/contact')}
                  className="px-8 py-6 text-lg font-semibold rounded-xl"
                >
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none font-manrope">
              <p className="text-gray-600 text-lg leading-relaxed">{introText}</p>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 font-dm-sans">
              Key Benefits
            </h2>
            <p className="text-gray-600 text-center mb-12 font-manrope max-w-2xl mx-auto">
              Everything you need to make the most of this feature
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border border-gray-200 bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#ff4d00] rounded-xl flex-shrink-0">
                        {benefit.icon ? (
                          <div className="[&>svg]:text-white [&>svg]:h-5 [&>svg]:w-5">
                            {benefit.icon}
                          </div>
                        ) : (
                          <Check className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 font-dm-sans">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-600 text-sm font-manrope leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        {useCases && useCases.length > 0 && (
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 font-dm-sans">
                Perfect For
              </h2>
              <p className="text-gray-600 text-center mb-12 font-manrope max-w-2xl mx-auto">
                See how different organizations use this feature
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {useCases.map((useCase, index) => (
                  <Card key={index} className="border border-gray-200 bg-white hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 font-dm-sans">
                        {useCase.title}
                      </h3>
                      <p className="text-gray-600 font-manrope text-sm leading-relaxed">
                        {useCase.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing Section */}
        <section className="py-20 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-dm-sans">
              Included in Every Plan
            </h2>
            <p className="text-xl text-gray-300 mb-8 font-manrope">
              {featureName} is included at no extra cost. TicketFlo charges just{" "}
              <span className="text-[#ff4d00] font-bold">1% + $0.50</span> per ticket.
            </p>
            <div className="bg-white/10 rounded-2xl p-8 mb-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Platform Fee</p>
                  <p className="text-3xl font-bold">1% + $0.50</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">Monthly Fee</p>
                  <p className="text-3xl font-bold text-[#ff4d00]">$0</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">{featureName}</p>
                  <p className="text-3xl font-bold text-green-400">Included</p>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-[#ff4d00] hover:bg-[#e64500] text-white px-8 py-6 text-lg font-semibold rounded-xl"
            >
              Start Selling Tickets Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-dm-sans">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 mb-8 font-manrope">
              Join thousands of event organizers using TicketFlo for powerful ticketing with low fees.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-[#ff4d00] hover:bg-[#e64500] text-white px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/contact')}
                className="px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};
