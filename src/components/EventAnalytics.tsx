import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, Calendar, DollarSign, Ticket, TrendingUp, Search, BarChart3, Eye, ShoppingCart, UtensilsCrossed, Accessibility, Phone, Stethoscope, Car } from "lucide-react";
import { format } from "date-fns";
import { WidgetFunnelAnalytics } from "./WidgetFunnelAnalytics";
import { RecoveryAnalytics } from "./RecoveryAnalytics";
import { TablePagination } from "@/components/ui/table-pagination";

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
  attendees?: Array<{
    attendee_name: string;
    attendee_email: string;
    attendee_phone?: string;
    custom_answers?: Record<string, string>;
  }> | null;
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
      assigned_seat: string | null;
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
  const [customQuestions, setCustomQuestions] = useState<Array<{ id: string; label: string; category?: string }>>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasDonations, setHasDonations] = useState(false);
  const [hasGroupSales, setHasGroupSales] = useState(false);
  const [hasAssignedSeats, setHasAssignedSeats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
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

  // Helper to aggregate responses by category
  const getCategorizedResponseSummary = () => {
    const categorizedQuestions = customQuestions.filter(q => q.category && q.category !== 'general');
    if (categorizedQuestions.length === 0) return null;

    const summary: Record<string, Record<string, number>> = {};

    categorizedQuestions.forEach(question => {
      const category = question.category || 'general';
      if (!summary[category]) {
        summary[category] = {};
      }

      // Aggregate answers from all orders
      filteredOrders.forEach(order => {
        const answer = getAnswerForQuestion(order, question.id);
        if (answer && answer !== '-' && answer.trim() !== '') {
          // For checkbox/multi-select, split by comma
          const answers = answer.includes(',') ? answer.split(',').map(a => a.trim()) : [answer.trim()];
          answers.forEach(ans => {
            if (ans) {
              summary[category][ans] = (summary[category][ans] || 0) + 1;
            }
          });
        }
      });
    });

    return summary;
  };

  // Category display config
  const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    dietary: { label: 'Dietary Requirements', icon: <UtensilsCrossed className="h-4 w-4" />, color: 'text-orange-600 bg-orange-500/10' },
    accessibility: { label: 'Accessibility Needs', icon: <Accessibility className="h-4 w-4" />, color: 'text-blue-600 bg-blue-500/10' },
    emergency_contact: { label: 'Emergency Contact', icon: <Phone className="h-4 w-4" />, color: 'text-red-600 bg-red-500/10' },
    medical: { label: 'Medical Information', icon: <Stethoscope className="h-4 w-4" />, color: 'text-pink-600 bg-pink-500/10' },
    transport: { label: 'Transport/Parking', icon: <Car className="h-4 w-4" />, color: 'text-green-600 bg-green-500/10' },
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
            tickets (id, ticket_code, status, checked_in, used_at, seat_id)
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

      // Get all seat_ids to query seat information
      const allSeatIds: string[] = [];
      ordersData?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          item.tickets?.forEach((ticket: any) => {
            if (ticket.seat_id) allSeatIds.push(ticket.seat_id);
          });
        });
      });

      // Query seats table to get seat labels (row + number)
      const seatsMap = new Map<string, string>(); // seat_id -> "Row X Seat Y"
      if (allSeatIds.length > 0) {
        const { data: seats } = await supabase
          .from('seats')
          .select('id, row_label, seat_number')
          .in('id', allSeatIds);

        seats?.forEach((seat: any) => {
          const seatLabel = `Row ${seat.row_label} Seat ${seat.seat_number}`;
          seatsMap.set(seat.id, seatLabel);
        });
      }

      // Enhance orders with group names and seat assignments
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

        // Enhance tickets with seat assignments
        const enhancedOrderItems = order.order_items?.map((item: any) => ({
          ...item,
          tickets: item.tickets?.map((ticket: any) => ({
            ...ticket,
            assigned_seat: ticket.seat_id ? seatsMap.get(ticket.seat_id) || null : null
          }))
        }));

        return {
          ...order,
          group_name: groupName,
          order_items: enhancedOrderItems
        };
      });

      // Check if any orders have donations, group sales, or assigned seats
      const hasDonation = enhancedOrders?.some(order => order.donation_amount && order.donation_amount > 0) || false;
      const hasGroup = enhancedOrders?.some(order => order.group_name) || false;
      const hasSeats = enhancedOrders?.some(order =>
        order.order_items?.some((item: any) =>
          item.tickets?.some((ticket: any) => ticket.assigned_seat)
        )
      ) || false;
      setHasDonations(hasDonation);
      setHasGroupSales(hasGroup);
      setHasAssignedSeats(hasSeats);

      setOrders(enhancedOrders || []);
      setFilteredOrders(enhancedOrders || []);

      // Get custom questions from widget customization
      const eventCustomQuestions: Array<{ id: string; label: string; category?: string }> = [];

      if (eventData.widget_customization?.customQuestions?.questions &&
          Array.isArray(eventData.widget_customization.customQuestions.questions)) {
        eventData.widget_customization.customQuestions.questions.forEach((q: any) => {
          if (q.id && q.label) {
            // Filter out the __group_purchase__ question
            if (q.id !== '__group_purchase__') {
              eventCustomQuestions.push({ id: q.id, label: q.label, category: q.category || 'general' });
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
    if (hasAssignedSeats) baseHeaders.push('Assigned Seat');

    // Add remaining headers
    baseHeaders.push('Ticket Type', 'Quantity', 'Ticket Code', 'Checked In', 'Check-in Date');

    const customQuestionHeaders = customQuestions.map((question) => {
      const categoryLabel = question.category && question.category !== 'general'
        ? ` [${categoryConfig[question.category]?.label || question.category}]`
        : '';
      return `"${question.label}${categoryLabel}"`;
    });
    const headers = [...baseHeaders, ...customQuestionHeaders];

    const csvContent = [
      headers.join(','),
      ...filteredOrders.flatMap(order => {
        const { firstName, lastName } = splitName(order.customer_name);

        // Track ticket index for attendee mapping
        let ticketIndex = 0;

        return order.order_items.flatMap(item =>
          item.tickets.map(ticket => {
            // Get custom answers for this specific attendee, or fall back to order-level answers
            const attendee = order.attendees?.[ticketIndex];
            const customAnswersSource = attendee?.custom_answers || order.custom_answers;
            const customAnswers = customQuestions.map(question =>
              `"${customAnswersSource?.[question.id] || '-'}"`
            );

            // Use attendee name if available, otherwise use order customer name
            const attendeeName = attendee?.attendee_name || order.customer_name;
            const attendeeEmail = attendee?.attendee_email || order.customer_email;
            const { firstName: attFirstName, lastName: attLastName } = splitName(attendeeName);

            const baseRow = [
              `"${attFirstName}"`,
              `"${attLastName}"`,
              `"${attendeeEmail}"`,
              `"${order.customer_phone || ''}"`,
              `"${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}"`,
              order.total_amount
            ];

            // Add conditional columns
            if (hasDonations) baseRow.push(order.donation_amount?.toFixed(2) || '0.00');
            if (hasGroupSales) baseRow.push(`"${order.group_name || '-'}"`);
            if (hasAssignedSeats) baseRow.push(`"${ticket.assigned_seat || '-'}"`);

            // Add remaining columns
            baseRow.push(
              `"${item.ticket_types?.name || 'Unknown'}"`,
              item.quantity,
              `"${ticket.ticket_code}"`,
              ticket.checked_in === true ? 'Yes' : 'No',
              ticket.used_at ? `"${format(new Date(ticket.used_at), 'yyyy-MM-dd HH:mm')}"` : '',
              ...customAnswers
            );

            ticketIndex++; // Increment for next ticket

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

  // Reset to page 1 when search changes or event changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedEventId]);

  // Paginate the filtered results
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (selectedEventId) {
      loadEventAnalytics(selectedEventId);
    }
  }, [selectedEventId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            Event Analytics
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Detailed insights and reporting for your events</p>
        </div>
      </div>

      {/* Event Selection */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Select Event</CardTitle>
          <CardDescription>Choose an event to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  selectedEventId === event.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-background'
                }`}
                onClick={() => setSelectedEventId(event.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${selectedEventId === event.id ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Calendar className={`h-4 w-4 ${selectedEventId === event.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{event.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </p>
                    {event.venue && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {event.venue}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant={event.status === 'published' ? 'default' : 'secondary'}
                        className="text-xs rounded-md"
                      >
                        {event.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {event.capacity} capacity
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {eventDetails && analytics && !loading && (
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sales Analytics
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Widget Funnel
            </TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Recovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
          {/* Event Overview */}
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Event Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Event Name</p>
                  <p className="font-semibold text-sm truncate">{eventDetails.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date & Time</p>
                  <p className="font-semibold text-sm">{format(new Date(eventDetails.event_date), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Venue</p>
                  <p className="font-semibold text-sm truncate">{eventDetails.venue || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge variant={eventDetails.status === 'published' ? 'default' : 'secondary'} className="rounded-md">
                    {eventDetails.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <Ticket className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tickets Sold</p>
                    <p className="text-xl font-bold">{analytics.totalTicketsSold}</p>
                    <p className="text-[10px] text-muted-foreground">of {eventDetails.capacity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-xl font-bold">{analytics.totalAttendees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Checked In</p>
                    <p className="text-xl font-bold">{analytics.checkedInCount}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {analytics.totalTicketsSold > 0 ? ((analytics.checkedInCount / analytics.totalTicketsSold) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Order</p>
                    <p className="text-xl font-bold">${analytics.averageOrderValue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-pink-500/10">
                    <TrendingUp className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                    <p className="text-xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categorized Response Summary */}
          {(() => {
            const categorizedSummary = getCategorizedResponseSummary();
            if (!categorizedSummary || Object.keys(categorizedSummary).length === 0) return null;

            return (
              <Card className="rounded-2xl border-border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    Response Summary
                  </CardTitle>
                  <CardDescription>Aggregated responses from categorized questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categorizedSummary).map(([category, responses]) => {
                      const config = categoryConfig[category];
                      if (!config || Object.keys(responses).length === 0) return null;

                      const sortedResponses = Object.entries(responses)
                        .sort((a, b) => b[1] - a[1]);
                      const totalResponses = sortedResponses.reduce((sum, [_, count]) => sum + count, 0);

                      return (
                        <div key={category} className="border rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${config.color.split(' ')[1]}`}>
                              <span className={config.color.split(' ')[0]}>{config.icon}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{config.label}</h4>
                              <p className="text-xs text-muted-foreground">{totalResponses} total responses</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {sortedResponses.slice(0, 8).map(([response, count]) => (
                              <div key={response} className="flex items-center justify-between text-sm">
                                <span className="truncate flex-1 mr-2" title={response}>{response}</span>
                                <Badge variant="secondary" className="rounded-full text-xs">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                            {sortedResponses.length > 8 && (
                              <p className="text-xs text-muted-foreground pt-1">
                                +{sortedResponses.length - 8} more responses
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Orders Table */}
          <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Order Details</CardTitle>
                  <CardDescription className="mt-0.5">{filteredOrders.length} orders</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-72 rounded-xl bg-background"
                    />
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto rounded-xl">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-24 py-3.5 px-4 font-medium text-muted-foreground">First Name</TableHead>
                        <TableHead className="w-24 py-3.5 px-4 font-medium text-muted-foreground">Last Name</TableHead>
                        <TableHead className="w-40 py-3.5 px-4 font-medium text-muted-foreground">Email</TableHead>
                        <TableHead className="w-28 py-3.5 px-4 font-medium text-muted-foreground">Phone</TableHead>
                        <TableHead className="w-28 py-3.5 px-4 font-medium text-muted-foreground">Order Date</TableHead>
                        <TableHead className="w-32 py-3.5 px-4 font-medium text-muted-foreground">Items</TableHead>
                        <TableHead className="w-20 py-3.5 px-4 font-medium text-muted-foreground">Amount</TableHead>
                        {hasDonations && <TableHead className="w-20 py-3.5 px-4 font-medium text-muted-foreground">Donation</TableHead>}
                        {hasGroupSales && <TableHead className="w-32 py-3.5 px-4 font-medium text-muted-foreground">Group Name</TableHead>}
                        {hasAssignedSeats && <TableHead className="w-32 py-3.5 px-4 font-medium text-muted-foreground">Assigned Seat</TableHead>}
                        {customQuestions.map((question) => (
                          <TableHead key={question.id} className="w-48 py-3.5 px-4 font-medium text-muted-foreground" title={question.label}>
                            {truncateQuestion(question.label, 35)}
                          </TableHead>
                        ))}
                        <TableHead className="w-20 py-3.5 px-4 font-medium text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {paginatedOrders.map((order) => {
                        const { firstName, lastName } = splitName(order.customer_name);
                        return (
                          <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 px-4">
                            <p className="font-medium text-sm">{firstName}</p>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <p className="font-medium text-sm">{lastName}</p>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <p className="text-sm text-muted-foreground truncate">{order.customer_email}</p>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <p className="text-sm text-muted-foreground">{order.customer_phone || '—'}</p>
                          </TableCell>
                        <TableCell className="py-4 px-4">
                          <p className="text-sm">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</p>
                        </TableCell>
                         <TableCell className="py-4 px-4">
                           <div className="space-y-0.5">
                             {order.order_items.map((item, index) => (
                               <div key={index} className="text-sm truncate">
                                 {item.quantity}x {
                                   item.item_type === 'merchandise'
                                     ? (item.merchandise?.name || 'Unknown Merchandise')
                                     : (item.ticket_types?.name || 'General Admission')
                                 }
                               </div>
                             ))}
                           </div>
                         </TableCell>
                         <TableCell className="py-4 px-4">
                           <p className="font-semibold text-sm">${order.total_amount.toFixed(2)}</p>
                         </TableCell>
                         {hasDonations && (
                           <TableCell className="py-4 px-4">
                             {order.donation_amount && order.donation_amount > 0 ? (
                               <p className="text-sm text-pink-600 font-medium">${order.donation_amount.toFixed(2)}</p>
                             ) : (
                               <p className="text-sm text-muted-foreground">—</p>
                             )}
                           </TableCell>
                         )}
                         {hasGroupSales && (
                           <TableCell className="py-4 px-4">
                             <p className="text-sm truncate">{order.group_name || '—'}</p>
                           </TableCell>
                         )}
                         {hasAssignedSeats && (
                           <TableCell className="py-4 px-4">
                             <div className="text-sm">
                               {order.order_items.flatMap((item: any) =>
                                 item.tickets?.filter((t: any) => t.assigned_seat).map((t: any, idx: number) => (
                                   <div key={idx} className="truncate">{t.assigned_seat}</div>
                                 ))
                               )}
                               {!order.order_items.some((item: any) => item.tickets?.some((t: any) => t.assigned_seat)) && '—'}
                             </div>
                           </TableCell>
                         )}
                         {customQuestions.map((question) => (
                           <TableCell key={question.id} className="py-4 px-4">
                             <p className="text-sm truncate">{getAnswerForQuestion(order, question.id)}</p>
                           </TableCell>
                         ))}
                         <TableCell className="py-4 px-4">
                           <Badge variant={order.status === 'completed' || order.status === 'paid' ? 'default' : 'secondary'} className="text-xs rounded-md">
                             {order.status}
                           </Badge>
                           </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              {filteredOrders.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
              {filteredOrders.length === 0 && orders.length > 0 && (
                <div className="text-center py-12">
                  <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">No orders match your search</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
                </div>
              )}
              {orders.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                    <Ticket className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Orders will appear here when customers make purchases</p>
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <WidgetFunnelAnalytics eventId={selectedEventId} />
          </TabsContent>

          <TabsContent value="recovery">
            <RecoveryAnalytics eventId={selectedEventId} />
          </TabsContent>
        </Tabs>
      )}

      {!selectedEventId && !loading && (
        <Card className="rounded-2xl border-border">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg">Select an event to get started</p>
              <p className="text-muted-foreground text-sm mt-1">Choose an event above to view detailed analytics and reporting</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};