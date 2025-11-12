import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CreditCard,
  DollarSign,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Link2,
  Ban,
  Activity,
  Copy,
} from 'lucide-react';

interface CardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any | null;
  onUpdate: () => void;
}

interface Transaction {
  id: string;
  amount: number;
  merchant_name: string;
  merchant_category: string;
  approved: boolean;
  authorized_at: string;
  transaction_type: string;
  decline_reason?: string;
}

export const CardDetailsDialog: React.FC<CardDetailsDialogProps> = ({
  open,
  onOpenChange,
  card,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [generatingTopupLink, setGeneratingTopupLink] = useState(false);

  useEffect(() => {
    if (open && card) {
      loadTransactions();
    }
  }, [open, card]);

  const loadTransactions = async () => {
    if (!card) return;

    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('issuing_transactions')
        .select('*')
        .eq('card_id', card.id)
        .order('authorized_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleGenerateTopupLink = async () => {
    if (!card) return;

    setGeneratingTopupLink(true);
    try {
      // TODO: Call edge function to generate top-up link
      // const { data, error } = await supabase.functions.invoke('generate-topup-link', {
      //   body: {
      //     cardId: card.id,
      //     parentEmail: card.cardholder_email,
      //   },
      // });

      // if (error) throw error;

      // For MVP demo, generate a mock token
      const mockToken = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const topupUrl = `${window.location.origin}/topup/${mockToken}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(topupUrl);

      toast({
        title: 'Top-Up Link Generated!',
        description: 'Link copied to clipboard. Share this with the cardholder to load funds.',
      });
    } catch (error: any) {
      console.error('Error generating top-up link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate top-up link',
        variant: 'destructive',
      });
    } finally {
      setGeneratingTopupLink(false);
    }
  };

  const handleCancelCard = async () => {
    if (!card) return;

    if (!confirm('Are you sure you want to cancel this card? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('issuing_cards')
        .update({
          card_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by admin',
        })
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: 'Card Cancelled',
        description: `Card for ${card.cardholder_name} has been cancelled`,
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling card:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel card',
        variant: 'destructive',
      });
    }
  };

  if (!card) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    suspended: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Card Details - {card.cardholder_name}
          </DialogTitle>
          <DialogDescription>
            Manage virtual card and view transaction history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Card Number</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-lg">•••• {card.card_last4}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Exp: {card.card_exp_month}/{card.card_exp_year}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Current Balance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(card.current_balance)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Spent: {formatCurrency(card.total_spent)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Status</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge className={statusColors[card.card_status]}>
                  {card.card_status.charAt(0).toUpperCase() + card.card_status.slice(1)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Issued {formatDate(card.issued_at)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cardholder Info */}
          <Card>
            <CardHeader>
              <CardTitle>Cardholder Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{card.cardholder_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{card.cardholder_email}</p>
                </div>
                {card.cardholder_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{card.cardholder_phone}</p>
                  </div>
                )}
                {card.groups?.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Group</p>
                    <p className="font-medium">{card.groups.name}</p>
                  </div>
                )}
              </div>
              {card.purpose && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Purpose</p>
                  <p className="font-medium">{card.purpose}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateTopupLink}
              disabled={generatingTopupLink || card.card_status !== 'active'}
              variant="outline"
            >
              <Link2 className="mr-2 h-4 w-4" />
              {generatingTopupLink ? 'Generating...' : 'Generate Top-Up Link'}
            </Button>

            {card.card_status === 'active' && (
              <Button onClick={handleCancelCard} variant="destructive" size="sm">
                <Ban className="mr-2 h-4 w-4" />
                Cancel Card
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="transactions">
            <TabsList>
              <TabsTrigger value="transactions">
                <Activity className="mr-2 h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="controls">
                <DollarSign className="mr-2 h-4 w-4" />
                Spending Controls
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTransactions ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Loading transactions...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-4 text-sm text-muted-foreground">
                            No transactions yet
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>{formatDate(txn.authorized_at)}</TableCell>
                          <TableCell>{txn.merchant_name || 'Unknown Merchant'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {txn.merchant_category || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell>
                            {txn.approved ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Approved</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-sm">
                                  {txn.decline_reason || 'Declined'}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="controls">
              <Card>
                <CardHeader>
                  <CardTitle>Spending Controls</CardTitle>
                  <CardDescription>
                    Limits and restrictions applied to this card
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {card.spending_limit_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Spending Limit</p>
                      <p className="font-medium">
                        {formatCurrency(card.spending_limit_amount)} per{' '}
                        {card.spending_limit_interval?.replace('_', ' ')}
                      </p>
                    </div>
                  )}

                  {card.allowed_merchant_categories &&
                    card.allowed_merchant_categories.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Allowed Categories
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {card.allowed_merchant_categories.map((cat: string) => (
                            <Badge key={cat} variant="outline">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {card.blocked_merchant_categories &&
                    card.blocked_merchant_categories.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Blocked Categories
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {card.blocked_merchant_categories.map((cat: string) => (
                            <Badge key={cat} variant="destructive">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {card.allowed_countries && card.allowed_countries.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Allowed Countries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {card.allowed_countries.map((country: string) => (
                          <Badge key={country} variant="outline">
                            {country}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!card.spending_limit_amount &&
                    !card.allowed_merchant_categories &&
                    !card.blocked_merchant_categories && (
                      <p className="text-sm text-muted-foreground">
                        No spending controls configured. Card can be used anywhere with no
                        limits.
                      </p>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
