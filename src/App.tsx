
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OrgDashboard from "./pages/OrgDashboard";
import TicketWidget from "./pages/TicketWidget";
import MasterAdmin from "./pages/MasterAdmin";
import AdminAuth from "./pages/AdminAuth";
import SecureAdminAuth from "./pages/SecureAdminAuth";
import TicketFloLIVE from "./pages/TicketFloLIVE";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentCancelled from "./pages/PaymentCancelled";
import XeroCallback from "./pages/XeroCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - NO theme context, consistent appearance */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/widget/:eventId" element={<TicketWidget />} />
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/secure-admin" element={<SecureAdminAuth />} />
            <Route path="/ticketflolive/:eventId" element={<TicketFloLIVE />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            <Route path="/xero-callback" element={<XeroCallback />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/contact" element={<Contact />} />
            
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
