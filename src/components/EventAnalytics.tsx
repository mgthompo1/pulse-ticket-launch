import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, Calendar, DollarSign, Ticket, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface EventAnalyticsProps {
  events: Array<{
    id: string;
    name: string;
    date: string;
    venue: string | null;
    capacity: number;
    status: string;
  }>;
  testMode: boolean;
}

interface EventDetails {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
  capacity: number;
  status: string;
  description: string | null;
}

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  custom_answers: any;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    ticket_types: {
      name: string;
      price: number;
    } | null;
    tickets: Array<{
      id: string;
      ticket_code: string;
      status: string;
      checked_in: boolean | null;
      used_at: string | null;
    }>;
  }>;
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalTicketsSold: number;
  totalAttendees: number;
  checkedInCount: number;
  averageOrderValue: number;
  conversionRate: number;
}

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ events, testMode }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadEventAnalytics = async (eventId: string) => {
    setLoading(true);
    try {
      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('test_mode', testMode)
        .single();

      if (eventError) throw eventError;
      setEventDetails(eventData);

      // Load orders with related data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_types (name, price),
            tickets (id, ticket_code, status, checked_in, used_at)
          )
        `)
        .eq('event_id', eventId)
        .eq('test_mode', testMode)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Calculate analytics
      if (ordersData) {
        const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const totalTicketsSold = ordersData.reduce((sum, order) => 
          sum + order.order_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
        );
        const totalAttendees = ordersData.length;
        const checkedInCount = ordersData.reduce((sum, order) => 
          sum + order.order_items.reduce((itemSum: number, item: any) => 
            itemSum + item.tickets.filter((ticket: any) => ticket.checked_in === true).length, 0
          ), 0
        );
        const averageOrderValue = totalAttendees > 0 ? totalRevenue / totalAttendees : 0;

        setAnalytics({
          totalRevenue,
          totalTicketsSold,
          totalAttendees,
          checkedInCount,
          averageOrderValue,
          conversionRate: eventData?.capacity ? (totalTicketsSold / eventData.capacity) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error loading event analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load event analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!orders.length || !eventDetails) return;

    const csvContent = [
      ['Customer Name', 'Email', 'Phone', 'Order Date', 'Total Amount', 'Ticket Type', 'Quantity', 'Ticket Code', 'Checked In', 'Check-in Date'].join(','),
      ...orders.flatMap(order => 
        order.order_items.flatMap(item => 
          item.tickets.map(ticket => [
            `"${order.customer_name}"`,
            `"${order.customer_email}"`,
            `"${order.customer_phone || ''}"`,
            `"${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}"`,
            order.total_amount,
            `"${item.ticket_types?.name || 'Unknown'}"`,
            item.quantity,
             `"${ticket.ticket_code}"`,
             ticket.checked_in === true ? 'Yes' : 'No',
             ticket.used_at ? `"${format(new Date(ticket.used_at), 'yyyy-MM-dd HH:mm')}"` : ''
          ].join(','))
        )
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventDetails.name}-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Analytics report exported successfully"
    });
  };

  useEffect(() => {
    if (selectedEventId) {
      loadEventAnalytics(selectedEventId);
    }
  }, [selectedEventId, testMode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Analytics</h2>
          <p className="text-muted-foreground">Detailed insights and reporting for your events</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>Choose an event to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event to analyze" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} - {format(new Date(event.date), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      )}

      {eventDetails && analytics && !loading && (
        <>
          {/* Event Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Event Name</p>
                  <p className="font-medium">{eventDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{format(new Date(eventDetails.event_date), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{eventDetails.venue || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={eventDetails.status === 'published' ? 'default' : 'secondary'}>
                    {eventDetails.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTicketsSold}</div>
                <p className="text-xs text-muted-foreground">of {eventDetails.capacity} capacity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalAttendees}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.checkedInCount}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalTicketsSold > 0 ? ((analytics.checkedInCount / analytics.totalTicketsSold) * 100).toFixed(1) : 0}% attendance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.averageOrderValue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>Complete list of orders and attendee information</CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{order.customer_phone || 'Not provided'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</p>
                        </TableCell>
                        <TableCell>
                          <div>
                            {order.order_items.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.quantity}x {item.ticket_types?.name || 'Unknown'}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {orders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No orders found for this event
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && !loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Select an event above to view detailed analytics and reporting</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};