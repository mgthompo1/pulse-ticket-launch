import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, DollarSign } from 'lucide-react';

interface IssueCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Group {
  id: string;
  name: string;
}

export const IssueCardDialog: React.FC<IssueCardDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganizations();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  // Form state
  const [cardType, setCardType] = useState<string>('coordinator');
  const [groupId, setGroupId] = useState<string>('none');
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderEmail, setCardholderEmail] = useState('');
  const [cardholderPhone, setCardholderPhone] = useState('');
  const [cardholderDob, setCardholderDob] = useState('');
  const [initialBalance, setInitialBalance] = useState('100.00');
  const [spendingLimitAmount, setSpendingLimitAmount] = useState('500.00');
  const [spendingLimitInterval, setSpendingLimitInterval] = useState<string>('daily');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    if (open && currentOrganization) {
      loadGroups();
    }
  }, [open, currentOrganization]);

  const loadGroups = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const resetForm = () => {
    setCardType('coordinator');
    setGroupId('none');
    setCardholderName('');
    setCardholderEmail('');
    setCardholderPhone('');
    setCardholderDob('');
    setInitialBalance('100.00');
    setSpendingLimitAmount('500.00');
    setSpendingLimitInterval('daily');
    setPurpose('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    // Validation
    if (!cardholderName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Cardholder name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!cardholderEmail.trim() || !cardholderEmail.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Valid email is required',
        variant: 'destructive',
      });
      return;
    }

    const balanceCents = Math.round(parseFloat(initialBalance || '0') * 100);
    if (balanceCents < 0) {
      toast({
        title: 'Validation Error',
        description: 'Initial balance must be positive',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🎫 Issuing new virtual card...', {
        cardType,
        cardholderName,
        cardholderEmail,
        initialBalance: balanceCents,
      });

      // Call edge function to issue card via Stripe Issuing API
      const { data, error } = await supabase.functions.invoke('issue-card', {
        body: {
          organizationId: currentOrganization.id,
          groupId: groupId === 'none' ? null : groupId,
          cardType,
          cardholderName,
          cardholderEmail,
          cardholderPhone: cardholderPhone || null,
          cardholderDob: cardholderDob || null,
          initialBalance: balanceCents,
          spendingLimitAmount: spendingLimitAmount
            ? Math.round(parseFloat(spendingLimitAmount) * 100)
            : null,
          spendingLimitInterval: spendingLimitInterval || null,
          purpose: purpose || null,
        },
      });

      if (error) throw error;

      console.log('✅ Card issued successfully:', data);

      toast({
        title: 'Success!',
        description: `Virtual card issued to ${cardholderName}`,
      });

      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error issuing card:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Issue New Virtual Card
          </DialogTitle>
          <DialogDescription>
            Create a new virtual prepaid card with spending controls
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Type & Group */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type *</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger id="cardType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="camper">Camper</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group (Optional)</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cardholder Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Cardholder Information</h3>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Full Name *</Label>
              <Input
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardholderEmail">Email *</Label>
                <Input
                  id="cardholderEmail"
                  type="email"
                  value={cardholderEmail}
                  onChange={(e) => setCardholderEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardholderPhone">Phone (Optional)</Label>
                <Input
                  id="cardholderPhone"
                  type="tel"
                  value={cardholderPhone}
                  onChange={(e) => setCardholderPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {cardType === 'camper' && (
              <div className="space-y-2">
                <Label htmlFor="cardholderDob">Date of Birth (Required for Camper Cards)</Label>
                <Input
                  id="cardholderDob"
                  type="date"
                  value={cardholderDob}
                  onChange={(e) => setCardholderDob(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required by Stripe Issuing for individual cardholders
                </p>
              </div>
            )}
          </div>

          {/* Financial Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Financial Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="initialBalance">Initial Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="initialBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="pl-10"
                  placeholder="100.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Amount to load onto the card initially
              </p>
            </div>
          </div>

          {/* Spending Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Spending Controls</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="spendingLimit">Spending Limit</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="spendingLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={spendingLimitAmount}
                    onChange={(e) => setSpendingLimitAmount(e.target.value)}
                    className="pl-10"
                    placeholder="500.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitInterval">Limit Interval</Label>
                <Select value={spendingLimitInterval} onValueChange={setSpendingLimitInterval}>
                  <SelectTrigger id="limitInterval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_authorization">Per Transaction</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 p-3 rounded-md border border-amber-200">
              <strong>Note:</strong> Category restrictions and country limits can be configured
              after card issuance through Stripe Dashboard
            </p>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose / Notes (Optional)</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Summer Camp Leader Expenses, Youth Group Gas & Food"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Issuing Card...' : 'Issue Card ($0.10 fee)'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
