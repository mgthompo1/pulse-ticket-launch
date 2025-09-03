import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "TicketFlo - Professional Event Ticketing Platform",
    "description": "Create, manage, and sell tickets for your events with TicketFlo. Features include seat selection, payment processing, real-time analytics, and more.",
    "url": "https://www.ticketflo.org",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "TicketFlo Event Ticketing Platform",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "description": "Professional event ticketing platform with advanced features for organizers and seamless experience for attendees.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free trial available"
      },
      "featureList": [
        "Seat Selection & Interactive Charts",
        "Real-time Analytics & Reporting",
        "Payment Processing Integration",
        "Email Marketing Campaigns",
        "Discount Codes & Promotions",
        "White-label Ticketing Widget",
        "Mobile-optimized Checkout",
        "24/7 Priority Support",
        "API Access & Integrations",
        "AI-powered Insights",
        "Multi-venue Management"
      ]
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.ticketflo.org"
        }
      ]
    }
  };

  return (
    <>
      <SEOHead
        title="TicketFlo - Professional Event Ticketing Platform | #1 Event Management Software"
        description="Create, manage, and sell tickets for your events with TicketFlo. Leading event ticketing platform with seat selection, payment processing, real-time analytics, and more. Start your free trial today!"
        canonical="https://www.ticketflo.org"
        ogTitle="TicketFlo - Professional Event Ticketing Platform | #1 Event Management Software"
        ogDescription="The complete solution for event organizers. Sell tickets, manage attendees, and track analytics all in one platform. Start your free trial today!"
        ogImage="https://www.ticketflo.org/og-image.jpg"
        structuredData={structuredData}
        keywords="TicketFlo, event ticketing, online ticketing platform, event management software, ticket sales, seat selection, event booking, professional ticketing, event organizer tools, digital ticketing, event management platform, ticket management, event ticketing software, online event tickets, event registration, ticketing system, event planning software, ticket sales platform, event management tools, automated ticketing, best event ticketing platform, top event management software"
        twitterSite="@ticketflo"
        twitterCreator="@ticketflo"
        author="TicketFlo Team"
      />
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="bg-black">
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
