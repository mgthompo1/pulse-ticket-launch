import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceData {
  id: string;
  invoice_number: string;
  total: number;
  client_name: string;
  client_email: string;
  company_name: string;
  status: string;
  paid_at: string;
}

export default function InvoicePaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const invoiceId = searchParams.get("invoice");
    
    if (invoiceId) {
      loadInvoiceDetails(invoiceId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadInvoiceDetails = async (invoiceId: string) => {
    try {
      // Get invoice details
      const { data: invoiceData, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error) {
        console.error("Error loading invoice:", error);
        toast({
          title: "Error",
          description: "Could not load invoice details",
          variant: "destructive"
        });
        return;
      }

      // Update invoice status to paid if not already
      if (invoiceData.status !== 'paid') {
        await supabase
          .from("invoices")
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq("id", invoiceId);
      }

      setInvoice(invoiceData);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing payment...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the invoice details. Please contact the business if you have any questions.
            </p>
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-green-700">
            Payment Successful!
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Your invoice payment has been processed successfully
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Payment Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">${invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid By:</span>
                <span className="font-medium">{invoice.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {new Date(invoice.paid_at || new Date()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              What's Next?
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• A payment confirmation email will be sent to {invoice.client_email}</li>
              <li>• {invoice.company_name} has been notified of your payment</li>
              <li>• Keep this page for your records</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.print()} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Print Receipt
            </Button>
            
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Questions about your payment? Contact {invoice.company_name} directly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}