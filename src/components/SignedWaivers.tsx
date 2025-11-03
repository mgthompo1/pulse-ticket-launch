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
import jsPDF from "jspdf";

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

  const handleDownloadPDF = async (signature: WaiverSignature) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Signed Waiver", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Waiver title
      pdf.setFontSize(14);
      pdf.text(signature.waiver_templates?.title || "Waiver", margin, yPosition);
      yPosition += 10;

      // Signer information
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Signer: ${signature.signer_name}`, margin, yPosition);
      yPosition += 7;

      if (signature.signer_email) {
        pdf.text(`Email: ${signature.signer_email}`, margin, yPosition);
        yPosition += 7;
      }

      if (signature.date_of_birth) {
        pdf.text(`Date of Birth: ${new Date(signature.date_of_birth).toLocaleDateString()}`, margin, yPosition);
        yPosition += 7;
      }

      if (signature.tickets) {
        pdf.text(`Ticket: ${signature.tickets.ticket_code}`, margin, yPosition);
        yPosition += 7;
      }

      if (signature.emergency_contact_name) {
        pdf.text(`Emergency Contact: ${signature.emergency_contact_name}`, margin, yPosition);
        yPosition += 7;
        if (signature.emergency_contact_phone) {
          pdf.text(`Emergency Phone: ${signature.emergency_contact_phone}`, margin, yPosition);
          yPosition += 7;
        }
      }

      pdf.text(`Signed At: ${formatDate(signature.signed_at)}`, margin, yPosition);
      yPosition += 12;

      // Waiver content
      pdf.setFont("helvetica", "bold");
      pdf.text("Waiver Content:", margin, yPosition);
      yPosition += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const contentLines = pdf.splitTextToSize(signature.waiver_content_snapshot, maxWidth);

      for (const line of contentLines) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      }

      yPosition += 10;

      // Signature
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Signature:", margin, yPosition);
      yPosition += 7;

      if (signature.signature_type === "drawn") {
        // Add drawn signature as image
        try {
          pdf.addImage(signature.signature_data, "PNG", margin, yPosition, 80, 30);
          yPosition += 35;
        } catch (error) {
          console.error("Error adding signature image:", error);
          pdf.setFont("helvetica", "italic");
          pdf.text("(Signature image could not be embedded)", margin, yPosition);
          yPosition += 7;
        }
      } else if (signature.signature_type === "typed") {
        pdf.setFont("times", "italic");
        pdf.setFontSize(16);
        pdf.text(signature.signature_data, margin, yPosition);
        yPosition += 7;
        pdf.line(margin, yPosition, margin + 80, yPosition);
        yPosition += 7;
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Digital Acceptance - Signer accepted terms digitally", margin, yPosition);
        yPosition += 7;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(128);
      pdf.text(`Document ID: ${signature.id}`, margin, pageHeight - 10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, pageHeight - 10, { align: "right" });

      // Save PDF
      const filename = `waiver_${signature.signer_name.replace(/\s+/g, "_")}_${new Date(signature.signed_at).toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: "PDF Downloaded",
        description: "Signed waiver has been downloaded as PDF",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(signature)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle>Signed Waiver Details</DialogTitle>
                <DialogDescription>
                  {selectedSignature && formatDate(selectedSignature.signed_at)}
                </DialogDescription>
              </div>
              {selectedSignature && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedSignature)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
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
                  ) : selectedSignature.signature_type === "drawn" ? (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        Drawn Signature
                      </p>
                      <img
                        src={selectedSignature.signature_data}
                        alt="Signature"
                        className="max-w-full h-auto mx-auto border-b border-gray-300"
                        style={{ maxHeight: '120px' }}
                      />
                    </div>
                  ) : selectedSignature.signature_type === "typed" ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Typed Signature
                      </p>
                      <p className="font-serif text-3xl italic border-b border-gray-300 inline-block px-4">
                        {selectedSignature.signature_data}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Unknown signature type: {selectedSignature.signature_type}
                      </p>
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
