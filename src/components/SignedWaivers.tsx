import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, Search, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface WaiverSignature {
  id: string;
  waiver_template_id: string;
  ticket_id: string;
  signer_name: string;
  signer_email: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  signature_data: string;
  signature_type: string;
  signed_at: string;
  waiver_content_snapshot: string;
  waiver_templates: {
    title: string;
  } | null;
  tickets: {
    ticket_code: string;
  } | null;
}

interface SignedWaiversProps {
  eventId: string;
  organizationId: string;
}

export const SignedWaivers: React.FC<SignedWaiversProps> = ({
  eventId,
  organizationId,
}) => {
  const { toast } = useToast();
  const [signatures, setSignatures] = useState<WaiverSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<WaiverSignature | null>(null);

  useEffect(() => {
    loadSignedWaivers();
  }, [eventId, organizationId]);

  const loadSignedWaivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("waiver_signatures")
        .select(`
          *,
          waiver_templates (title),
          tickets (ticket_code)
        `)
        .eq("event_id", eventId)
        .eq("organization_id", organizationId)
        .order("signed_at", { ascending: false });

      if (error) throw error;
      setSignatures(data || []);
    } catch (error) {
      console.error("Error loading signed waivers:", error);
      toast({
        title: "Error",
        description: "Failed to load signed waivers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSignatures = signatures.filter((sig) => {
    const query = searchQuery.toLowerCase();
    return (
      sig.signer_name.toLowerCase().includes(query) ||
      sig.signer_email?.toLowerCase().includes(query) ||
      sig.tickets?.ticket_code?.toLowerCase().includes(query)
    );
  });

  const handleView = (signature: WaiverSignature) => {
    setSelectedSignature(signature);
    setViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Signed Waivers
              </CardTitle>
              <CardDescription>
                View all waivers signed by attendees ({signatures.length} total)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ticket code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : filteredSignatures.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No waivers found matching your search"
                  : "No waivers have been signed yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSignatures.map((signature) => (
                <div
                  key={signature.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{signature.signer_name}</h4>
                        <Badge variant="outline">
                          {signature.waiver_templates?.title || "Waiver"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {signature.signer_email && (
                          <p>Email: {signature.signer_email}</p>
                        )}
                        {signature.tickets && (
                          <p>
                            Ticket: {signature.tickets.ticket_code}
                          </p>
                        )}
                        {signature.date_of_birth && (
                          <p>DOB: {new Date(signature.date_of_birth).toLocaleDateString()}</p>
                        )}
                        {signature.emergency_contact_name && (
                          <p>
                            Emergency Contact: {signature.emergency_contact_name}
                            {signature.emergency_contact_phone && ` - ${signature.emergency_contact_phone}`}
                          </p>
                        )}
                        <p className="text-xs">Signed: {formatDate(signature.signed_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(signature)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Signature Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Signed Waiver Details</DialogTitle>
            <DialogDescription>
              {selectedSignature && formatDate(selectedSignature.signed_at)}
            </DialogDescription>
          </DialogHeader>

          {selectedSignature && (
            <div className="space-y-6">
              {/* Signer Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Signer Name
                  </h4>
                  <p className="text-sm">{selectedSignature.signer_name}</p>
                </div>
                {selectedSignature.signer_email && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Email
                    </h4>
                    <p className="text-sm">{selectedSignature.signer_email}</p>
                  </div>
                )}
                {selectedSignature.date_of_birth && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Date of Birth
                    </h4>
                    <p className="text-sm">
                      {new Date(selectedSignature.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedSignature.tickets && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Ticket
                    </h4>
                    <p className="text-sm">
                      {selectedSignature.tickets.ticket_code}
                    </p>
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              {selectedSignature.emergency_contact_name && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm">{selectedSignature.emergency_contact_name}</p>
                    </div>
                    {selectedSignature.emergency_contact_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{selectedSignature.emergency_contact_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Waiver Content */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Waiver Content
                </h4>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedSignature.waiver_content_snapshot}
                  </p>
                </div>
              </div>

              {/* Signature */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Signature
                </h4>
                <div className="border rounded-lg p-4 bg-white">
                  {selectedSignature.signature_type === "digital_acceptance" ? (
                    <div className="text-center py-4">
                      <p className="text-sm font-semibold">Digital Acceptance</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Signer accepted terms digitally
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        Signature Type: {selectedSignature.signature_type}
                      </p>
                      {/* Placeholder for signature image */}
                      <p className="text-sm italic">Signature data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>Signature ID: {selectedSignature.id}</p>
                <p>Signed At: {formatDate(selectedSignature.signed_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
