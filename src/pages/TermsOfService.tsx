import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Terms of Service - TicketFlo",
    "description": "TicketFlo's terms of service outlining the rules and guidelines for using our platform.",
    "url": "https://www.ticketflo.org/terms"
  };

  return (
    <>
      <SEOHead
        title="Terms of Service - TicketFlo"
        description="Read TicketFlo's terms of service. Understand your rights and responsibilities when using our event ticketing platform."
        canonical="https://www.ticketflo.org/terms"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
          <article>
            <header className="mb-8">
              <div className="flex justify-start mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-manrope"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>

              <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
              <p className="text-lg text-muted-foreground mb-2">
                Effective Date: 27 December 2025
              </p>
              <p className="text-muted-foreground">
                <strong>Company:</strong> Ticketflo Limited ("Ticketflo," "we," "us," or "our")<br />
                <strong>Platform:</strong> SaaS event management and ticketing services delivered via web, iOS, and Android applications ("Platform")<br />
                <strong>Services:</strong> Ticketflo products, APIs, dashboards, widgets, and related services
              </p>
            </header>

            <div className="prose prose-lg max-w-none text-foreground">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Agreement</h2>
                <p className="mb-6">
                  By accessing or using the Ticketflo Platform or Services, you ("User," "Organizer," "Merchant," or "Partner") agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform or Services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
                <ul className="list-none space-y-3 mb-6">
                  <li><strong>Organizer:</strong> An individual or business creating and managing events on the Platform.</li>
                  <li><strong>Merchant:</strong> An Organizer or business accepting payments through Ticketflo-connected payment providers.</li>
                  <li><strong>Attendee:</strong> End-user receiving or purchasing tickets.</li>
                  <li><strong>Partner/ISV:</strong> Integration partners using Ticketflo APIs or referral/onboarding flows.</li>
                  <li><strong>Payment Provider:</strong> Third-party PSPs or acquirers (e.g., Stripe, Windcave, etc.).</li>
                  <li><strong>Tickets:</strong> Digital assets including QR, Apple Wallet, Google Wallet, or NFC-enabled passes.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
                <p className="mb-6">
                  Users must be at least 18 years of age or the legal age of majority in their jurisdiction to use the Services as an Organizer or Merchant. Attendees under 18 may use the Services only with supervision of a parent or guardian.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Account Registration & Security</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Users must provide accurate, current information during signup.</li>
                  <li>Organizers/Merchants are responsible for safeguarding their login credentials.</li>
                  <li>Ticketflo is not liable for unauthorized account access where the User has failed to maintain credential security.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Use of Services</h2>
                <p className="mb-4">Users agree not to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Use the Platform for unlawful, fraudulent, or abusive purposes.</li>
                  <li>Attempt to reverse engineer, exploit, or compromise the Services or APIs.</li>
                  <li>Circumvent any security, rate limits, or payment controls.</li>
                  <li>Use automated tools to scrape or extract Platform data without written permission.</li>
                </ul>
                <p className="mb-6">
                  Ticketflo may suspend or terminate accounts that violate these rules.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Event Listings & Content</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Organizers are solely responsible for event accuracy, ticket legitimacy, pricing, refunds, taxes, fees, and compliance with local laws.</li>
                  <li>Ticketflo does not guarantee event success, attendance levels, or revenue outcomes.</li>
                  <li>Ticketflo may remove or edit event listings that violate policy or legal requirements.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Payments & Third-Party PSPs</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Ticketflo acts as a software platform, not a payment processor or acquirer.</li>
                  <li>Payments are processed by third-party Payment Providers.</li>
                  <li>Organizers/Merchants agree to the terms of their chosen Payment Provider(s).</li>
                  <li>Ticketflo is not liable for payment failures, chargebacks, settlement timing, or PSP compliance decisions.</li>
                  <li>Ticketflo may log, summarize, or report payment success/failure metrics for product and support purposes.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Fees & Billing</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Ticketflo may charge platform or service fees as displayed at checkout or in Organizer dashboards.</li>
                  <li>Fees may vary by region, currency, or payment provider.</li>
                  <li>All fees are non-refundable, unless required by law or explicitly stated otherwise.</li>
                  <li>Pricing changes may occur with 30 days' notice for Organizers/Merchants.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Refunds, Cancellations & Disputes</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Organizers set and manage refund policies.</li>
                  <li>Ticketflo may facilitate refund requests via software, but refund execution is performed by Payment Providers or Organizers, not Ticketflo.</li>
                  <li>Ticketflo is not liable for disputes between Organizers, Merchants, and Attendees.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">10. Data, Privacy & Security</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Use of Services is also governed by our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.</li>
                  <li>Ticketflo uses industry-standard encryption and secure authentication but does not guarantee absolute protection from internet-based threats.</li>
                  <li>Users must not upload malware, illegal content, or sensitive personal data beyond what is required to deliver the Services.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">11. API Usage & Integrations</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>API access is licensed, not sold.</li>
                  <li>Partners/Merchants may not resell API access or keys without written approval.</li>
                  <li>API use must comply with documentation, rate limits, and fair use expectations.</li>
                  <li>Ticketflo may revoke API keys if abuse, fraud, or platform instability occurs.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">12. Uptime & Service Availability</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Ticketflo targets 99.9% uptime but does not guarantee uninterrupted service.</li>
                  <li>Maintenance windows or outages may occur.</li>
                  <li>Incident logs and error grouping may be generated automatically by the Platform.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">13. Intellectual Property</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Ticketflo owns all software, APIs, UI, trademarks, content, and design systems.</li>
                  <li>Users may not copy or redistribute Platform source code, UI assets, or proprietary content without permission.</li>
                  <li>Organizers retain ownership of their own event content.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">14. User-Generated Tickets & Wallet Passes</h2>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Ticketflo may generate QR codes and wallet passes on behalf of Organizers.</li>
                  <li>Organizers may not misrepresent Ticketflo passes as government-issued or payment network instruments.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">15. Limitation of Liability</h2>
                <p className="mb-4">To the maximum extent permitted by law, Ticketflo is not liable for:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Loss of revenue, profit, data, business opportunities, or event attendance.</li>
                  <li>Payment processing outcomes handled by third parties.</li>
                  <li>Fraud or abuse originating from User-generated content or events.</li>
                  <li>Indirect, incidental, or consequential damages.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">16. Termination</h2>
                <p className="mb-4">Ticketflo may terminate or suspend accounts or API access at its discretion if:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Terms are violated</li>
                  <li>Fraud, abuse, or platform risk is detected</li>
                  <li>Organizer/Merchant actions expose Ticketflo to legal or financial risk</li>
                </ul>
                <p className="mb-6">Users may close their account anytime.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">17. Governing Law</h2>
                <p className="mb-6">
                  These Terms are governed by the laws of New Zealand, unless local consumer protection laws require otherwise.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">18. Changes to Terms</h2>
                <p className="mb-6">
                  We may update these Terms from time to time. Continued use of the Services means you accept the updated Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">19. Contact</h2>
                <p className="mb-4">For questions regarding these Terms:</p>
                <p>
                  <strong>Ticketflo Limited</strong><br />
                  Support Email:{" "}
                  <a href="mailto:support@ticketflo.org" className="text-primary hover:underline">
                    support@ticketflo.org
                  </a><br />
                  Address: Auckland, New Zealand
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

export default TermsOfService;
