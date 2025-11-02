import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  require_signature: boolean;
  require_date_of_birth: boolean;
  require_emergency_contact: boolean;
}

interface WaiverSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  organizationId: string;
  ticketId: string;
  ticketCode: string;
  customerName: string;
  customerEmail: string;
  onWaiverSigned: () => void;
}

export const WaiverSigningModal: React.FC<WaiverSigningModalProps> = ({
  open,
  onOpenChange,
  eventId,
  organizationId,
  ticketId,
  ticketCode,
  customerName,
  customerEmail,
  onWaiverSigned,
}) => {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState<WaiverTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [currentWaiverIndex, setCurrentWaiverIndex] = useState(0);

  // Form state
  const [signerName, setSignerName] = useState(customerName);
  const [signerEmail, setSignerEmail] = useState(customerEmail);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (open) {
      loadActiveWaivers();
      setSignerName(customerName);
      setSignerEmail(customerEmail);
    }
  }, [open, eventId, organizationId, customerName, customerEmail]);

  const loadActiveWaivers = async () => {
    setLoading(true);
    try {
      // First check if this ticket already has signed waivers
      const { data: existingSignatures } = await supabase
        .from("waiver_signatures")
        .select("waiver_template_id")
        .eq("ticket_id", ticketId);

      const signedWaiverIds = existingSignatures?.map(s => s.waiver_template_id) || [];

      // Load active waivers that haven't been signed yet
      const query = supabase
        .from("waiver_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      // Get waivers for this specific event or organization-wide waivers
      const { data, error } = await query.or(`event_id.eq.${eventId},event_id.is.null`);

      if (error) throw error;

      // Filter out already signed waivers
      const unsignedWaivers = (data || []).filter(w => !signedWaiverIds.includes(w.id));

      setWaivers(unsignedWaivers);
      setCurrentWaiverIndex(0);

      // If no waivers need to be signed, close the modal
      if (unsignedWaivers.length === 0) {
        toast({
          title: "No Waivers Required",
          description: "All waivers have already been signed",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error loading waivers:", error);
      toast({
        title: "Error",
        description: "Failed to load waivers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignWaiver = async () => {
    const currentWaiver = waivers[currentWaiverIndex];
    if (!currentWaiver) return;

    // Validation
    if (!signerName.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (currentWaiver.require_date_of_birth && !dateOfBirth) {
      toast({
        title: "Required Field",
        description: "Please enter your date of birth",
        variant: "destructive",
      });
      return;
    }

    if (currentWaiver.require_emergency_contact && (!emergencyContactName || !emergencyContactPhone)) {
      toast({
        title: "Required Field",
        description: "Please enter emergency contact information",
        variant: "destructive",
      });
      return;
    }

    if (!hasAgreed) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the waiver terms",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    try {
      const { error } = await supabase
        .from("waiver_signatures")
        .insert({
          waiver_template_id: currentWaiver.id,
          ticket_id: ticketId,
          event_id: eventId,
          organization_id: organizationId,
          signer_name: signerName,
          signer_email: signerEmail || null,
          date_of_birth: dateOfBirth || null,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
          signature_data: "digital_acceptance",
          signature_type: "digital_acceptance",
          waiver_content_snapshot: currentWaiver.content,
          signed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Move to next waiver or finish
      if (currentWaiverIndex < waivers.length - 1) {
        setCurrentWaiverIndex(currentWaiverIndex + 1);
        setHasAgreed(false);
        toast({
          title: "Waiver Signed",
          description: `${waivers.length - currentWaiverIndex - 1} more to go`,
        });
      } else {
        toast({
          title: "All Waivers Signed",
          description: "Thank you for completing all waivers",
        });
        onWaiverSigned();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error signing waiver:", error);
      toast({
        title: "Error",
        description: "Failed to sign waiver",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const currentWaiver = waivers[currentWaiverIndex];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading waivers...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentWaiver) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {currentWaiver.title}
          </DialogTitle>
          <DialogDescription>
            Waiver {currentWaiverIndex + 1} of {waivers.length} | Ticket: {ticketCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Waiver Content */}
          <div className="border rounded-lg p-6 bg-muted/30 max-h-[300px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{currentWaiver.content}</p>
          </div>

          {/* Signer Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signerName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signerEmail">Email (Optional)</Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {currentWaiver.require_date_of_birth && (
              <div>
                <Label htmlFor="dob">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            )}

            {currentWaiver.require_emergency_contact && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">
                  Emergency Contact <span className="text-destructive">*</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="+64 21 123 4567"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start space-x-3 border-t pt-4">
            <Checkbox
              id="agree"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
            />
            <div className="flex-1">
              <label
                htmlFor="agree"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have read and agree to the terms of this waiver
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                By checking this box, you are providing a legal digital signature
              </p>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This waiver will be legally binding. Please read carefully before agreeing.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={signing}
          >
            Cancel
          </Button>
          <Button onClick={handleSignWaiver} disabled={signing || !hasAgreed}>
            {signing ? "Signing..." : "Sign Waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
