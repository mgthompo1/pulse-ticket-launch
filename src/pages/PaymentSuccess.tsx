import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Mail, Download, Eye, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TicketDisplay } from "@/components/TicketDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showTickets, setShowTickets] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingOfficialPDF, setIsDownloadingOfficialPDF] = useState(false);

  const loadTickets = async () => {
    if (!orderDetails) return;
    
    try {
      // Get only ticket items (not merchandise) and their tickets
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*, tickets(*), ticket_types(name)')
        .eq('order_id', orderDetails.id)
        .eq('item_type', 'ticket'); // Only get ticket items

      if (orderItemsError) {
        console.error('Error fetching tickets:', orderItemsError);
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        console.error('No tickets found for this order');
        return;
      }

      const formattedTickets = orderItems.flatMap(item => 
        (item.tickets || []).map((ticket: any) => ({
          ...ticket,
          ticketTypeName: item.ticket_types?.name ?? "Ticket",
          eventName: orderDetails.events?.name,
          eventDate: orderDetails.events?.event_date,
          customerName: orderDetails.customer_name
        }))
      );

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const viewTickets = async () => {
    await loadTickets();
    setShowTickets(true);
  };

  const printTickets = () => {
    const printContent = document.getElementById('tickets-print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Tickets</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            .ticket-container { 
              page-break-after: always; 
              margin-bottom: 30px;
            }
            .ticket-container:last-child { 
              page-break-after: avoid; 
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .ticket-container { 
                page-break-after: always; 
                margin-bottom: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const ticketElements = document.querySelectorAll('.ticket-for-pdf');
      
      for (let i = 0; i < ticketElements.length; i++) {
        const element = ticketElements[i] as HTMLElement;
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170; // A4 width minus margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
      }
      
      pdf.save(`${orderDetails.events?.name || 'Event'}-tickets.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const addToWallet = () => {
    // This would typically integrate with Apple Wallet or Google Pay
    // For now, we'll show an alert with instructions
    alert('To add tickets to your mobile wallet:\n\n1. Take a screenshot of your tickets\n2. Save the QR codes to your photos\n3. Show the QR codes at the event entrance\n\nWallet integration coming soon!');
  };

  const downloadOfficialPDF = async () => {
    if (!orderDetails?.id) return;
    
    setIsDownloadingOfficialPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ticket-pdf', {
        body: { orderId: orderDetails.id }
      });

      if (error || !data?.pdf) {
        throw new Error(error?.message || 'Failed to generate PDF');
      }

      // Convert base64 to blob and download
      const base64Data = data.pdf;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'tickets.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingOfficialPDF(false);
    }
  };

  useEffect(() => {
    const updateOrderStatus = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(location.search);
        const sessionId = urlParams.get('sessionId');
        const merchantReference = urlParams.get('merchantReference');
        const orderId = urlParams.get('orderId');
        
        console.log('Payment success params:', { sessionId, merchantReference, orderId });
        console.log('Full URL search:', location.search);

        if (sessionId || merchantReference || orderId) {
          // Try to find the order by different parameters
          let order = null;
          
          // First try to find by orderId (for Stripe payments)
          if (orderId) {
            const { data: orderById, error: orderError } = await supabase
              .from('orders')
              .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, widget_customization, organizations(logo_url, name))')
              .eq('id', orderId)
              .single();

            if (!orderError && orderById) {
              order = orderById;
              console.log('Found order by order ID:', order.id);
            }
          }
          
          // Then try to find by windcave_session_id (for Windcave payments)
          if (sessionId) {
            const { data: orderBySession, error: sessionError } = await supabase
              .from('orders')
              .select('*, events(name, event_date, venue, logo_url, description, organization_id, ticket_customization, widget_customization, organizations(logo_url, name))')
              .eq('windcave_session_id', sessionId)
              .single();

            if (!sessionError && orderBySession) {
              order = orderBySession;
              console.log('Found order by session ID:', order.id);
            }
          }

          // Don't fall back to random orders - only show if we can identify the specific order
          if (!order) {
            console.log('Could not find order by orderId or sessionId - not showing any order details');
          }

          if (order) {
            setOrderDetails(order);
            console.log('Order details set:', order);
            console.log('Widget customization data:', order.events?.widget_customization);
            console.log('Success URL:', (order.events?.widget_customization as any)?.payment?.successUrl);
          } else {
            console.error('No order found');
          }
        } else {
          console.log('No session parameters found - cannot determine which order to show');
          console.log('This usually means the user navigated directly to the success page without completing a payment');
          // Don't show any order details if we can't determine which order this is for
          setOrderDetails(null);
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
        setOrderDetails(null);
      } finally {
        setLoading(false);
      }
    };

    updateOrderStatus();
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your tickets have been confirmed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderDetails ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{orderDetails.events?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>Confirmation sent to {orderDetails.customer_email}</span>
              </div>
              <div className="bg-accent/50 p-3 rounded-lg">
                <p className="text-sm font-medium">Order Total: ${orderDetails.total_amount}</p>
                <p className="text-xs text-muted-foreground">Order ID: {orderDetails.id}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No order details available. This usually happens when you navigate directly to this page without completing a payment.
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              variant="outline"
              className="w-full bg-black text-white border-black hover:bg-gray-800 hover:text-white hover:border-gray-800" 
              onClick={() => {
                if (orderDetails?.events?.widget_customization?.payment?.successUrl) {
                  const successUrl = orderDetails.events.widget_customization.payment.successUrl;
                  console.log('Redirecting to custom success URL:', successUrl);
                  window.location.href = successUrl;
                } else {
                  console.log('No custom success URL, navigating to home');
                  navigate('/');
                }
              }}
            >
              {orderDetails?.events?.widget_customization?.payment?.successUrl 
                ? 'Return to Site' 
                : 'Return to Home'
              }
            </Button>
            {orderDetails && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={downloadOfficialPDF}
                  disabled={isDownloadingOfficialPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloadingOfficialPDF ? 'Generating PDF...' : 'Download Official PDF Tickets'}
                </Button>
                <Dialog open={showTickets} onOpenChange={setShowTickets}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" onClick={viewTickets}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Tickets
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Your Tickets</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Hidden area for printing */}
                      <div id="tickets-print-area" className="hidden">
                        {tickets.map((ticket) => (
                          <div key={ticket.id} className="ticket-container">
                            <TicketDisplay 
                              ticket={ticket}
                              eventDetails={{
                                venue: orderDetails?.events?.venue,
                                logo_url: orderDetails?.events?.logo_url,
                                description: orderDetails?.events?.description
                              }}
                              organizationDetails={{
                                logo_url: orderDetails?.events?.organizations?.logo_url,
                                name: orderDetails?.events?.organizations?.name
                              }}
                              ticketCustomization={orderDetails?.events?.ticket_customization || {
                                content: {
                                  showLogo: true,
                                  logoSource: "event",
                                  customLogoUrl: ""
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Visible tickets for PDF generation */}
                      {tickets.map((ticket) => (
                        <div key={ticket.id} className="ticket-for-pdf">
                          <TicketDisplay 
                            ticket={ticket}
                            eventDetails={{
                              venue: orderDetails?.events?.venue,
                              logo_url: orderDetails?.events?.logo_url,
                              description: orderDetails?.events?.description
                            }}
                            organizationDetails={{
                              logo_url: orderDetails?.events?.organizations?.logo_url,
                              name: orderDetails?.events?.organizations?.name
                            }}
                            ticketCustomization={orderDetails?.events?.ticket_customization || {
                              content: {
                                showLogo: true,
                                logoSource: "event",
                                customLogoUrl: ""
                              }
                            }}
                          />
                        </div>
                      ))}
                      
                      <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button onClick={printTickets} variant="outline" className="flex-1">
                          <Printer className="h-4 w-4 mr-2" />
                          Print Tickets
                        </Button>
                        <Button 
                          onClick={generatePDF} 
                          variant="outline" 
                          className="flex-1"
                          disabled={isGeneratingPDF}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {isGeneratingPDF ? 'Generating...' : 'Save as PDF'}
                        </Button>
                        <Button onClick={addToWallet} variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Add to Wallet
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
