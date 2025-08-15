import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Users, 
  Search, 
  Eye, 
  Calendar,
  MapPin,
  Mail,
  Phone,
  HelpCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EventReportingProps {
  eventId: string;
}

interface OrderWithDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  total_amount: number;
  status: string;
  custom_answers: any;
  created_at: string;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    ticket_types: { name: string } | null;
    merchandise: { name: string } | null;
    item_type: string | null;
    tickets: Array<{
      ticket_code: string;
      status: string;
      checked_in: boolean | null;
    }> | null;
  }>;
}

const EventReporting: React.FC<EventReportingProps> = ({ eventId }) => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEventData();
    loadOrders();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('name, widget_customization')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEventData(event);
    } catch (error) {
      console.error('Error loading event:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            item_type,
            ticket_types (name),
            merchandise (name),
            tickets (
              ticket_code,
              status,
              checked_in
            )
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = [
      'Order ID',
      'Customer Name', 
      'Email',
      'Phone',
      'Total Amount',
      'Order Date',
      'Items',
      'Custom Answers'
    ];

    const csvData = filteredOrders.map(order => [
      order.id,
      order.customer_name,
      order.customer_email,
      order.customer_phone || '',
      `$${order.total_amount}`,
      new Date(order.created_at).toLocaleDateString(),
      order.order_items.map(item => 
        `${item.quantity}x ${item.ticket_types?.name || item.merchandise?.name || 'Item'}`
      ).join('; '),
      JSON.stringify(order.custom_answers)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-orders-${eventId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCustomQuestions = () => {
    return eventData?.widget_customization?.customQuestions?.questions || [];
  };

  const getAnswerDisplay = (answer: any) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return answer?.toString() || 'No answer';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading order data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">
                  {orders.reduce((sum, order) => 
                    sum + order.order_items
                      .filter(item => item.item_type === 'ticket')
                      .reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-sm">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Custom Answers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{order.id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {order.customer_email}
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {order.customer_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {order.order_items.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item.quantity}x {item.ticket_types?.name || item.merchandise?.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {Object.keys(order.custom_answers || {}).length > 0 ? (
                      <Badge variant="secondary">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {Object.keys(order.custom_answers).length} answers
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Customer Name</Label>
                                <p className="font-medium">{selectedOrder.customer_name}</p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="font-medium">{selectedOrder.customer_email}</p>
                              </div>
                              {selectedOrder.customer_phone && (
                                <div>
                                  <Label>Phone</Label>
                                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                                </div>
                              )}
                              <div>
                                <Label>Order Date</Label>
                                <p className="font-medium">
                                  {new Date(selectedOrder.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div>
                              <Label>Items Purchased</Label>
                              <div className="space-y-2 mt-2">
                                {selectedOrder.order_items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                                    <span>
                                      {item.quantity}x {item.ticket_types?.name || item.merchandise?.name}
                                    </span>
                                    <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {selectedOrder.order_items.some(item => item.tickets && item.tickets.length > 0) && (
                              <div>
                                <Label>Tickets</Label>
                                <div className="space-y-2 mt-2">
                                  {selectedOrder.order_items.flatMap(item => item.tickets || []).map((ticket, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                                      <code className="text-sm">{ticket.ticket_code}</code>
                                      <div className="flex gap-2">
                                        <Badge variant={ticket.status === 'valid' ? 'default' : 'destructive'}>
                                          {ticket.status}
                                        </Badge>
                                        {ticket.checked_in && (
                                          <Badge variant="secondary">Checked In</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Object.keys(selectedOrder.custom_answers || {}).length > 0 && (
                              <div>
                                <Label>Custom Question Answers</Label>
                                <div className="space-y-3 mt-2">
                                  {getCustomQuestions().map((question: any) => {
                                    const answer = selectedOrder.custom_answers[question.id];
                                    if (!answer) return null;
                                    
                                    return (
                                      <div key={question.id} className="p-3 bg-muted rounded">
                                        <div className="font-medium text-sm mb-1">
                                          {question.label || question.text}
                                          {question.required && <span className="text-destructive"> *</span>}
                                        </div>
                                        <div className="text-sm">
                                          {getAnswerDisplay(answer)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No orders found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventReporting;