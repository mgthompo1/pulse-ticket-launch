import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Mail, Search, Calendar, User, Receipt, RotateCcw } from "lucide-react";
import { format } from "date-fns";

interface PaymentLogProps {
  organizationId: string;
}

interface PaymentRecord {
  id: string;
  order_id: string;
  event_name: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  booking_fee: number;
  stripe_fee: number;
  payment_provider: string;
  payment_method: string;
  card_last_four: string;
  payment_date: string;
  status: string;
  windcave_session_id?: string | null;
  stripe_session_id?: string | null;
}

export const PaymentLog = ({ organizationId }: PaymentLogProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPayments();
  }, [organizationId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      // Get orders with event and payment information
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_email,
          total_amount,
          booking_fee,
          status,
          created_at,
          windcave_session_id,
          stripe_session_id,
          stripe_payment_intent_id,
          events!inner (
            id,
            name,
            organization_id
          )
        `)
        .eq('events.organization_id', organizationId)
        .in('status', ['completed', 'paid', 'refunded'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) console.error('Orders error:', ordersError);

      // Transform orders into payment records
      const orderRecords: PaymentRecord[] = orders?.map(order => {
        // Calculate Stripe fee (2.70% + $0.30 for NZ)
        const isStripe = !!order.stripe_session_id;
        const estimatedStripeFee = isStripe ? (order.total_amount * 0.027) + 0.30 : 0;

        return {
          id: order.id,
          order_id: order.id,
          event_name: (order.events as any)?.name || 'Unknown Event',
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total_amount: order.total_amount,
          booking_fee: order.booking_fee || 0,
          stripe_fee: estimatedStripeFee,
          payment_provider: order.stripe_session_id ? 'stripe' : order.windcave_session_id ? 'windcave' : 'unknown',
          payment_method: 'Card',
          card_last_four: '****',
          payment_date: order.created_at,
          status: order.status,
          windcave_session_id: order.windcave_session_id,
          stripe_session_id: order.stripe_session_id,
        };
      }) || [];

      // Combine and sort all payment records by date
      const allPayments = [...orderRecords].sort((a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      setPayments(allPayments.slice(0, 100)); // Limit to 100 total records
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReceipt = async (payment: PaymentRecord) => {
    try {
      setEmailLoading(payment.id);
      
      const { error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          orderId: payment.order_id,
          customerEmail: payment.customer_email,
          customerName: payment.customer_name,
          eventName: payment.event_name,
          totalAmount: payment.total_amount,
          paymentDate: payment.payment_date,
        }
      });

      if (error) throw error;

      toast({
        title: "Receipt Sent",
        description: `Receipt emailed to ${payment.customer_email}`,
      });
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast({
        title: "Error",
        description: "Failed to send receipt email",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(null);
    }
  };

  const handleRefund = async (payment: PaymentRecord) => {
    if (!confirm(`Are you sure you want to refund $${payment.total_amount.toFixed(2)} for order ${payment.order_id.slice(0, 8)}...?\n\nThis action cannot be undone and will immediately refund the customer's card.`)) {
      return;
    }

    try {
      setRefundLoading(payment.id);
      
      const { error } = await supabase.functions.invoke('stripe-refund', {
        body: {
          orderId: payment.order_id,
          refundAmount: payment.total_amount,
          reason: 'requested_by_customer'
        }
      });

      if (error) throw error;

      toast({
        title: "Refund Processed",
        description: `$${payment.total_amount.toFixed(2)} refunded to ${payment.customer_name}`,
      });

      // Reload payments to show updated status
      loadPayments();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: "Refund Failed",
        description: "Failed to process refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefundLoading(null);
    }
  };

  const exportToCSV = () => {
    const csvHeaders = [
      'Order ID',
      'Event Name',
      'Customer Name',
      'Customer Email',
      'Amount',
      'Platform Fee',
      'Stripe Fee',
      'Payment Provider',
      'Payment Method',
      'Card Last 4',
      'Payment Date',
      'Status'
    ];

    const csvData = payments.map(payment => [
      payment.order_id,
      payment.event_name,
      payment.customer_name,
      payment.customer_email,
      payment.total_amount.toFixed(2),
      payment.booking_fee.toFixed(2),
      payment.stripe_fee.toFixed(2),
      payment.payment_provider,
      payment.payment_method,
      payment.card_last_four,
      format(new Date(payment.payment_date), 'yyyy-MM-dd HH:mm:ss'),
      payment.status
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-log-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Payment log exported to CSV",
    });
  };

  const filteredPayments = payments.filter(payment =>
    payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.order_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentProviderBadge = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <Badge variant="default">Stripe</Badge>;
      case 'windcave':
        return <Badge variant="secondary">Windcave</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Refunded</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Payment Log
            </CardTitle>
            <CardDescription>
              View recent payments and send receipts to customers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, event, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading payment records...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No payments found matching your search.' : 'No payment records found.'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Stripe Fee</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.order_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {payment.event_name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{payment.customer_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.customer_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${payment.total_amount.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-green-600">
                        ${payment.booking_fee.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-red-600">
                        ${payment.stripe_fee.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentProviderBadge(payment.payment_provider)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span className="text-sm">
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEmailReceipt(payment)}
                          disabled={emailLoading === payment.id || refundLoading === payment.id}
                        >
                          {emailLoading === payment.id ? (
                            "Sending..."
                          ) : (
                            <>
                              <Mail className="w-3 h-3 mr-1" />
                              Receipt
                            </>
                          )}
                        </Button>
                        
                        {payment.payment_provider === 'stripe' && payment.status !== 'refunded' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefund(payment)}
                            disabled={emailLoading === payment.id || refundLoading === payment.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {refundLoading === payment.id ? (
                              "Refunding..."
                            ) : (
                              <>
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Refund
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};