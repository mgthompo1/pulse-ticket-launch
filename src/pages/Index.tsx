import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TicketFlo",
    "description": "Professional event ticketing platform with advanced features for organizers and seamless experience for attendees.",
    "url": "https://www.ticketflo.org",
    "logo": "https://www.ticketflo.org/favicon.ico",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "url": "https://www.ticketflo.org"
    },
    "offers": {
      "@type": "Offer",
      "category": "Software as a Service",
      "description": "Event ticketing and management platform"
    }
  };

  return (
    <>
      <SEOHead
        title="TicketFlo - Professional Event Ticketing Platform"
        description="Create, manage, and sell tickets for your events with TicketFlo. Features include seat selection, payment processing, real-time analytics, and more."
        canonical="https://www.ticketflo.org"
        ogTitle="TicketFlo - Professional Event Ticketing Platform"
        ogDescription="The complete solution for event organizers. Sell tickets, manage attendees, and track analytics all in one platform."
        ogImage="https://www.ticketflo.org/og-image.jpg"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main>
          <Hero />
          <Features />
          <Pricing />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
