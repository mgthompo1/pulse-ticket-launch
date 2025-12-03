import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRightLeft,
  ArrowUpCircle,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface TicketActionsProps {
  ticketId: string;
  ticketCode: string;
  ticketTypeName: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  customerEmail: string;
  customerName: string;
  ticketPrice: number;
  orderId: string;
  ticketTypeId: string;
}

interface EventSettings {
  transfers_enabled: boolean;
  transfer_deadline_hours: number;
  transfer_fee: number;
  transfer_fee_type: "none" | "fixed" | "percentage";
  upgrades_enabled: boolean;
  upgrade_deadline_hours: number;
  refund_policy: "no_refunds" | "full_refund" | "deadline_based" | "tiered" | "request_only";
  refund_deadline_hours: number;
  refund_percentage: number;
  refund_to_voucher_enabled: boolean;
}

interface UpgradePath {
  id: string;
  to_ticket_type_id: string;
  price_difference: number;
  upgrade_fee: number;
  to_ticket_type: {
    id: string;
    name: string;
    price: number;
    quantity_available: number;
    quantity_sold: number;
  };
}

const REFUND_REASONS = [
  { value: "cant_attend", label: "I can no longer attend" },
  { value: "event_changed", label: "Event details changed" },
  { value: "duplicate_purchase", label: "Duplicate purchase" },
  { value: "wrong_tickets", label: "Purchased wrong tickets" },
  { value: "other", label: "Other reason" },
];

export const TicketActions = ({
  ticketId,
  ticketCode,
  ticketTypeName,
  eventId,
  eventName,
  eventDate,
  customerEmail,
  customerName,
  ticketPrice,
  orderId,
  ticketTypeId,
}: TicketActionsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [upgradePaths, setUpgradePaths] = useState<UpgradePath[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Dialog states
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" });

  // Form states
  const [transferForm, setTransferForm] = useState({ toEmail: "", toName: "" });
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradePath | null>(null);
  const [refundForm, setRefundForm] = useState({ reason: "", details: "" });

  const loadSettings = async () => {
    if (settingsLoaded) return;

    try {
      const { data: eventData, error } = await supabase
        .from("events")
        .select(`
          transfers_enabled,
          transfer_deadline_hours,
          transfer_fee,
          transfer_fee_type,
          upgrades_enabled,
          upgrade_deadline_hours,
          refund_policy,
          refund_deadline_hours,
          refund_percentage,
          refund_to_voucher_enabled
        `)
        .eq("id", eventId)
        .single();

      if (error) throw error;

      setSettings({
        transfers_enabled: eventData?.transfers_enabled || false,
        transfer_deadline_hours: eventData?.transfer_deadline_hours || 24,
        transfer_fee: eventData?.transfer_fee || 0,
        transfer_fee_type: eventData?.transfer_fee_type || "none",
        upgrades_enabled: eventData?.upgrades_enabled || false,
        upgrade_deadline_hours: eventData?.upgrade_deadline_hours || 24,
        refund_policy: eventData?.refund_policy || "request_only",
        refund_deadline_hours: eventData?.refund_deadline_hours || 48,
        refund_percentage: eventData?.refund_percentage || 100,
        refund_to_voucher_enabled: eventData?.refund_to_voucher_enabled !== false,
      });

      // Load upgrade paths if upgrades enabled
      if (eventData?.upgrades_enabled) {
        const { data: paths } = await supabase
          .from("ticket_upgrade_paths")
          .select(`
            id,
            to_ticket_type_id,
            price_difference,
            upgrade_fee,
            to_ticket_type:ticket_types!ticket_upgrade_paths_to_ticket_type_id_fkey (
              id, name, price, quantity_available, quantity_sold
            )
          `)
          .eq("from_ticket_type_id", ticketTypeId)
          .eq("is_active", true);

        if (paths) {
          // Filter to only show paths with available tickets
          const availablePaths = paths.filter(
            (p) => p.to_ticket_type &&
            (p.to_ticket_type.quantity_available - p.to_ticket_type.quantity_sold) > 0
          );
          setUpgradePaths(availablePaths as UpgradePath[]);
        }
      }

      setSettingsLoaded(true);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const isWithinDeadline = (deadlineHours: number) => {
    const eventDateTime = new Date(eventDate);
    const now = new Date();
    const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEvent > deadlineHours;
  };

  const handleTransfer = async () => {
    if (!transferForm.toEmail) {
      toast({ title: "Please enter recipient email", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

      const transferFee = settings?.transfer_fee_type === "fixed"
        ? settings.transfer_fee
        : settings?.transfer_fee_type === "percentage"
        ? (ticketPrice * (settings.transfer_fee || 0)) / 100
        : 0;

      const { error } = await supabase.from("ticket_transfers").insert({
        ticket_id: ticketId,
        from_email: customerEmail,
        to_email: transferForm.toEmail,
        to_name: transferForm.toName || null,
        transfer_fee: transferFee,
        transfer_token: crypto.randomUUID(),
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      setShowTransferDialog(false);
      setTransferForm({ toEmail: "", toName: "" });
      setSuccessMessage({
        title: "Transfer Request Sent",
        description: `An email has been sent to ${transferForm.toEmail} to accept the transfer. They have 48 hours to accept.`,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error initiating transfer:", error);
      toast({
        title: "Transfer failed",
        description: error.message || "Could not initiate transfer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedUpgrade) {
      toast({ title: "Please select an upgrade option", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const totalCharge = selectedUpgrade.price_difference + selectedUpgrade.upgrade_fee;

      const { error } = await supabase.from("ticket_upgrades").insert({
        ticket_id: ticketId,
        event_id: eventId,
        from_ticket_type_id: ticketTypeId,
        to_ticket_type_id: selectedUpgrade.to_ticket_type_id,
        price_difference: selectedUpgrade.price_difference,
        upgrade_fee: selectedUpgrade.upgrade_fee,
        total_charged: totalCharge,
        status: "pending",
      });

      if (error) throw error;

      setShowUpgradeDialog(false);
      setSelectedUpgrade(null);
      setSuccessMessage({
        title: "Upgrade Request Submitted",
        description: `Your upgrade to ${selectedUpgrade.to_ticket_type.name} has been submitted. You'll receive a payment link via email.`,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error requesting upgrade:", error);
      toast({
        title: "Upgrade failed",
        description: error.message || "Could not request upgrade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundForm.reason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Determine refund amount based on policy
      let refundAmount = ticketPrice;
      if (settings?.refund_policy === "tiered" && !isWithinDeadline(settings.refund_deadline_hours)) {
        refundAmount = (ticketPrice * (settings.refund_percentage || 0)) / 100;
      }

      const { error } = await supabase.from("refund_requests").insert({
        ticket_id: ticketId,
        requested_by: customerEmail,
        reason_category: refundForm.reason,
        reason_details: refundForm.details || null,
        amount: refundAmount,
        refund_type: settings?.refund_policy === "full_refund" ? "full" : "partial",
        status: settings?.refund_policy === "request_only" ? "pending" : "approved",
      });

      if (error) throw error;

      setShowRefundDialog(false);
      setRefundForm({ reason: "", details: "" });

      const isPending = settings?.refund_policy === "request_only";
      setSuccessMessage({
        title: isPending ? "Refund Request Submitted" : "Refund Approved",
        description: isPending
          ? "Your refund request has been submitted for review. You'll receive an email once it's processed."
          : `Your refund of $${refundAmount.toFixed(2)} has been approved and will be processed within 5-10 business days.`,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error requesting refund:", error);
      toast({
        title: "Refund request failed",
        description: error.message || "Could not submit refund request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canTransfer = settings?.transfers_enabled && isWithinDeadline(settings.transfer_deadline_hours);
  const canUpgrade = settings?.upgrades_enabled && isWithinDeadline(settings.upgrade_deadline_hours) && upgradePaths.length > 0;
  const canRefund = settings?.refund_policy !== "no_refunds";

  return (
    <>
      <Accordion type="single" collapsible onValueChange={() => loadSettings()}>
        <AccordionItem value="actions" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Manage This Ticket
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {!settingsLoaded ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Transfer Button */}
                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-auto py-3"
                  onClick={() => setShowTransferDialog(true)}
                  disabled={!canTransfer}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Transfer</p>
                    <p className="text-xs text-muted-foreground">
                      {canTransfer ? "Give to someone else" : "Not available"}
                    </p>
                  </div>
                </Button>

                {/* Upgrade Button */}
                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-auto py-3"
                  onClick={() => setShowUpgradeDialog(true)}
                  disabled={!canUpgrade}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Upgrade</p>
                    <p className="text-xs text-muted-foreground">
                      {canUpgrade ? `${upgradePaths.length} option${upgradePaths.length > 1 ? 's' : ''}` : "Not available"}
                    </p>
                  </div>
                </Button>

                {/* Refund Button */}
                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-auto py-3"
                  onClick={() => setShowRefundDialog(true)}
                  disabled={!canRefund}
                >
                  <RotateCcw className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Refund</p>
                    <p className="text-xs text-muted-foreground">
                      {canRefund ? "Request refund" : "No refunds"}
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {settingsLoaded && !canTransfer && !canUpgrade && !canRefund && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                No actions available for this ticket
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ticket</DialogTitle>
            <DialogDescription>
              Transfer this ticket to someone else. They'll receive an email to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Ticket:</strong> {ticketTypeName}</p>
              <p><strong>Event:</strong> {eventName}</p>
              {settings?.transfer_fee_type !== "none" && settings?.transfer_fee && settings.transfer_fee > 0 && (
                <p className="mt-2 text-amber-600">
                  <strong>Transfer fee:</strong> {settings.transfer_fee_type === "fixed"
                    ? `$${settings.transfer_fee.toFixed(2)}`
                    : `${settings.transfer_fee}%`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={transferForm.toEmail}
                onChange={(e) => setTransferForm({ ...transferForm, toEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Name (optional)</Label>
              <Input
                placeholder="John Doe"
                value={transferForm.toName}
                onChange={(e) => setTransferForm({ ...transferForm, toName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Transfer Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Ticket</DialogTitle>
            <DialogDescription>
              Upgrade to a better ticket type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Current ticket:</strong> {ticketTypeName}</p>
              <p><strong>Current price:</strong> ${ticketPrice.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label>Select Upgrade</Label>
              <div className="space-y-2">
                {upgradePaths.map((path) => (
                  <div
                    key={path.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUpgrade?.id === path.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedUpgrade(path)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{path.to_ticket_type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${path.to_ticket_type.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          +${(path.price_difference + path.upgrade_fee).toFixed(2)}
                        </p>
                        {path.upgrade_fee > 0 && (
                          <p className="text-xs text-muted-foreground">
                            (includes ${path.upgrade_fee.toFixed(2)} fee)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={loading || !selectedUpgrade}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              {settings?.refund_policy === "request_only"
                ? "Submit a refund request for review"
                : "Request a refund for this ticket"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Ticket:</strong> {ticketTypeName}</p>
              <p><strong>Original price:</strong> ${ticketPrice.toFixed(2)}</p>
              {settings?.refund_policy === "tiered" && !isWithinDeadline(settings.refund_deadline_hours) && (
                <p className="text-amber-600 mt-2">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Past deadline - {settings.refund_percentage}% refund
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason for refund *</Label>
              <Select
                value={refundForm.reason}
                onValueChange={(value) => setRefundForm({ ...refundForm, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                placeholder="Any additional information..."
                value={refundForm.details}
                onChange={(e) => setRefundForm({ ...refundForm, details: e.target.value })}
                rows={3}
              />
            </div>

            {settings?.refund_to_voucher_enabled && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="text-blue-800">
                  <strong>Tip:</strong> You may be offered store credit instead of a cash refund,
                  which can be used for future events.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={loading || !refundForm.reason}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {successMessage.title}
            </DialogTitle>
            <DialogDescription>{successMessage.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
