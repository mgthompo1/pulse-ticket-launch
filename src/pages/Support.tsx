import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Headphones, Ticket, Clock, CheckCircle, AlertCircle, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
}

const Support = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [formData, setFormData] = useState({
    message: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadOrganization();
      loadSupportTickets();
    }
  }, [user]);

  const loadOrganization = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const loadSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_enquiries')
        .select('*')
        .eq('enquiry_type', 'support')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
    } catch (error) {
      console.error('Error loading support tickets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a message for your support ticket.",
        variant: "destructive",
      });
      return;
    }

    if (!organization) {
      toast({
        title: "Error",
        description: "Organization information not found.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: organization.name,
          email: organization.email,
          message: formData.message,
          enquiry_type: 'support',
          organization_id: organization.id,
          organization_name: organization.name
        }
      });

      if (error) throw error;

      toast({
        title: "Support Ticket Created!",
        description: "Your support ticket has been submitted. We'll get back to you soon.",
      });

      // Reset form and reload tickets
      setFormData({ message: "" });
      loadSupportTickets();

    } catch (error: any) {
      console.error('Support ticket error:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <SEOHead
        title="Support - TicketFlo"
        description="Get help with your TicketFlo account. Submit support tickets and track your requests."
      />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Headphones className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Support Center</h1>
            </div>
            <p className="text-muted-foreground">
              Need help with your TicketFlo account? Submit a support ticket and track your requests below.
            </p>
          </header>

          {/* Knowledge Base Banner */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Looking for quick answers?</h3>
                    <p className="text-muted-foreground">
                      Browse our knowledge base for guides, tutorials, and FAQs
                    </p>
                  </div>
                </div>
                <Link to="/help">
                  <Button size="lg" className="gap-2">
                    Visit Help Center
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Support Ticket */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Create Support Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input 
                      value={organization?.name || "Loading..."} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input 
                      value={organization?.email || "Loading..."} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      Describe your issue <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ message: e.target.value })}
                      placeholder="Please describe your issue in detail..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !organization}
                    className="w-full"
                  >
                    {isSubmitting ? "Creating Ticket..." : "Create Support Ticket"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Support Tickets History */}
            <Card>
              <CardHeader>
                <CardTitle>Your Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No support tickets yet</p>
                    <p className="text-sm">Create your first support ticket using the form on the left.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            <span className="font-medium text-sm">
                              Ticket #{ticket.id.slice(-8)}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(ticket.status)}
                          >
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                          {ticket.updated_at !== ticket.created_at && (
                            <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Help Resources */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Popular Help Topics</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      <Link to="/help/getting-started/create-your-first-event" className="hover:text-primary">
                        • Creating your first event
                      </Link>
                    </li>
                    <li>
                      <Link to="/help/payments/setup-stripe" className="hover:text-primary">
                        • Setting up payments
                      </Link>
                    </li>
                    <li>
                      <Link to="/help/customization/confirmation-emails" className="hover:text-primary">
                        • Customizing emails
                      </Link>
                    </li>
                    <li>
                      <Link to="/help/events-management/publish-event" className="hover:text-primary">
                        • Publishing your event
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Response Times</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Critical: 4 hours</li>
                    <li>• Normal: 24 hours</li>
                    <li>• Low: 48 hours</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Contact Info</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Email: support@ticketflo.com</li>
                    <li>• Phone: +1 (555) 123-4567</li>
                    <li>• Hours: Mon-Fri 9AM-6PM PST</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Support;