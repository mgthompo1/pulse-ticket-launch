
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
import OrgDashboard from "./pages/OrgDashboard";
import TicketWidget from "./pages/TicketWidget";
import GroupTicketWidget from "./pages/GroupTicketWidget";
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
import { InvitationPasswordSetup } from "./components/InvitationPasswordSetup";
import { InvitationAcceptance } from "./components/InvitationAcceptance";

const queryClient = new QueryClient();


const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <ClientOnlyToaster />
          <Routes>
            {/* Public routes - NO theme context, consistent appearance */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/widget/:eventId" element={<TicketWidget />} />
            <Route path="/group/:slug" element={<GroupTicketWidget />} />
            <Route path="/attraction/:attractionId" element={<AttractionWidget />} />
            <Route path="/booking-demo" element={<AttractionBookingDemo />} />
            {/* DEPRECATED: /admin-auth has been removed due to hardcoded credentials security vulnerability */}
            {/* Use /secure-admin instead which has database-backed authentication with TOTP support */}
            <Route path="/secure-admin" element={<SecureAdminAuth />} />
            <Route path="/secure-admin-auth" element={<SecureAdminAuth />} />
            <Route path="/ticketflolive/:eventId" element={<TicketFloLIVE />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            <Route path="/xero-callback" element={<XeroCallback />} />
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
            <Route path="/error-monitoring" element={
              <ThemeProvider>
                <ProtectedRoute>
                  <ErrorMonitoring />
                </ProtectedRoute>
              </ThemeProvider>
            } />

            {/* Authenticated routes - WITH theme context */}
            <Route path="/support" element={
              <ThemeProvider>
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              </ThemeProvider>
            } />
            <Route path="/dashboard" element={
              <ThemeProvider>
                <ProtectedRoute>
                  <OrgDashboard />
                </ProtectedRoute>
              </ThemeProvider>
            } />
            <Route path="/master-admin" element={
              <ThemeProvider>
                <ProtectedAdminRoute>
                  <MasterAdmin />
                </ProtectedAdminRoute>
              </ThemeProvider>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
