import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, ArrowRight, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface ComparisonFeature {
  feature: string;
  ticketflo: boolean | string;
  competitor: boolean | string;
  highlight?: boolean;
}

interface ComparisonPageProps {
  competitorName: string;
  competitorLogo?: string;
  headline: string;
  subheadline: string;
  introText: string;
  features: ComparisonFeature[];
  ticketfloBenefits: string[];
  competitorDrawbacks: string[];
  ctaText?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

export const ComparisonPageTemplate = ({
  competitorName,
  competitorLogo,
  headline,
  subheadline,
  introText,
  features,
  ticketfloBenefits,
  competitorDrawbacks,
  ctaText = "Start Free with TicketFlo",
  metaTitle,
  metaDescription,
  keywords,
}: ComparisonPageProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": metaTitle,
    "description": metaDescription,
    "url": `https://www.ticketflo.org/compare/${competitorName.toLowerCase().replace(/\s+/g, '-')}`,
    "mainEntity": {
      "@type": "Product",
      "name": "TicketFlo",
      "description": "Modern event ticketing platform",
      "brand": {
        "@type": "Brand",
        "name": "TicketFlo"
      }
    }
  };

  return (
    <>
      <SEOHead
        title={metaTitle}
        description={metaDescription}
        canonical={`https://www.ticketflo.org/compare/${competitorName.toLowerCase().replace(/\s+/g, '-')}`}
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
                <span className="text-sm font-medium text-[#ff4d00]">Comparison</span>
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

        {/* Comparison Table */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 font-dm-sans">
              Feature Comparison
            </h2>

            {/* Table Header */}
            <div className="bg-white rounded-t-2xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-900 text-white">
                <div className="p-6 font-semibold font-dm-sans">Feature</div>
                <div className="p-6 font-semibold font-dm-sans text-center border-l border-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Ticket className="h-5 w-5 text-[#ff4d00]" />
                    TicketFlo
                  </div>
                </div>
                <div className="p-6 font-semibold font-dm-sans text-center border-l border-gray-700">
                  {competitorName}
                </div>
              </div>

              {/* Table Body */}
              {features.map((item, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-3 border-t border-gray-200 ${
                    item.highlight ? 'bg-[#ff4d00]/5' : ''
                  }`}
                >
                  <div className="p-5 font-medium text-gray-900 font-manrope">
                    {item.feature}
                    {item.highlight && (
                      <span className="ml-2 text-xs bg-[#ff4d00] text-white px-2 py-0.5 rounded-full">
                        Key
                      </span>
                    )}
                  </div>
                  <div className="p-5 text-center border-l border-gray-200">
                    {typeof item.ticketflo === 'boolean' ? (
                      item.ticketflo ? (
                        <Check className="h-6 w-6 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-6 w-6 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-gray-700 font-medium">{item.ticketflo}</span>
                    )}
                  </div>
                  <div className="p-5 text-center border-l border-gray-200">
                    {typeof item.competitor === 'boolean' ? (
                      item.competitor ? (
                        <Check className="h-6 w-6 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-6 w-6 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-gray-700 font-medium">{item.competitor}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits vs Drawbacks */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* TicketFlo Benefits */}
              <Card className="border-2 border-green-200 bg-green-50/50">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Ticket className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 font-dm-sans">
                      Why Choose TicketFlo
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    {ticketfloBenefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-manrope">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Competitor Drawbacks */}
              <Card className="border-2 border-red-200 bg-red-50/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 font-dm-sans">
                    {competitorName} Limitations
                  </h3>
                  <ul className="space-y-4">
                    {competitorDrawbacks.map((drawback, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-manrope">{drawback}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-20 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-dm-sans">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 mb-8 font-manrope">
              TicketFlo charges just <span className="text-[#ff4d00] font-bold">1% + $0.50</span> per ticket.
              No hidden fees, no monthly subscriptions, no surprises.
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
                  <p className="text-gray-400 text-sm mb-2">Setup Fee</p>
                  <p className="text-3xl font-bold text-[#ff4d00]">$0</p>
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
              Ready to Make the Switch?
            </h2>
            <p className="text-xl text-gray-600 mb-8 font-manrope">
              Join thousands of event organizers who've switched to TicketFlo for better features and lower fees.
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
