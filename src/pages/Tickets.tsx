// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TicketDisplay } from '@/components/TicketDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Calendar, MapPin, User } from 'lucide-react';
import jsPDF from 'jspdf';

interface TicketData {
  id: string;
  ticket_code: string;
  status: string;
  eventName: string;
  customerName: string;
  ticketTypeName: string;
  eventDate: string;
  order_item_id: string;
  order_items: {
    id: string;
    order_id: string;
    ticket_types: {
      name: string;
      price: number;
    } | null;
    orders: {
      id: string;
      customer_name: string;
      customer_email: string;
      event_id: string;
      events: {
        id: string;
        name: string;
        event_date: string;
        venue: string;
        description: string;
        logo_url: string;
        organizations: {
          id: string;
          name: string;
          logo_url: string;
        };
      };
    };
  };
}

const Tickets: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('orderId');
  const email = searchParams.get('email');

  useEffect(() => {
    if (orderId && email) {
      loadTickets();
    } else {
      setError('Missing order ID or email');
      setLoading(false);
    }
  }, [orderId, email]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // First verify the email matches the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_email')
        .eq('id', orderId)
        .eq('customer_email', email)
        .single();

      if (orderError || !orderData) {
        setError('Order not found or email does not match');
        return;
      }

      // First get order items for this order
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId);

      if (orderItemsError) {
        console.error('Error loading order items:', orderItemsError);
        setError('Failed to load order items');
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        setError('No order items found');
        return;
      }

      const orderItemIds = orderItems.map(item => item.id);

      // Load tickets with all related data
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_code,
          status,
          order_item_id,
          order_items!inner (
            id,
            order_id,
            ticket_types (
              name,
              price
            ),
            orders!inner (
              id,
              customer_name,
              customer_email,
              event_id,
              events (
                id,
                name,
                event_date,
                venue,
                description,
                logo_url,
                organizations (
                  id,
                  name,
                  logo_url
                )
              )
            )
          )
        `)
        .in('order_item_id', orderItemIds);

      if (ticketsError) {
        console.error('Error loading tickets:', ticketsError);
        setError('Failed to load tickets');
        return;
      }

      // Transform the data to match TicketDisplay requirements
      const transformedTickets = ticketsData?.map(ticket => ({
        ...ticket,
        eventName: ticket.order_items?.orders?.events?.name || 'Unknown Event',
        customerName: ticket.order_items?.orders?.customer_name || 'Unknown Customer',
        ticketTypeName: ticket.order_items?.ticket_types?.name || 'General Admission',
        eventDate: ticket.order_items?.orders?.events?.event_date || new Date().toISOString()
      })) || [];

      setTickets(transformedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllTickets = async () => {
    if (tickets.length === 0) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 20;

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const eventData = ticket.order_items?.orders?.events;
        
        if (i > 0) {
          pdf.addPage();
          yPosition = 20;
        }

        // Event name
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(eventData?.name || 'Event Ticket', 20, yPosition);
        yPosition += 15;

        // Event details
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        
        if (eventData?.event_date) {
          pdf.text(`Date: ${new Date(eventData.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`, 20, yPosition);
          yPosition += 8;
        }

        if (eventData?.venue) {
          pdf.text(`Venue: ${eventData.venue}`, 20, yPosition);
          yPosition += 8;
        }

        pdf.text(`Attendee: ${ticket.customerName}`, 20, yPosition);
        yPosition += 8;

        pdf.text(`Ticket Type: ${ticket.order_items?.ticket_types?.name || 'General Admission'}`, 20, yPosition);
        yPosition += 15;

        // Ticket code
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Ticket Code: ${ticket.ticket_code}`, 20, yPosition);
        yPosition += 10;

        // QR Code placeholder (you could integrate with QR generation here)
        pdf.setFontSize(10);
        pdf.text('Present this ticket at the event for entry', 20, yPosition);
      }

      pdf.save(`tickets-${orderId}.pdf`);

      toast({
        title: "Success",
        description: "Tickets downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download tickets",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your tickets...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Please check your email for the correct ticket link, or contact support if you continue to have issues.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>No Tickets Found</CardTitle>
                <CardDescription>No tickets were found for this order.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const eventData = tickets[0]?.order_items?.orders?.events;
  const organizationData = eventData?.organizations;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            {organizationData?.logo_url && (
              <img 
                src={organizationData.logo_url} 
                alt={organizationData.name}
                className="h-16 mx-auto mb-4"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Tickets</h1>
            <p className="text-gray-600">Present these tickets at the event for entry</p>
          </div>

          {/* Event Summary */}
          {eventData && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{eventData.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(eventData.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  {eventData.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Venue</p>
                        <p className="text-sm text-gray-600">{eventData.venue}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Tickets</p>
                      <p className="text-sm text-gray-600">{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={downloadAllTickets} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download All Tickets
            </Button>
          </div>

          {/* Tickets */}
          <div className="space-y-6">
            {tickets.map((ticket, index) => (
              <div key={ticket.id}>
                <h3 className="text-lg font-semibold mb-4">
                  Ticket {index + 1} - {ticket.order_items?.ticket_types?.name || 'General Admission'}
                </h3>
                <TicketDisplay
                  ticket={ticket}
                  eventDetails={eventData}
                  organizationDetails={organizationData}
                  ticketCustomization={{
                    content: {
                      showLogo: true,
                      logoSource: 'event',
                      showQR: true,
                      showBarcode: false,
                      additionalInfo: 'Present this ticket at the event for entry'
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
