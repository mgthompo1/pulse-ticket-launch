import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, CreditCard, Calendar, Percent, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentPlan {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  plan_type: 'deposit' | 'installment';
  deposit_percentage: number | null;
  deposit_fixed_amount: number | null;
  number_of_installments: number;
  installment_frequency: 'weekly' | 'biweekly' | 'monthly';
  balance_due_days_before_event: number;
  payment_plan_fee_percentage: number;
  payment_plan_fee_fixed: number;
  min_order_amount: number;
  max_order_amount: number | null;
  requires_account: boolean;
}

interface PaymentPlansManagerProps {
  organizationId: string;
  eventId?: string;
}

const PaymentPlansManager: React.FC<PaymentPlansManagerProps> = ({
  organizationId,
  eventId
}) => {
  const { toast } = useToast();
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [formData, setFormData] = useState<PaymentPlan>({
    name: "",
    description: "",
    is_active: true,
    plan_type: 'deposit',
    deposit_percentage: 50,
    deposit_fixed_amount: null,
    number_of_installments: 2,
    installment_frequency: 'monthly',
    balance_due_days_before_event: 7,
    payment_plan_fee_percentage: 0,
    payment_plan_fee_fixed: 0,
    min_order_amount: 0,
    max_order_amount: null,
    requires_account: true
  });

  useEffect(() => {
    loadPaymentPlans();
  }, [organizationId, eventId]);

  const loadPaymentPlans = async () => {
    try {
      let query = supabase
        .from("payment_plans")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });

      if (eventId) {
        query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPaymentPlans(data || []);
    } catch (error) {
      console.error("Error loading payment plans:", error);
      toast({
        title: "Error",
        description: "Failed to load payment plans",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planData = {
        organization_id: organizationId,
        event_id: eventId || null,
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        plan_type: formData.plan_type,
        deposit_percentage: formData.plan_type === 'deposit' ? formData.deposit_percentage : null,
        deposit_fixed_amount: formData.plan_type === 'deposit' ? formData.deposit_fixed_amount : null,
        number_of_installments: formData.plan_type === 'installment' ? formData.number_of_installments : null,
        installment_frequency: formData.plan_type === 'installment' ? formData.installment_frequency : null,
        balance_due_days_before_event: formData.balance_due_days_before_event,
        payment_plan_fee_percentage: formData.payment_plan_fee_percentage,
        payment_plan_fee_fixed: formData.payment_plan_fee_fixed,
        min_order_amount: formData.min_order_amount,
        max_order_amount: formData.max_order_amount,
        requires_account: formData.requires_account
      };

      if (editingPlan?.id) {
        const { error } = await supabase
          .from("payment_plans")
          .update(planData)
          .eq("id", editingPlan.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment plan updated successfully!",
        });
      } else {
        const { error } = await supabase
          .from("payment_plans")
          .insert(planData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment plan created successfully!",
        });
      }

      await loadPaymentPlans();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving payment plan:", error);
      toast({
        title: "Error",
        description: "Failed to save payment plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      is_active: plan.is_active,
      plan_type: plan.plan_type,
      deposit_percentage: plan.deposit_percentage || 50,
      deposit_fixed_amount: plan.deposit_fixed_amount || null,
      number_of_installments: plan.number_of_installments || 2,
      installment_frequency: plan.installment_frequency || 'monthly',
      balance_due_days_before_event: plan.balance_due_days_before_event || 7,
      payment_plan_fee_percentage: plan.payment_plan_fee_percentage || 0,
      payment_plan_fee_fixed: plan.payment_plan_fee_fixed || 0,
      min_order_amount: plan.min_order_amount || 0,
      max_order_amount: plan.max_order_amount || null,
      requires_account: plan.requires_account !== false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this payment plan?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("payment_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment plan deleted successfully!",
      });

      await loadPaymentPlans();
    } catch (error) {
      console.error("Error deleting payment plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment plan",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (plan: PaymentPlan) => {
    try {
      const { error } = await supabase
        .from("payment_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;

      await loadPaymentPlans();
      toast({
        title: plan.is_active ? "Plan Disabled" : "Plan Enabled",
        description: `${plan.name} is now ${plan.is_active ? 'disabled' : 'enabled'}`,
      });
    } catch (error) {
      console.error("Error toggling payment plan:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
      plan_type: 'deposit',
      deposit_percentage: 50,
      deposit_fixed_amount: null,
      number_of_installments: 2,
      installment_frequency: 'monthly',
      balance_due_days_before_event: 7,
      payment_plan_fee_percentage: 0,
      payment_plan_fee_fixed: 0,
      min_order_amount: 0,
      max_order_amount: null,
      requires_account: true
    });
    setEditingPlan(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Plans
            </CardTitle>
            <CardDescription>
              Allow customers to pay in installments or with deposits
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? "Edit Payment Plan" : "Create Payment Plan"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure how customers can split their payments
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Plan Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Pay 50% Now"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan_type">Plan Type *</Label>
                      <Select
                        value={formData.plan_type}
                        onValueChange={(value: 'deposit' | 'installment') =>
                          setFormData({ ...formData, plan_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit + Balance</SelectItem>
                          <SelectItem value="installment">Split Payments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the payment plan..."
                      rows={2}
                    />
                  </div>

                  {formData.plan_type === 'deposit' && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Deposit Configuration
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Deposit Percentage</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              value={formData.deposit_percentage || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                deposit_percentage: e.target.value ? parseFloat(e.target.value) : null
                              })}
                              placeholder="50"
                            />
                            <span className="absolute right-3 top-2 text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Balance Due (Days Before Event)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.balance_due_days_before_event}
                            onChange={(e) => setFormData({
                              ...formData,
                              balance_due_days_before_event: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.plan_type === 'installment' && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Installment Configuration
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Number of Payments</Label>
                          <Input
                            type="number"
                            min="2"
                            max="12"
                            value={formData.number_of_installments}
                            onChange={(e) => setFormData({
                              ...formData,
                              number_of_installments: parseInt(e.target.value) || 2
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={formData.installment_frequency}
                            onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') =>
                              setFormData({ ...formData, installment_frequency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Fees & Restrictions
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Fee (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={formData.payment_plan_fee_percentage}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_plan_fee_percentage: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min Order Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            className="pl-8"
                            value={formData.min_order_amount}
                            onChange={(e) => setFormData({
                              ...formData,
                              min_order_amount: parseFloat(e.target.value) || 0
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={formData.requires_account}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, requires_account: checked })
                        }
                      />
                      <div>
                        <Label>Requires Customer Account</Label>
                        <p className="text-xs text-muted-foreground">
                          Customer must sign in to use this payment plan
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label>Plan is Active</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No payment plans yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Create payment plans to let customers pay in installments
                  </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Payment Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {paymentPlans.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Badge variant={plan.plan_type === 'deposit' ? 'default' : 'secondary'}>
                          {plan.plan_type === 'deposit' ? 'Deposit' : 'Installments'}
                        </Badge>
                        {!plan.is_active && (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => handleToggleActive(plan)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => plan.id && handleDelete(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {plan.plan_type === 'deposit' ? (
                      <>
                        <div>
                          <p className="text-muted-foreground">Deposit</p>
                          <p className="font-medium">{plan.deposit_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance Due</p>
                          <p className="font-medium">{plan.balance_due_days_before_event} days before</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-muted-foreground">Payments</p>
                          <p className="font-medium">{plan.number_of_installments}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Frequency</p>
                          <p className="font-medium capitalize">{plan.installment_frequency}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-muted-foreground">Min Order</p>
                      <p className="font-medium">
                        {plan.min_order_amount > 0 ? `$${plan.min_order_amount}` : 'No minimum'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plan Fee</p>
                      <p className="font-medium">
                        {plan.payment_plan_fee_percentage > 0 ? `${plan.payment_plan_fee_percentage}%` : 'No fee'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentPlansManager;
