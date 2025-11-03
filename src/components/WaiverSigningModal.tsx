import { useState, useEffect, useRef } from "react";
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
import { FileSignature, AlertCircle, Pen, Type, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignatureCanvas from "react-signature-canvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Signature state
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState("");

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

    // Validate signature
    if (currentWaiver.require_signature) {
      if (signatureType === 'draw') {
        if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
          toast({
            title: "Signature Required",
            description: "Please draw your signature",
            variant: "destructive",
          });
          return;
        }
      } else if (signatureType === 'type') {
        if (!typedSignature.trim()) {
          toast({
            title: "Signature Required",
            description: "Please type your full name as signature",
            variant: "destructive",
          });
          return;
        }
      }
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
      // Get signature data
      let signatureData = "digital_acceptance";
      let signatureTypeValue = "digital_acceptance";

      if (currentWaiver.require_signature) {
        if (signatureType === 'draw' && signaturePadRef.current) {
          signatureData = signaturePadRef.current.toDataURL();
          signatureTypeValue = "drawn";
        } else if (signatureType === 'type') {
          signatureData = typedSignature;
          signatureTypeValue = "typed";
        }
      }

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
          signature_data: signatureData,
          signature_type: signatureTypeValue,
          waiver_content_snapshot: currentWaiver.content,
          signed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Move to next waiver or finish
      if (currentWaiverIndex < waivers.length - 1) {
        setCurrentWaiverIndex(currentWaiverIndex + 1);
        setHasAgreed(false);
        // Clear signature for next waiver
        if (signaturePadRef.current) {
          signaturePadRef.current.clear();
        }
        setTypedSignature("");
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

          {/* Signature Section */}
          {currentWaiver.require_signature && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  Your Signature <span className="text-destructive">*</span>
                </h4>
              </div>

              <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'draw' | 'type')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw" className="flex items-center gap-2">
                    <Pen className="h-4 w-4" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="type" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Type
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-2">
                  <div className="border-2 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signaturePadRef}
                      canvasProps={{
                        className: 'w-full h-40 cursor-crosshair',
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signaturePadRef.current?.clear()}
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear Signature
                  </Button>
                </TabsContent>

                <TabsContent value="type" className="space-y-2">
                  <Input
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type your full legal name"
                    className="font-serif text-2xl italic"
                  />
                  <p className="text-xs text-muted-foreground">
                    Type your full name as it appears on official documents
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}

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
                By {currentWaiver.require_signature ? "signing and" : ""} checking this box, you are providing a legal digital signature
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
