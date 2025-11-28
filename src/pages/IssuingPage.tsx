import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Plus,
  Search,
  Eye,
  Link2,
  Ban,
  Download,
  Wallet,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/useOrganizations';
import { IssueCardDialog } from '@/components/IssueCardDialog';
import { CardDetailsDialog } from '@/components/CardDetailsDialog';

interface IssuingCard {
  id: string;
  card_type: string;
  cardholder_name: string;
  cardholder_email: string;
  card_last4: string;
  card_status: string;
  current_balance: number;
  total_spent: number;
  issued_at: string;
  group_id: string | null;
  groups?: {
    name: string;
  };
}

interface InterchangeBalance {
  total_transactions: number;
  total_volume: number;
  total_interchange_earned: number;
  available_balance: number;
  pending_payout: number;
}

const IssuingPage: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganizations();
  const [cards, setCards] = useState<IssuingCard[]>([]);
  const [interchangeBalance, setInterchangeBalance] = useState<InterchangeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<IssuingCard | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization]);

  const loadData = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      // Load cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('issuing_cards')
        .select(`
          *,
          groups (
            name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('issued_at', { ascending: false });

      if (cardsError) throw cardsError;
      setCards(cardsData || []);

      // Load interchange balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('issuing_interchange_balances')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Balance error:', balanceError);
      } else {
        setInterchangeBalance(balanceData);
      }
    } catch (error) {
      console.error('Error loading issuing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load issuing data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      inactive: { variant: 'secondary', label: 'Inactive' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      suspended: { variant: 'outline', label: 'Suspended' },
      expired: { variant: 'secondary', label: 'Expired' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCardTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      coordinator: 'bg-indigo-100 text-blue-800',
      leader: 'bg-purple-100 text-purple-800',
      camper: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colors[type] || colors.general}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.cardholder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.cardholder_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.card_last4.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || card.card_status === statusFilter;
    const matchesType = typeFilter === 'all' || card.card_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCards = cards.filter((c) => c.card_status === 'active').length;
  const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
  const totalSpent = cards.reduce((sum, c) => sum + c.total_spent, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Virtual Card Issuing</h1>
          <p className="text-muted-foreground mt-1">
            Issue and manage virtual prepaid cards with spending controls
          </p>
        </div>
        <Button onClick={() => setIssueDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Issue New Card
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCards} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Across all cards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interchange Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(interchangeBalance?.available_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              80% share available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="cards" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex h-12 p-1.5 gap-1 bg-muted/40 border rounded-xl min-w-max">
            <TabsTrigger value="cards" className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-300 data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-muted/60">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Payouts</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cards" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Issued Cards
              </CardTitle>
              <CardDescription>
                Manage all virtual cards issued to coordinators and leaders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or card number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="leader">Leader</SelectItem>
                    <SelectItem value="camper">Camper</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cards Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cardholder</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          Loading cards...
                        </TableCell>
                      </TableRow>
                    ) : filteredCards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          <div className="py-8 text-center">
                            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">No cards found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {cards.length === 0
                                ? 'Get started by issuing your first virtual card'
                                : 'No cards match your filters'}
                            </p>
                            {cards.length === 0 && (
                              <Button
                                onClick={() => setIssueDialogOpen(true)}
                                className="mt-4"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Issue First Card
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCards.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{card.cardholder_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {card.cardholder_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono">•••• {card.card_last4}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getCardTypeBadge(card.card_type)}</TableCell>
                          <TableCell>
                            {card.groups?.name || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(card.current_balance)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(card.total_spent)}
                          </TableCell>
                          <TableCell>{getStatusBadge(card.card_status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCard(card);
                                  setDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                View all card transactions across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Transaction history coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Interchange Payouts
              </CardTitle>
              <CardDescription>
                Request payouts of your accumulated interchange revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">Available Balance</h3>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {formatCurrency(interchangeBalance?.available_balance || 0)}
                      </p>
                      <p className="text-sm text-indigo-700 mt-1">
                        From {interchangeBalance?.total_transactions || 0} transactions
                      </p>
                    </div>
                    <Button
                      disabled={(interchangeBalance?.available_balance || 0) < 1000}
                      size="lg"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Request Payout
                    </Button>
                  </div>
                  {(interchangeBalance?.available_balance || 0) < 1000 && (
                    <p className="text-xs text-indigo-700 mt-3">
                      Minimum payout amount is $10.00
                    </p>
                  )}
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <p>No payout history yet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <IssueCardDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        onSuccess={() => {
          setIssueDialogOpen(false);
          loadData();
        }}
      />

      <CardDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        card={selectedCard}
        onUpdate={loadData}
      />
    </div>
  );
};

export default IssuingPage;
