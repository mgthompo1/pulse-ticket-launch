import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OrgDashboard from "./pages/OrgDashboard";
import TicketWidget from "./pages/TicketWidget";
import MasterAdmin from "./pages/MasterAdmin";
import AdminAuth from "./pages/AdminAuth";
import SecureAdminAuth from "./pages/SecureAdminAuth";
import Ticket2LIVE from "./pages/Ticket2LIVE";
import Invoicing from "./pages/Invoicing";
import PaymentSuccess from "./pages/PaymentSuccess";
import InvoicePaymentSuccess from "./pages/InvoicePaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentCancelled from "./pages/PaymentCancelled";
import XeroCallback from "./pages/XeroCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <OrgDashboard />
                </ProtectedRoute>
              } />
              <Route path="/invoicing" element={
                <ProtectedRoute>
                  <Invoicing />
                </ProtectedRoute>
              } />
              <Route path="/widget/:eventId" element={<TicketWidget />} />
              <Route path="/admin-auth" element={<AdminAuth />} />
              <Route path="/secure-admin" element={<SecureAdminAuth />} />
              <Route path="/master-admin" element={<MasterAdmin />} />
              <Route path="/ticket2live/:eventId" element={<Ticket2LIVE />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/invoice-payment-success" element={<InvoicePaymentSuccess />} />
              <Route path="/payment-failed" element={<PaymentFailed />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route path="/xero-callback" element={<XeroCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
