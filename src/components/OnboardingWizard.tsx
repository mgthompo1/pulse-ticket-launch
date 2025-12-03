import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  Rocket,
  Calendar,
  Ticket,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  MapPin,
  Users,
  DollarSign,
  PartyPopper,
  ExternalLink,
  Copy,
  Church,
  Mic2,
  Handshake,
  Theater,
  GraduationCap,
  UserPlus,
  UsersRound,
  FileCheck,
  Mail,
  Printer,
  UserCog,
  QrCode,
  LayoutGrid,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
}

type Step = "welcome" | "event-type" | "event-basics" | "tickets" | "payment" | "success";

type EventType = "church" | "conference" | "customer" | "partner" | "performance" | "graduation" | null;

interface FeatureItem {
  icon: React.ElementType;
  label: string;
  description: string;
  navTarget?: string; // Tab to navigate to
  settingsKey?: string; // Settings to enable
}

interface EventTypeOption {
  id: EventType;
  title: string;
  description: string;
  icon: React.ElementType;
  features: FeatureItem[];
}

const EVENT_TYPES: EventTypeOption[] = [
  {
    id: "church",
    title: "Church / Ministry",
    description: "Services, camps, retreats, and ministry events",
    icon: Church,
    features: [
      { icon: UsersRound, label: "Groups", description: "Organize sub-churches and ministries", navTarget: "groups", settingsKey: "groups_enabled" },
      { icon: UserPlus, label: "Bulk Import", description: "Import guest lists in bulk", navTarget: "event-details" },
      { icon: FileCheck, label: "Waivers", description: "Digital waivers for camps and youth events", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "Real-time check-in at the door", navTarget: "events" },
    ],
  },
  {
    id: "conference",
    title: "Conference",
    description: "Professional conferences and corporate events",
    icon: Mic2,
    features: [
      { icon: Mail, label: "Email Tickets", description: "Send confirmation emails instead of QR codes", navTarget: "event-details" },
      { icon: Printer, label: "Badge Printing", description: "Print lanyards and name badges", navTarget: "event-details" },
      { icon: UserPlus, label: "Bulk Import", description: "Import attendee lists in bulk", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "Fast check-in with barcode scanning", navTarget: "events" },
    ],
  },
  {
    id: "customer",
    title: "Customer Event",
    description: "Events for your existing customers",
    icon: Users,
    features: [
      { icon: UserCog, label: "CRM Integration", description: "Track customer engagement and history", navTarget: "customers", settingsKey: "crm_enabled" },
      { icon: Mail, label: "Email Campaigns", description: "Send targeted invitations", navTarget: "marketing" },
      { icon: QrCode, label: "QR Tickets", description: "Simple mobile-friendly tickets", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "Streamlined guest check-in", navTarget: "events" },
    ],
  },
  {
    id: "partner",
    title: "Partner Event",
    description: "Events for business partners and prospects",
    icon: Handshake,
    features: [
      { icon: UserCog, label: "CRM Integration", description: "Track partner relationships", navTarget: "customers", settingsKey: "crm_enabled" },
      { icon: Mail, label: "Playbooks", description: "Automated communication sequences", navTarget: "playbooks", settingsKey: "playbooks_enabled" },
      { icon: QrCode, label: "QR Tickets", description: "Professional mobile tickets", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "VIP-ready check-in experience", navTarget: "events" },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    description: "Concerts, theater, and live performances",
    icon: Theater,
    features: [
      { icon: LayoutGrid, label: "Seat Mapping", description: "Interactive seat selection", navTarget: "event-details" },
      { icon: QrCode, label: "QR Tickets", description: "Secure scannable tickets", navTarget: "event-details" },
      { icon: Ticket, label: "Multiple Tiers", description: "VIP, General Admission, and more", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "High-volume check-in scanning", navTarget: "events" },
    ],
  },
  {
    id: "graduation",
    title: "Graduation",
    description: "Ceremonies and graduation events",
    icon: GraduationCap,
    features: [
      { icon: LayoutGrid, label: "Seat Mapping", description: "Assign family seating sections", navTarget: "event-details" },
      { icon: UserPlus, label: "Guest Limits", description: "Control tickets per graduate", navTarget: "event-details" },
      { icon: QrCode, label: "QR Tickets", description: "Easy ticket distribution", navTarget: "event-details" },
      { icon: Smartphone, label: "TicketFlo LIVE", description: "Organized venue entry", navTarget: "events" },
    ],
  },
];

interface EventData {
  name: string;
  date: string;
  time: string;
  venue: string;
  capacity: string;
  description: string;
}

interface TicketData {
  name: string;
  price: string;
  quantity: string;
  description: string;
}

const STEPS: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "event-type", title: "Event Type", icon: LayoutGrid },
  { id: "event-basics", title: "Event Details", icon: Calendar },
  { id: "tickets", title: "Tickets", icon: Ticket },
  { id: "payment", title: "Payments", icon: CreditCard },
  { id: "success", title: "Complete", icon: CheckCircle2 },
];

export const OnboardingWizard = ({ isOpen, onClose, onComplete, onNavigate }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [eventUrl, setEventUrl] = useState<string>("");
  const [selectedEventType, setSelectedEventType] = useState<EventType>(null);
  const { toast } = useToast();
  const { currentOrganization: organization } = useOrganizations();

  const [eventData, setEventData] = useState<EventData>({
    name: "",
    date: "",
    time: "19:00",
    venue: "",
    capacity: "100",
    description: "",
  });

  const [ticketData, setTicketData] = useState<TicketData>({
    name: "General Admission",
    price: "25",
    quantity: "100",
    description: "",
  });

  // Ref to prevent duplicate event creation from rapid clicks
  const isCreatingEventRef = useRef(false);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const goToNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goToPrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const createEvent = async () => {
    // Prevent duplicate submissions using ref (survives re-renders)
    if (isCreatingEventRef.current) {
      console.log("Event creation already in progress, ignoring duplicate call");
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    isCreatingEventRef.current = true;
    setIsLoading(true);
    try {
      // Combine date and time
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          organization_id: organization.id,
          name: eventData.name,
          event_date: eventDateTime.toISOString(),
          venue: eventData.venue,
          capacity: parseInt(eventData.capacity) || 100,
          description: eventData.description,
          status: "draft",
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create the ticket type
      const { error: ticketError } = await supabase
        .from("ticket_types")
        .insert({
          event_id: event.id,
          name: ticketData.name,
          price: parseFloat(ticketData.price) || 0,
          quantity_available: parseInt(ticketData.quantity) || 100,
          description: ticketData.description || null,
        });

      if (ticketError) throw ticketError;

      setCreatedEventId(event.id);
      setEventUrl(`${window.location.origin}/widget/${event.id}`);

      // Mark onboarding as complete (per-organization)
      if (organization?.id) {
        localStorage.setItem(`onboarding_completed_${organization.id}`, "true");
      }

      goToNext();
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
      // Reset ref on error so user can retry
      isCreatingEventRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const publishEvent = async () => {
    if (!createdEventId || !organization?.id) return;

    setIsLoading(true);
    try {
      // Check billing setup first
      const { data: billingData } = await supabase.rpc('check_billing_setup', {
        p_organization_id: organization.id
      });

      if (!billingData) {
        toast({
          title: "Billing Setup Required",
          description: "Please set up billing and add a payment method before publishing events",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", createdEventId);

      if (error) throw error;

      toast({
        title: "Event Published!",
        description: "Your event is now live and ready to sell tickets.",
      });
    } catch (error) {
      console.error("Error publishing:", error);
      toast({
        title: "Error",
        description: "Failed to publish event.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyEventUrl = () => {
    navigator.clipboard.writeText(eventUrl);
    toast({
      title: "Copied!",
      description: "Event URL copied to clipboard.",
    });
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    // Mark onboarding as complete for this specific organization
    if (organization?.id) {
      localStorage.setItem(`onboarding_completed_${organization.id}`, "true");
    }
    onClose();
  };

  // Handle dialog dismissal (ESC, clicking outside, X button)
  const handleDialogClose = () => {
    // If an event was created, make sure to trigger onComplete to refresh the dashboard
    if (createdEventId) {
      onComplete();
    }
    onClose();
  };

  const isEventDataValid = eventData.name && eventData.date && eventData.venue;
  const isTicketDataValid = ticketData.name && ticketData.price && ticketData.quantity;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        {currentStep !== "welcome" && currentStep !== "success" && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {STEPS.filter(s => s.id !== "welcome" && s.id !== "success").map((step, index, filteredArr) => {
              const stepIndex = STEPS.findIndex(s => s.id === step.id);
              const isActive = stepIndex === currentStepIndex;
              const isCompleted = stepIndex < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < filteredArr.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        isCompleted ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <DialogTitle className="text-2xl">Welcome to TicketFlo!</DialogTitle>
              <DialogDescription className="text-base">
                Let's create your first event in just a few minutes. We'll guide you through the essentials.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 my-6">
              {[
                { icon: Calendar, label: "Event Details", desc: "Name, date & venue" },
                { icon: Ticket, label: "Ticket Setup", desc: "Pricing & capacity" },
                { icon: CreditCard, label: "Payments", desc: "Get paid instantly" },
                { icon: PartyPopper, label: "Go Live", desc: "Start selling!" },
              ].map((item, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={goToNext} className="w-full" size="lg">
                Let's Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip for now, I'll explore on my own
              </Button>
            </div>
          </>
        )}

        {/* Event Type Step */}
        {currentStep === "event-type" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                What type of event are you creating?
              </DialogTitle>
              <DialogDescription>
                Select your event type so we can highlight the features most relevant to you.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 my-4">
              {EVENT_TYPES.map((eventType) => {
                const isSelected = selectedEventType === eventType.id;
                return (
                  <Card
                    key={eventType.id}
                    className={`cursor-pointer transition-all hover:border-indigo-400 ${
                      isSelected ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : ""
                    }`}
                    onClick={() => setSelectedEventType(eventType.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? "bg-indigo-600" : "bg-muted"}`}>
                          <eventType.icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${isSelected ? "text-indigo-700 dark:text-indigo-300" : ""}`}>
                            {eventType.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {eventType.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Feature highlights for selected type */}
            {selectedEventType && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 text-muted-foreground">
                  Key features for {EVENT_TYPES.find(e => e.id === selectedEventType)?.title}:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.find(e => e.id === selectedEventType)?.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <feature.icon className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="text-xs font-medium">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={goToPrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={goToNext} disabled={!selectedEventType}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Event Basics Step */}
        {currentStep === "event-basics" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Event Details
              </DialogTitle>
              <DialogDescription>
                Tell us about your event. Don't worry, you can change these later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name *</Label>
                <Input
                  id="event-name"
                  placeholder="e.g., Summer Music Festival 2025"
                  value={eventData.name}
                  onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date *</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventData.date}
                    onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Start Time</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={eventData.time}
                    onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Venue *
                </Label>
                <Input
                  id="venue"
                  placeholder="e.g., Central Park Amphitheater"
                  value={eventData.venue}
                  onChange={(e) => setEventData({ ...eventData, venue: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="100"
                  value={eventData.capacity}
                  onChange={(e) => setEventData({ ...eventData, capacity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell attendees what to expect..."
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goToPrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={goToNext} disabled={!isEventDataValid}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Tickets Step */}
        {currentStep === "tickets" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Create Your First Ticket
              </DialogTitle>
              <DialogDescription>
                Set up a ticket type. You can add more ticket types later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-name">Ticket Name *</Label>
                <Input
                  id="ticket-name"
                  placeholder="e.g., General Admission"
                  value={ticketData.name}
                  onChange={(e) => setTicketData({ ...ticketData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket-price" className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Price *
                  </Label>
                  <Input
                    id="ticket-price"
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={ticketData.price}
                    onChange={(e) => setTicketData({ ...ticketData, price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Set to 0 for free tickets</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket-quantity">Quantity Available *</Label>
                  <Input
                    id="ticket-quantity"
                    type="number"
                    placeholder="100"
                    value={ticketData.quantity}
                    onChange={(e) => setTicketData({ ...ticketData, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-description">Description (optional)</Label>
                <Textarea
                  id="ticket-description"
                  placeholder="What's included with this ticket..."
                  value={ticketData.description}
                  onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Preview Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Ticket Preview</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{ticketData.name || "Ticket Name"}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticketData.quantity || "0"} available
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      ${parseFloat(ticketData.price || "0").toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goToPrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={goToNext} disabled={!isTicketDataValid}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Payment Step */}
        {currentStep === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Payment Setup
              </DialogTitle>
              <DialogDescription>
                Connect a payment provider to start accepting payments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Payment Setup</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can set up Stripe or Windcave from the Payments tab in your dashboard.
                    For now, let's create your event first!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your event will be saved as a draft until you connect payments.
                  </p>
                </CardContent>
              </Card>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Tip:</strong> You can create and customize your event now, then connect
                  Stripe later when you're ready to publish and sell tickets.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goToPrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={createEvent} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    Create My Event
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Success Step */}
        {currentStep === "success" && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl">Your Event is Ready!</DialogTitle>
              <DialogDescription className="text-base">
                "{eventData.name}" has been created. Here's what to do next.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-6">
              {/* Event URL */}
              <div className="space-y-2">
                <Label>Your Event URL</Label>
                <div className="flex gap-2">
                  <Input value={eventUrl} readOnly className="bg-muted" />
                  <Button variant="outline" size="icon" onClick={copyEventUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Essential Steps */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="font-medium text-sm">Essential Steps:</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate("payments");
                          handleComplete();
                        }
                      }}
                      className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600">
                        1
                      </div>
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>Connect payment provider to accept payments</span>
                      <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate("event-details");
                          handleComplete();
                        }
                      }}
                      className="w-full flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600">
                        2
                      </div>
                      <Ticket className="w-4 h-4 text-muted-foreground" />
                      <span>Publish your event when ready to sell</span>
                      <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Features for your event type */}
              {selectedEventType && (
                <Card className="border-indigo-200 dark:border-indigo-800">
                  <CardContent className="p-4 space-y-3">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Recommended for {EVENT_TYPES.find(e => e.id === selectedEventType)?.title}:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {EVENT_TYPES.find(e => e.id === selectedEventType)?.features.map((feature, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (onNavigate && feature.navTarget) {
                              onNavigate(feature.navTarget);
                              handleComplete();
                            }
                          }}
                          className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                        >
                          <feature.icon className="w-4 h-4 text-indigo-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium group-hover:text-indigo-600 transition-colors">{feature.label}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleComplete} className="w-full" size="lg">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(eventUrl, "_blank")}
                className="w-full"
              >
                Preview Event Page
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
