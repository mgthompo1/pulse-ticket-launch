import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy - TicketFlo",
    "description": "TicketFlo's privacy policy outlining how we collect, use, and protect your personal data.",
    "url": "https://www.ticketflo.org/privacy-policy"
  };

  return (
    <>
      <SEOHead
        title="Privacy Policy - TicketFlo"
        description="Learn about TicketFlo's privacy practices, how we collect and use personal data, and your rights regarding your information."
        canonical="https://www.ticketflo.org/privacy-policy"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <article>
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
              <p className="text-lg text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </header>

            <div className="prose prose-lg max-w-none text-foreground">
              <section className="mb-8">
                <p className="text-lg leading-relaxed mb-6">
                  This Privacy Policy includes important information about your personal data and we encourage you to read it carefully.
                </p>

                <p className="mb-6">
                  We provide ticketing services through the internet to businesses of all sizes who use our technology and services to sell tickets to consumers online. Ticketflo Inc. wants to be clear about our use of the Personal Data that is entrusted to us.
                </p>

                <p className="mb-6">
                  This Privacy Policy ("Policy") describes the "Personal Data" that we collect about you, how we use it, how we share it, your rights and choices, and how you can contact us about our privacy practices. This Policy also outlines your data subject rights, including the right to object to some uses of your Personal Data by us.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Who We Are</h2>
                <p className="mb-6">
                  "Ticketflo, "we", "our" or "us" means Ticketflo inc which is the entity responsible for the collection and use of Personal Data under this Privacy Policy. This Privacy Policy applies to the collection and use of Personal Data on the purchase of tickets and items for events hosted in the United States, meaning that it could apply to residents of the United States or other countries who purchase tickets to events hosted in the United States.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Definitions</h2>
                
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">Personal Data</h3>
                  <p className="mb-4">
                    "Personal Data" means any information that relates to an identified or identifiable individual, and can include information that you provide to us to facilitate a transaction (such as first and last name, email address, billing address/shipping address, zip code and phone number) and that we collect about you, such as when you engage with our Services (e.g. device information, IP address).
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">Business Services</h3>
                  <p className="mb-4">
                    Our "Business Services" are services provided by Ticketflo to entities ("Business Users") who directly and indirectly provide us with "End Customer" Personal Data in connection with those Business Users' own business and activities.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">Transaction Data</h3>
                  <p className="mb-4">
                    "Transaction Data" as used in this Privacy Policy includes Personal Data, and may include the following: your name, email address, billing address, shipping address, payment method information, location, purchase amount, date of purchase and your phone number.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">User Types</h3>
                  <p className="mb-4">
                    Depending on the context, "you" means End Customer or Visitor:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      When you do business with, or otherwise transact with, a Business User (e.g. when you buy tickets from a merchant that uses TicketFlo technology and services) but are not directly doing business with Ticketflo we refer to you as an "End Customer."
                    </li>
                    <li>
                      When you visit Ticketflo.org or otherwise communicate with Ticketflo we refer to you as a "Visitor" (e.g. you send Ticketflo a message asking for more information because you are considering being a user of our technology or services).
                    </li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@ticketflo.org" className="text-primary hover:underline">
                    privacy@ticketflo.org
                  </a>
                </p>
              </section>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;