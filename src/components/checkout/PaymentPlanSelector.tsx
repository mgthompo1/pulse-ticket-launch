import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Theme } from '@/types/theme';
import { supabase } from '@/integrations/supabase/client';

interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: 'deposit' | 'installment';
  deposit_percentage: number | null;
  number_of_installments: number | null;
  installment_frequency: 'weekly' | 'biweekly' | 'monthly' | null;
  balance_due_days_before_event: number | null;
  payment_plan_fee_percentage: number;
  payment_plan_fee_fixed: number;
  min_order_amount: number;
  max_order_amount: number | null;
  requires_account: boolean;
}

interface PaymentScheduleItem {
  installment_number: number;
  amount: number;
  due_date: Date;
  label: string;
}

interface PaymentPlanSelectorProps {
  eventId: string;
  organizationId: string;
  orderTotal: number;
  eventDate: string;
  theme: Theme;
  isSignedIn: boolean;
  onPlanSelected: (plan: PaymentPlan | null, schedule: PaymentScheduleItem[] | null) => void;
  selectedPlanId?: string | null;
  groupId?: string | null;
  allocationId?: string | null;
}

export const PaymentPlanSelector: React.FC<PaymentPlanSelectorProps> = ({
  eventId,
  organizationId,
  orderTotal,
  eventDate,
  theme,
  isSignedIn,
  onPlanSelected,
  selectedPlanId,
  groupId = null,
  allocationId = null
}) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(selectedPlanId || null);
  const [groupPaymentPlansEnabled, setGroupPaymentPlansEnabled] = useState<boolean>(true);

  // Check if payment plans are enabled for this group
  useEffect(() => {
    const checkGroupPaymentPlans = async () => {
      if (!groupId) {
        setGroupPaymentPlansEnabled(true);
        return;
      }

      try {
        // First check allocation-level override, then group-level setting
        if (allocationId) {
          const { data: allocation } = await supabase
            .from("group_ticket_allocations")
            .select("payment_plans_enabled")
            .eq("id", allocationId)
            .single();

          if (allocation?.payment_plans_enabled !== null) {
            setGroupPaymentPlansEnabled(allocation.payment_plans_enabled);
            return;
          }
        }

        // Check group-level setting
        const { data: group } = await supabase
          .from("groups")
          .select("payment_plans_enabled")
          .eq("id", groupId)
          .single();

        setGroupPaymentPlansEnabled(group?.payment_plans_enabled ?? true);
      } catch (error) {
        console.error("Error checking group payment plan setting:", error);
        setGroupPaymentPlansEnabled(true); // Default to enabled on error
      }
    };

    checkGroupPaymentPlans();
  }, [groupId, allocationId]);

  useEffect(() => {
    loadPaymentPlans();
  }, [eventId, organizationId]);

  const loadPaymentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_plans")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .or(`event_id.is.null,event_id.eq.${eventId}`)
        .order("sort_order");

      if (error) throw error;

      // Filter plans based on order amount
      const eligiblePlans = (data || []).filter(plan => {
        if (plan.min_order_amount > 0 && orderTotal < plan.min_order_amount) return false;
        if (plan.max_order_amount && orderTotal > plan.max_order_amount) return false;
        return true;
      });

      setPaymentPlans(eligiblePlans);
    } catch (error) {
      console.error("Error loading payment plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSchedule = (plan: PaymentPlan): PaymentScheduleItem[] => {
    const schedule: PaymentScheduleItem[] = [];
    const planFee = (orderTotal * (plan.payment_plan_fee_percentage / 100)) + plan.payment_plan_fee_fixed;
    const totalWithFee = orderTotal + planFee;

    if (plan.plan_type === 'deposit') {
      // Deposit plan: initial deposit + final balance
      const depositPercentage = plan.deposit_percentage || 50;
      const depositAmount = (totalWithFee * depositPercentage) / 100;
      const balanceAmount = totalWithFee - depositAmount;

      // Initial deposit (today)
      schedule.push({
        installment_number: 1,
        amount: depositAmount,
        due_date: new Date(),
        label: `Deposit (${depositPercentage}%)`
      });

      // Balance due date
      const eventDateTime = new Date(eventDate);
      const balanceDueDate = new Date(eventDateTime);
      balanceDueDate.setDate(balanceDueDate.getDate() - (plan.balance_due_days_before_event || 7));

      schedule.push({
        installment_number: 2,
        amount: balanceAmount,
        due_date: balanceDueDate,
        label: 'Final Balance'
      });
    } else {
      // Installment plan: equal payments
      const numPayments = plan.number_of_installments || 2;
      const installmentAmount = totalWithFee / numPayments;
      const frequency = plan.installment_frequency || 'monthly';

      for (let i = 0; i < numPayments; i++) {
        const dueDate = new Date();

        if (frequency === 'weekly') {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        } else if (frequency === 'biweekly') {
          dueDate.setDate(dueDate.getDate() + (i * 14));
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        schedule.push({
          installment_number: i + 1,
          amount: installmentAmount,
          due_date: dueDate,
          label: i === 0 ? 'Due Today' : `Payment ${i + 1}`
        });
      }
    }

    return schedule;
  };

  const handlePlanSelect = (planId: string | null) => {
    setSelectedPlan(planId);

    if (planId === null || planId === 'full') {
      onPlanSelected(null, null);
    } else {
      const plan = paymentPlans.find(p => p.id === planId);
      if (plan) {
        const schedule = calculateSchedule(plan);
        onPlanSelected(plan, schedule);
      }
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card style={{ backgroundColor: theme.cardBackgroundColor }}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading payment options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentPlans.length === 0) {
    return null; // No payment plans available
  }

  // Hide payment plans if disabled for this group
  if (groupId && !groupPaymentPlansEnabled) {
    return null;
  }

  return (
    <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
          <CreditCard className="h-5 w-5" />
          Payment Options
        </CardTitle>
        <CardDescription>Choose how you'd like to pay</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedPlan || 'full'} onValueChange={handlePlanSelect}>
          {/* Full Payment Option */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="full" id="plan-full" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="plan-full" className="flex items-center gap-2 cursor-pointer font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Pay in Full
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Pay {formatCurrency(orderTotal)} today
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200">
              No fees
            </Badge>
          </div>

          <Separator className="my-2" />

          {/* Payment Plans */}
          {paymentPlans.map((plan) => {
            const schedule = calculateSchedule(plan);
            const planFee = (orderTotal * (plan.payment_plan_fee_percentage / 100)) + plan.payment_plan_fee_fixed;
            const canUse = !plan.requires_account || isSignedIn;

            return (
              <div
                key={plan.id}
                className={`p-4 rounded-lg border transition-colors ${
                  canUse
                    ? 'bg-muted/30 hover:bg-muted/50'
                    : 'bg-muted/10 opacity-60'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={plan.id}
                    id={`plan-${plan.id}`}
                    className="mt-1"
                    disabled={!canUse}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`plan-${plan.id}`}
                      className={`flex items-center gap-2 font-medium ${canUse ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <Calendar className="h-4 w-4 text-blue-500" />
                      {plan.name}
                      {plan.plan_type === 'deposit' && (
                        <Badge variant="secondary" className="text-xs">Deposit</Badge>
                      )}
                      {plan.plan_type === 'installment' && (
                        <Badge variant="secondary" className="text-xs">
                          {plan.number_of_installments} payments
                        </Badge>
                      )}
                    </Label>

                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    )}

                    {/* Payment Schedule Preview */}
                    <div className="mt-3 space-y-2">
                      {schedule.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.label} - {formatDate(item.due_date)}
                          </span>
                          <span className={idx === 0 ? 'font-medium' : ''}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Fee notice */}
                    {planFee > 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        +{formatCurrency(planFee)} payment plan fee
                      </p>
                    )}

                    {/* Sign-in requirement notice */}
                    {plan.requires_account && !isSignedIn && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Lock className="h-3 w-3" />
                        Sign in required for this option
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        {/* Info notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Payment Plan Info</p>
            <p className="text-blue-700 text-xs mt-1">
              Your card will be saved securely and charged automatically on each due date.
              You can manage your payments from your account.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
