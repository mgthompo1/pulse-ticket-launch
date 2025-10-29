import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, TrendingDown, TrendingUp, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PayoutsAndFeesProps {
  organizationId: string;
}

interface Payout {
  id: string;
  payment_processor: string;
  processor_payout_id: string;
  payout_date: string;
  arrival_date: string | null;
  status: string;
  gross_amount: number;
  processor_fees: number;
  platform_fees: number;
  net_amount: number;
  currency: string;
  bank_account_last4: string | null;
  description: string | null;
}

interface PayoutSummary {
  total_payouts: number;
  total_gross: number;
  total_fees: number;
  total_net: number;
  pending_amount: number;
  paid_amount: number;
}

export const PayoutsAndFees = ({ organizationId }: PayoutsAndFeesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [organizationId, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_payout_summary', {
          p_organization_id: organizationId,
        });

      if (summaryError) throw summaryError;
      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

      // Load payouts with optional status filter
      let query = supabase
        .from('payouts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('payout_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: payoutsData, error: payoutsError } = await query;

      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPayouts = async () => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('sync-stripe-payouts', {
        body: { organizationId },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Synced ${data.synced} payouts, skipped ${data.skipped}`,
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error syncing payouts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync payouts',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleRowExpansion = (payoutId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(payoutId)) {
      newExpanded.delete(payoutId);
    } else {
      newExpanded.add(payoutId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
      case 'in_transit':
        return 'secondary';
      case 'failed':
      case 'canceled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposited</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.paid_amount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.total_payouts || 0} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.total_fees) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing & platform fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.pending_amount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              In transit or pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payouts & Deposits</CardTitle>
              <CardDescription>
                Track all deposits from payment processors to your bank account
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSyncPayouts} disabled={syncing} size="sm">
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Payouts
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payouts found</p>
              <p className="text-sm mt-2">
                {statusFilter === 'all'
                  ? 'Connect your Stripe account to track payouts'
                  : 'Try changing the status filter'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processor</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <>
                    <TableRow key={payout.id} className="cursor-pointer" onClick={() => toggleRowExpansion(payout.id)}>
                      <TableCell>
                        <div className="font-medium">{formatDate(payout.payout_date)}</div>
                        {payout.arrival_date && (
                          <div className="text-xs text-muted-foreground">
                            Arrives: {formatDate(payout.arrival_date)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(payout.status)}>
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{payout.payment_processor}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payout.gross_amount, payout.currency)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(payout.processor_fees + payout.platform_fees, payout.currency)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(payout.net_amount, payout.currency)}
                      </TableCell>
                      <TableCell>
                        {payout.bank_account_last4 && `****${payout.bank_account_last4}`}
                      </TableCell>
                      <TableCell>
                        {expandedRows.has(payout.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(payout.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/50">
                          <div className="py-4 px-4 space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Payout ID</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {payout.processor_payout_id}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Fee Breakdown</p>
                                <p className="text-sm text-muted-foreground">
                                  Processor: {formatCurrency(payout.processor_fees, payout.currency)}
                                  {payout.platform_fees > 0 && (
                                    <> | Platform: {formatCurrency(payout.platform_fees, payout.currency)}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            {payout.description && (
                              <div>
                                <p className="text-sm font-medium">Description</p>
                                <p className="text-sm text-muted-foreground">{payout.description}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">About Payouts & Fees</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Payouts are automatically synced from your connected Stripe account</li>
              <li>Fees include both processor fees (Stripe) and platform fees (if applicable)</li>
              <li>Payouts typically arrive 2-7 business days after the payout date</li>
              <li>Click "Sync Payouts" to manually fetch the latest payout data</li>
              <li>Windcave settlement tracking coming soon</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
