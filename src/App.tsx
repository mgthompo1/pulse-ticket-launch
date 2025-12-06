
import { ClientOnlyToaster } from "@/components/ClientOnlyToaster";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { AuthConfirm } from "./pages/AuthConfirm";
import EmailConfirmation from "./pages/EmailConfirmation";
import OrgDashboard from "./pages/OrgDashboard";
import TicketWidget from "./pages/TicketWidget";
import WidgetRouter from "./pages/WidgetRouter";
import GroupPortal from "./pages/GroupPortal";
import GroupPublicWidget from "./pages/GroupPublicWidget";
import AttractionWidget from "./pages/AttractionWidget";
import AttractionBookingDemo from "./pages/AttractionBookingDemo";
import MasterAdmin from "./pages/MasterAdmin";
import AdminAuth from "./pages/AdminAuth";
import SecureAdminAuth from "./pages/SecureAdminAuth";
import TicketFloLIVE from "./pages/TicketFloLIVE";
import DashboardMockup from "./pages/DashboardMockup";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentCancelled from "./pages/PaymentCancelled";
import XeroCallback from "./pages/XeroCallback";
import HubSpotCallback from "./pages/HubSpotCallback";
import LinkedInCallback from "./pages/LinkedInCallback";
import FacebookCallback from "./pages/FacebookCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import Tickets from "./pages/Tickets";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";
import SentryTest from "./pages/SentryTest";
import ErrorMonitoring from "./pages/ErrorMonitoring";
import DemoLanding from "./pages/DemoLanding";
import { InvitationPasswordSetup } from "./components/InvitationPasswordSetup";
import { InvitationAcceptance } from "./components/InvitationAcceptance";
import TopUpPage from "./pages/TopUpPage";
import QATestingDashboard from "./pages/QATestingDashboard";
import GivvvAuth from "./pages/GivvvAuth";
import CompareEventbrite from "./pages/CompareEventbrite";
import CompareHumanitix from "./pages/CompareHumanitix";
import CompareEventsAir from "./pages/CompareEventsAir";
import FeatureGroupSales from "./pages/FeatureGroupSales";
import FeatureSeating from "./pages/FeatureSeating";
import FeatureWhiteLabel from "./pages/FeatureWhiteLabel";
import FeatureLowFees from "./pages/FeatureLowFees";
import FeatureCheckin from "./pages/FeatureCheckin";
import FeatureCRM from "./pages/FeatureCRM";
import FeatureIntegrations from "./pages/FeatureIntegrations";

const queryClient = new QueryClient();


const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <ClientOnlyToaster />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/confirm" element={<AuthConfirm />} />
                <Route path="/auth/check-email" element={<EmailConfirmation />} />
                <Route path="/auth/givvv" element={<GivvvAuth />} />
                <Route path="/widget/:eventId" element={<WidgetRouter />} />
                <Route path="/group/:slug/widget" element={<GroupPublicWidget />} />
                <Route path="/attraction/:attractionId" element={<AttractionWidget />} />
                <Route path="/booking-demo" element={<AttractionBookingDemo />} />
                <Route path="/topup/:token" element={<TopUpPage />} />
                {/* DEPRECATED: /admin-auth has been removed due to hardcoded credentials security vulnerability */}
                {/* Use /secure-admin instead which has database-backed authentication with TOTP support */}
                <Route path="/secure-admin" element={<SecureAdminAuth />} />
                <Route path="/secure-admin-auth" element={<SecureAdminAuth />} />
                <Route path="/ticketflolive/:eventId" element={<TicketFloLIVE />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                <Route path="/xero-callback" element={<XeroCallback />} />
                <Route path="/hubspot-callback" element={<HubSpotCallback />} />
                <Route path="/dashboard/auth/linkedin/callback" element={<LinkedInCallback />} />
                <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
                <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/help" element={<KnowledgeBase />} />
                <Route path="/help/:categorySlug" element={<KnowledgeBase />} />
                <Route path="/help/:categorySlug/:articleSlug" element={<KnowledgeBase />} />
                <Route path="/dashboard-mockup" element={<DashboardMockup />} />
                <Route path="/invite" element={<InvitationAcceptance />} />
                <Route path="/invitation-setup" element={<InvitationPasswordSetup />} />
                <Route path="/sentry-test" element={<SentryTest />} />
                <Route path="/demo-landing" element={<DemoLanding />} />

                {/* Comparison pages */}
                <Route path="/compare/eventbrite" element={<CompareEventbrite />} />
                <Route path="/compare/humanitix" element={<CompareHumanitix />} />
                <Route path="/compare/eventsair" element={<CompareEventsAir />} />

                {/* Feature pages */}
                <Route path="/features/group-sales" element={<FeatureGroupSales />} />
                <Route path="/features/seating" element={<FeatureSeating />} />
                <Route path="/features/white-label" element={<FeatureWhiteLabel />} />
                <Route path="/features/low-fees" element={<FeatureLowFees />} />
                <Route path="/features/checkin" element={<FeatureCheckin />} />
                <Route path="/features/crm" element={<FeatureCRM />} />
                <Route path="/features/integrations" element={<FeatureIntegrations />} />

                {/* Protected routes */}
                <Route path="/error-monitoring" element={
                  <ProtectedRoute>
                    <ErrorMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/support" element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <OrgDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/master-admin" element={
                  <ProtectedAdminRoute>
                    <MasterAdmin />
                  </ProtectedAdminRoute>
                } />
                <Route path="/qa-testing" element={
                  <ProtectedAdminRoute>
                    <QATestingDashboard />
                  </ProtectedAdminRoute>
                } />
                <Route path="/group/:slug" element={<GroupPortal />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
