import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, Calendar, DollarSign, Ticket, TrendingUp, Search } from "lucide-react";
import { format } from "date-fns";

interface EventAnalyticsProps {
  events: Array<{
    id: string;
    name: string;
    event_date: string;
    venue: string | null;
    capacity: number;
    status: string;
  }>;
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
  donation_amount: number | null;
  status: string;
  created_at: string;
  custom_answers: any;
  group_name: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    item_type: string | null;
    ticket_types: {
      name: string;
      price: number;
    } | null;
    merchandise: {
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

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ events }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customQuestions, setCustomQuestions] = useState<Array<{ id: string; label: string }>>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasDonations, setHasDonations] = useState(false);
  const [hasGroupSales, setHasGroupSales] = useState(false);
  const { toast } = useToast();

  // Helper function to split name into first and last
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return { firstName, lastName };
  };

  // Helper to get answer for a specific question
  const getAnswerForQuestion = (order: OrderDetails, questionId: string): string => {
    if (!order.custom_answers || typeof order.custom_answers !== 'object') return '-';
    return String(order.custom_answers[questionId] || '-');
  };

  // Helper to truncate question text for column headers
  const truncateQuestion = (question: string, maxLength: number = 30): string => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  const loadEventAnalytics = async (eventId: string) => {
    setLoading(true);
    try {
      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
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
            merchandise (name, price),
            tickets (id, ticket_code, status, checked_in, used_at)
          )
        `)
        .eq('event_id', eventId)
        .in('status', ['completed', 'paid'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all ticket IDs to check for group sales
      const allTicketIds: string[] = [];
      ordersData?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          item.tickets?.forEach((ticket: any) => {
            if (ticket.id) allTicketIds.push(ticket.id);
          });
        });
      });

      // Query group_ticket_sales to get group info for these tickets
      const groupSalesMap = new Map<string, string>(); // ticket_id -> group_name
      if (allTicketIds.length > 0) {
        const { data: groupSales } = await supabase
          .from('group_ticket_sales')
          .select(`
            ticket_id,
            groups (name)
          `)
          .in('ticket_id', allTicketIds);

        groupSales?.forEach((sale: any) => {
          if (sale.groups?.name) {
            groupSalesMap.set(sale.ticket_id, sale.groups.name);
          }
        });
      }

      // Enhance orders with group names
      const enhancedOrders = ordersData?.map((order: any) => {
        // Find group name from any ticket in this order
        let groupName: string | null = null;
        for (const item of order.order_items || []) {
          for (const ticket of item.tickets || []) {
            if (groupSalesMap.has(ticket.id)) {
              groupName = groupSalesMap.get(ticket.id) || null;
              break;
            }
          }
          if (groupName) break;
        }

        return {
          ...order,
          group_name: groupName
        };
      });

      // Check if any orders have donations or group sales
      const hasDonation = enhancedOrders?.some(order => order.donation_amount && order.donation_amount > 0) || false;
      const hasGroup = enhancedOrders?.some(order => order.group_name) || false;
      setHasDonations(hasDonation);
      setHasGroupSales(hasGroup);

      setOrders(enhancedOrders || []);
      setFilteredOrders(enhancedOrders || []);

      // Get custom questions from widget customization
      const eventCustomQuestions: Array<{ id: string; label: string }> = [];

      if (eventData.widget_customization?.customQuestions?.questions &&
          Array.isArray(eventData.widget_customization.customQuestions.questions)) {
        eventData.widget_customization.customQuestions.questions.forEach((q: any) => {
          if (q.id && q.label) {
            // Filter out the __group_purchase__ question
            if (q.id !== '__group_purchase__') {
              eventCustomQuestions.push({ id: q.id, label: q.label });
            }
          }
        });
      }

      console.log('Custom questions loaded:', eventCustomQuestions);
      setCustomQuestions(eventCustomQuestions);

      // Calculate analytics
      if (ordersData) {
        const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const totalTicketsSold = ordersData.reduce((sum, order) => 
          sum + order.order_items.reduce((itemSum: number, item: any) => 
            item.item_type === 'ticket' ? itemSum + item.quantity : itemSum, 0
          ), 0
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
    if (!filteredOrders.length || !eventDetails) return;

    // Build header with custom questions
    const baseHeaders = ['First Name', 'Last Name', 'Email', 'Phone', 'Order Date', 'Total Amount'];

    // Add conditional headers
    if (hasDonations) baseHeaders.push('Donation');
    if (hasGroupSales) baseHeaders.push('Group Name');

    // Add remaining headers
    baseHeaders.push('Ticket Type', 'Quantity', 'Ticket Code', 'Checked In', 'Check-in Date');

    const customQuestionHeaders = customQuestions.map((question) => `"${question.label}"`);
    const headers = [...baseHeaders, ...customQuestionHeaders];

    const csvContent = [
      headers.join(','),
      ...filteredOrders.flatMap(order => {
        const { firstName, lastName } = splitName(order.customer_name);
        const customAnswers = customQuestions.map(question => `"${getAnswerForQuestion(order, question.id)}"`);

        return order.order_items.flatMap(item =>
          item.tickets.map(ticket => {
            const baseRow = [
              `"${firstName}"`,
              `"${lastName}"`,
              `"${order.customer_email}"`,
              `"${order.customer_phone || ''}"`,
              `"${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}"`,
              order.total_amount
            ];

            // Add conditional columns
            if (hasDonations) baseRow.push(order.donation_amount?.toFixed(2) || '0.00');
            if (hasGroupSales) baseRow.push(`"${order.group_name || '-'}"`);

            // Add remaining columns
            baseRow.push(
              `"${item.ticket_types?.name || 'Unknown'}"`,
              item.quantity,
              `"${ticket.ticket_code}"`,
              ticket.checked_in === true ? 'Yes' : 'No',
              ticket.used_at ? `"${format(new Date(ticket.used_at), 'yyyy-MM-dd HH:mm')}"` : '',
              ...customAnswers
            );

            return baseRow.join(',');
          })
        );
      })
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

  // Filter orders based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => {
      const { firstName, lastName } = splitName(order.customer_name);
      return (
        firstName.toLowerCase().includes(query) ||
        lastName.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(query))
      );
    });
    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventAnalytics(selectedEventId);
    }
  }, [selectedEventId]);

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
                  {event.name} - {format(new Date(event.event_date), 'MMM d, yyyy')}
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
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">First Name</TableHead>
                        <TableHead className="w-24">Last Name</TableHead>
                        <TableHead className="w-40">Email</TableHead>
                        <TableHead className="w-28">Phone</TableHead>
                        <TableHead className="w-28">Order Date</TableHead>
                        <TableHead className="w-32">Items</TableHead>
                        <TableHead className="w-20">Amount</TableHead>
                        {hasDonations && <TableHead className="w-20">Donation</TableHead>}
                        {hasGroupSales && <TableHead className="w-32">Group Name</TableHead>}
                        {customQuestions.map((question) => (
                          <TableHead key={question.id} className="w-48" title={question.label}>
                            {truncateQuestion(question.label, 35)}
                          </TableHead>
                        ))}
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const { firstName, lastName } = splitName(order.customer_name);
                        return (
                          <TableRow key={order.id}>
                          <TableCell className="py-2 px-2">
                            <p className="font-medium text-sm">{firstName}</p>
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <p className="font-medium text-sm">{lastName}</p>
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <p className="text-xs truncate">{order.customer_email}</p>
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <p className="text-xs">{order.customer_phone || 'Not provided'}</p>
                          </TableCell>
                        <TableCell className="py-2 px-2">
                          <p className="text-xs">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</p>
                        </TableCell>
                         <TableCell className="py-2 px-2">
                           <div>
                             {order.order_items.map((item, index) => (
                               <div key={index} className="text-xs truncate">
                                 {item.quantity}x {
                                   item.item_type === 'merchandise'
                                     ? (item.merchandise?.name || 'Unknown Merchandise')
                                     : (item.ticket_types?.name || 'General Admission')
                                 }
                               </div>
                             ))}
                           </div>
                         </TableCell>
                         <TableCell className="py-2 px-2">
                           <p className="font-medium text-sm">${order.total_amount.toFixed(2)}</p>
                         </TableCell>
                         {hasDonations && (
                           <TableCell className="py-2 px-2">
                             <p className="text-sm">${order.donation_amount?.toFixed(2) || '0.00'}</p>
                           </TableCell>
                         )}
                         {hasGroupSales && (
                           <TableCell className="py-2 px-2">
                             <p className="text-xs truncate">{order.group_name || '-'}</p>
                           </TableCell>
                         )}
                         {customQuestions.map((question) => (
                           <TableCell key={question.id} className="py-2 px-2">
                             <p className="text-xs truncate">{getAnswerForQuestion(order, question.id)}</p>
                           </TableCell>
                         ))}
                         <TableCell className="py-2 px-2">
                           <Badge variant={order.status === 'completed' || order.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                             {order.status}
                           </Badge>
                           </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              {filteredOrders.length === 0 && orders.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No orders match your search
                </div>
              )}
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