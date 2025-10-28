import { NavigationDemo } from "@/components/NavigationDemo";
import { HeroDemo } from "@/components/HeroDemo";
import { TrustBar } from "@/components/TrustBar";
import { FeaturesDemo } from "@/components/FeaturesDemo";
import { Pricing } from "@/components/Pricing";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

const DemoLanding = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "TicketFlo - Modern Event Ticketing Platform",
    "description": "The modern ticketing platform built for event organizers. Issue tickets, accept payments, and manage events—all on one platform.",
    "url": "https://www.ticketflo.org",
  };

  return (
    <>
      <SEOHead
        title="TicketFlo - Modern Event Ticketing Platform | Built for Organizers"
        description="The modern ticketing platform built for event organizers. Issue tickets, accept payments, and manage events—all on one platform. Trusted by 10,000+ organizers."
        canonical="https://www.ticketflo.org"
        ogTitle="TicketFlo - Modern Event Ticketing Platform"
        ogDescription="Issue tickets, accept payments, and manage events—all on one platform. Built for simplicity, trusted by thousands."
        structuredData={structuredData}
        keywords="event ticketing, ticketing platform, event management, online tickets, ticket sales, event organizer"
      />
      <div className="min-h-screen bg-black text-white">
        <NavigationDemo />
        <main className="bg-black">
          <HeroDemo />
          <TrustBar />
          <FeaturesDemo />
          <Pricing />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default DemoLanding;
