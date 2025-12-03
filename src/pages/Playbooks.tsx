import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import {
  Target,
  Heart,
  Handshake,
  Rocket,
  Video,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Circle,
  Users,
  Mail,
  Calendar,
  BarChart3,
  Upload,
  Settings,
  Loader2,
  Play,
  ChevronRight,
  Sparkles,
  Plus,
  Link as LinkIcon,
  Church,
  FileCheck,
  UsersRound,
  UserPlus,
  ClipboardCheck,
  Shield,
} from 'lucide-react';

interface PlaybookTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  steps: PlaybookStep[];
  benefits: string[];
}

interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  action: string;
  tabTarget?: string; // The tab to navigate to
  eventTab?: string; // The tab within EventCustomization
  eventSubTab?: string; // The sub-tab within EventCustomization (e.g., attendees sub-tabs)
  icon: React.ReactNode;
  helpText?: string;
  requiresEvent?: boolean; // Whether this step requires an event to be linked
}

interface ActivePlaybook {
  id: string;
  organization_id: string;
  playbook_type: string;
  event_id: string | null;
  event_name: string | null;
  current_step: number;
  completed_steps: string[];
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    id: 'prospect_event',
    type: 'prospect_event',
    name: 'Prospect Event',
    description: 'Host an exclusive event to engage prospects, identify hot leads, and accelerate your sales pipeline.',
    icon: <Target className="h-8 w-8" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    benefits: [
      'Import prospects from your CRM',
      'Track invite opens and clicks',
      'Capture attendee notes during the event',
      'Tag outcomes and sync back to CRM',
    ],
    steps: [
      {
        id: 'create_event',
        title: 'Create Your Event',
        description: 'Set up the event details, date, venue, and ticket types for your prospect event.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Create a new event or link an existing one to this playbook.',
      },
      {
        id: 'connect_crm',
        title: 'Connect Your CRM',
        description: 'Link HubSpot, Pipedrive, or Salesforce to import your prospect lists.',
        action: 'Go to Apps',
        tabTarget: 'integrations',
        icon: <Settings className="h-5 w-5" />,
        helpText: 'Connect your CRM system to import contacts and sync data back.',
      },
      {
        id: 'build_guest_list',
        title: 'Build Your Guest List',
        description: 'Import contacts from CRM lists or add prospects manually to your invite list.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Users className="h-5 w-5" />,
        helpText: 'Open your event\'s Attendees tab and go to Guest List to add prospects.',
        requiresEvent: true,
      },
      {
        id: 'send_invites',
        title: 'Send Invitations',
        description: 'Send personalized invite emails with tracking to measure engagement.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Mail className="h-5 w-5" />,
        helpText: 'From the Guest List, select prospects and send personalized invitations.',
        requiresEvent: true,
      },
      {
        id: 'run_event',
        title: 'Run Your Event',
        description: 'Check in guests, capture notes, and tag outcomes using TFlo Live.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'During your event, use TFlo Live to check in attendees and capture sales notes.',
        requiresEvent: true,
      },
      {
        id: 'sync_results',
        title: 'Sync Results to CRM',
        description: 'Push attendance data, notes, and outcomes back to your CRM automatically.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <Upload className="h-5 w-5" />,
        helpText: 'Go to Attendees > Summary to review outcomes and sync to your CRM.',
        requiresEvent: true,
      },
    ],
  },
  {
    id: 'customer_event',
    type: 'customer_event',
    name: 'Customer Appreciation',
    description: 'Strengthen relationships with existing customers, gather feedback, and identify upsell opportunities.',
    icon: <Heart className="h-8 w-8" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
    benefits: [
      'Invite your best customers',
      'Capture product feedback',
      'Identify expansion opportunities',
      'Strengthen relationships',
    ],
    steps: [
      {
        id: 'create_event',
        title: 'Create Your Event',
        description: 'Set up an appreciation event or exclusive customer gathering.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Create a new event or link an existing one to this playbook.',
      },
      {
        id: 'select_customers',
        title: 'Select Customers to Invite',
        description: 'Choose from your CRM customer list or add them manually.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Users className="h-5 w-5" />,
        helpText: 'Import your best customers from your CRM to the guest list.',
        requiresEvent: true,
      },
      {
        id: 'personalize_invites',
        title: 'Send Personalized Invites',
        description: 'Create a warm, personalized invitation experience for your customers.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Mail className="h-5 w-5" />,
        helpText: 'Customize and send invitations that make customers feel valued.',
        requiresEvent: true,
      },
      {
        id: 'gather_feedback',
        title: 'Gather Feedback at Event',
        description: 'Use notes to capture feedback and identify expansion signals.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'During check-in, capture notes about customer feedback and interests.',
        requiresEvent: true,
      },
      {
        id: 'follow_up',
        title: 'Follow Up & Sync',
        description: 'Review outcomes and sync insights back to your CRM.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <BarChart3 className="h-5 w-5" />,
        helpText: 'Review the summary and push insights back to your CRM for follow-up.',
        requiresEvent: true,
      },
    ],
  },
  {
    id: 'partner_summit',
    type: 'partner_summit',
    name: 'Partner Summit',
    description: 'Engage and train your partner network with a structured summit or training event.',
    icon: <Handshake className="h-8 w-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    benefits: [
      'Track partner attendance',
      'Measure engagement levels',
      'Capture training feedback',
      'Build stronger partnerships',
    ],
    steps: [
      {
        id: 'plan_summit',
        title: 'Plan Your Summit',
        description: 'Create the event with sessions, agenda, and capacity.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Set up your summit with all sessions and training tracks.',
      },
      {
        id: 'invite_partners',
        title: 'Invite Partners',
        description: 'Import your partner list and send professional invitations.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Users className="h-5 w-5" />,
        helpText: 'Add partners from your CRM or upload a partner list.',
        requiresEvent: true,
      },
      {
        id: 'track_sessions',
        title: 'Track Session Attendance',
        description: 'Monitor which partners attend which sessions during the summit.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'Use TFlo Live to track attendance across different sessions.',
        requiresEvent: true,
      },
      {
        id: 'analyze_engagement',
        title: 'Analyze Engagement',
        description: 'Review partner engagement levels and gather feedback.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <BarChart3 className="h-5 w-5" />,
        helpText: 'Check the summary to see engagement metrics and partner feedback.',
        requiresEvent: true,
      },
    ],
  },
  {
    id: 'product_launch',
    type: 'product_launch',
    name: 'Product Launch',
    description: 'Generate buzz and capture interest with an exciting product launch event.',
    icon: <Rocket className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    benefits: [
      'Build pre-launch excitement',
      'Capture early interest signals',
      'Identify potential champions',
      'Accelerate pipeline',
    ],
    steps: [
      {
        id: 'create_launch_event',
        title: 'Create Launch Event',
        description: 'Set up your product launch event with all the exciting details.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Create an event that showcases your new product.',
      },
      {
        id: 'target_audience',
        title: 'Target Your Audience',
        description: 'Import prospects and customers who should see the launch first.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Users className="h-5 w-5" />,
        helpText: 'Select the right audience from your CRM for early access.',
        requiresEvent: true,
      },
      {
        id: 'generate_buzz',
        title: 'Generate Buzz',
        description: 'Send invites and track engagement to build excitement.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Mail className="h-5 w-5" />,
        helpText: 'Send compelling invitations and track who opens them.',
        requiresEvent: true,
      },
      {
        id: 'capture_interest',
        title: 'Capture Interest at Launch',
        description: 'Note interested parties and tag hot leads during the event.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'During the launch, capture interest signals and tag hot leads.',
        requiresEvent: true,
      },
      {
        id: 'follow_up_leads',
        title: 'Follow Up with Leads',
        description: 'Sync results and prioritize your follow-up outreach.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <Upload className="h-5 w-5" />,
        helpText: 'Review who showed interest and push leads to your CRM.',
        requiresEvent: true,
      },
    ],
  },
  {
    id: 'webinar',
    type: 'webinar',
    name: 'Webinar',
    description: 'Run virtual events with registration tracking and attendance monitoring.',
    icon: <Video className="h-8 w-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    benefits: [
      'Track registrations vs attendance',
      'Monitor engagement levels',
      'Capture Q&A engagement',
      'Follow up with attendees',
    ],
    steps: [
      {
        id: 'setup_webinar',
        title: 'Set Up Webinar',
        description: 'Create your virtual event with registration page.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Create a new event for your webinar with registration enabled.',
      },
      {
        id: 'promote_webinar',
        title: 'Promote & Invite',
        description: 'Send invites to your target audience and promote registration.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <Users className="h-5 w-5" />,
        helpText: 'Import your target list and send webinar invitations.',
        requiresEvent: true,
      },
      {
        id: 'track_attendance',
        title: 'Track Attendance',
        description: 'Monitor who joins and their engagement during the webinar.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'Use TFlo Live to track attendance and engagement.',
        requiresEvent: true,
      },
      {
        id: 'analyze_webinar',
        title: 'Analyze & Follow Up',
        description: 'Review engagement metrics and sync attendees to CRM.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <BarChart3 className="h-5 w-5" />,
        helpText: 'Check attendance rates and follow up with engaged attendees.',
        requiresEvent: true,
      },
    ],
  },
  {
    id: 'church_camp',
    type: 'church_camp',
    name: 'Church Camp',
    description: 'Organize youth camps, retreats, and ministry events with waivers, groups, and seamless check-in.',
    icon: <Church className="h-8 w-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    benefits: [
      'Collect digital waivers and medical forms',
      'Organize campers by groups/cabins',
      'Track attendance and check-ins',
      'Manage parent/guardian contacts',
    ],
    steps: [
      {
        id: 'create_camp_event',
        title: 'Create Your Camp Event',
        description: 'Set up the camp with dates, location, capacity, and ticket types for different age groups.',
        action: 'Go to Events',
        tabTarget: 'events',
        icon: <Calendar className="h-5 w-5" />,
        helpText: 'Create your camp event with different ticket types for each age group or program.',
      },
      {
        id: 'setup_groups',
        title: 'Set Up Groups & Cabins',
        description: 'Create groups to organize campers into cabins, small groups, or ministry teams.',
        action: 'Go to Groups',
        tabTarget: 'groups',
        icon: <UsersRound className="h-5 w-5" />,
        helpText: 'Enable Groups in Settings first, then create cabin groups or ministry teams.',
      },
      {
        id: 'configure_waivers',
        title: 'Configure Waivers & Forms',
        description: 'Set up required waivers, medical release forms, and emergency contact collection.',
        action: 'Go to Event Details',
        tabTarget: 'event-details',
        eventTab: 'customization',
        icon: <FileCheck className="h-5 w-5" />,
        helpText: 'Add waiver requirements in the event customization settings.',
        requiresEvent: true,
      },
      {
        id: 'build_camper_list',
        title: 'Build Camper List',
        description: 'Import camper registrations or add them manually with parent/guardian information.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <UserPlus className="h-5 w-5" />,
        helpText: 'Add campers to your guest list with their group assignments and emergency contacts.',
        requiresEvent: true,
      },
      {
        id: 'collect_waivers',
        title: 'Collect Signed Waivers',
        description: 'Send waiver links to parents/guardians and track completion status.',
        action: 'Go to Guest List',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'invite-list',
        icon: <ClipboardCheck className="h-5 w-5" />,
        helpText: 'Monitor which campers have completed their required waivers before camp starts.',
        requiresEvent: true,
      },
      {
        id: 'camp_checkin',
        title: 'Camp Check-In Day',
        description: 'Use TFlo Live to check in campers, verify waivers, and assign to groups.',
        action: 'Open TFlo Live',
        icon: <Play className="h-5 w-5" />,
        helpText: 'On check-in day, use TFlo Live to verify each camper and their waiver status.',
        requiresEvent: true,
      },
      {
        id: 'manage_attendance',
        title: 'Manage Daily Attendance',
        description: 'Track attendance throughout camp and monitor group activities.',
        action: 'Go to Summary',
        tabTarget: 'event-details',
        eventTab: 'attendees',
        eventSubTab: 'summary',
        icon: <Shield className="h-5 w-5" />,
        helpText: 'Review attendance summaries and ensure all campers are accounted for.',
        requiresEvent: true,
      },
    ],
  },
];

const Playbooks = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganizations();
  const [loading, setLoading] = useState(true);
  const [activePlaybooks, setActivePlaybooks] = useState<ActivePlaybook[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PlaybookTemplate | null>(null);
  const [activePlaybook, setActivePlaybook] = useState<ActivePlaybook | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadActivePlaybooks();
      loadEvents();
    }
  }, [currentOrganization?.id]);

  const loadActivePlaybooks = async () => {
    setLoading(true);
    try {
      const savedPlaybooks = localStorage.getItem(`playbooks_${currentOrganization?.id}`);
      if (savedPlaybooks) {
        setActivePlaybooks(JSON.parse(savedPlaybooks));
      }
    } catch (error) {
      console.error('Error loading playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date, status')
        .eq('organization_id', currentOrganization.id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const savePlaybooks = (playbooks: ActivePlaybook[]) => {
    if (currentOrganization?.id) {
      localStorage.setItem(`playbooks_${currentOrganization.id}`, JSON.stringify(playbooks));
      setActivePlaybooks(playbooks);
    }
  };

  const handleStartPlaybook = (template: PlaybookTemplate) => {
    setSelectedTemplate(template);
    setShowEventSelector(true);
  };

  const handleSelectEvent = (eventId: string | 'new') => {
    if (!selectedTemplate) return;

    const selectedEvent = eventId !== 'new' ? events.find(e => e.id === eventId) : null;

    // Create new active playbook
    const newPlaybook: ActivePlaybook = {
      id: `playbook_${Date.now()}`,
      organization_id: currentOrganization?.id || '',
      playbook_type: selectedTemplate.type,
      event_id: eventId !== 'new' ? eventId : null,
      event_name: selectedEvent?.name || null,
      current_step: 0,
      completed_steps: [],
      created_at: new Date().toISOString(),
    };

    setActivePlaybook(newPlaybook);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setShowEventSelector(false);
    setShowWizard(true);

    // Save immediately
    savePlaybooks([...activePlaybooks, newPlaybook]);

    // If they chose to create new event, navigate to events tab and close the wizard
    if (eventId === 'new') {
      setShowWizard(false);
      window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'events' } }));
    }
  };

  const handleContinuePlaybook = (playbook: ActivePlaybook) => {
    const template = PLAYBOOK_TEMPLATES.find((t) => t.type === playbook.playbook_type);
    if (template) {
      setSelectedTemplate(template);
      setActivePlaybook(playbook);
      setCurrentStepIndex(playbook.current_step);
      setCompletedSteps(playbook.completed_steps);
      setShowWizard(true);
    }
  };

  const handleLinkEvent = (eventId: string) => {
    if (!activePlaybook) return;

    const selectedEvent = events.find(e => e.id === eventId);
    const updatedPlaybook: ActivePlaybook = {
      ...activePlaybook,
      event_id: eventId,
      event_name: selectedEvent?.name || null,
    };

    setActivePlaybook(updatedPlaybook);

    // Update in saved playbooks
    const existingPlaybooks = activePlaybooks.filter((p) => p.id !== activePlaybook.id);
    savePlaybooks([...existingPlaybooks, updatedPlaybook]);

    toast({
      title: "Event Linked",
      description: `${selectedEvent?.name} has been linked to this playbook.`,
    });
  };

  const handleMarkStepComplete = () => {
    if (!selectedTemplate || !activePlaybook) return;

    const currentStep = selectedTemplate.steps[currentStepIndex];
    const newCompletedSteps = [...completedSteps, currentStep.id];
    setCompletedSteps(newCompletedSteps);

    const updatedPlaybook: ActivePlaybook = {
      ...activePlaybook,
      current_step: currentStepIndex + 1,
      completed_steps: newCompletedSteps,
    };
    setActivePlaybook(updatedPlaybook);

    const existingPlaybooks = activePlaybooks.filter((p) => p.id !== activePlaybook.id);
    savePlaybooks([...existingPlaybooks, updatedPlaybook]);

    if (currentStepIndex < selectedTemplate.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      toast({
        title: "Playbook Complete!",
        description: `You've completed the ${selectedTemplate.name} playbook.`,
      });
    }
  };

  const handleGoToStep = (index: number) => {
    setCurrentStepIndex(index);
  };

  const navigateToTab = (tabName: string, eventId?: string | null, eventTab?: string, eventSubTab?: string) => {
    // Dispatch custom event to change tab in OrgDashboard
    window.dispatchEvent(new CustomEvent('changeTab', {
      detail: {
        tab: tabName,
        eventId: eventId || undefined,
        eventTab: eventTab || undefined,
        eventSubTab: eventSubTab || undefined,
      }
    }));
    setShowWizard(false);
  };

  const handleNavigateToAction = (step: PlaybookStep) => {
    if (step.tabTarget) {
      // If navigating to event-details and we have an event, pass the event ID and sub-tabs
      if (step.tabTarget === 'event-details' && activePlaybook?.event_id) {
        navigateToTab(step.tabTarget, activePlaybook.event_id, step.eventTab, step.eventSubTab);
      } else {
        navigateToTab(step.tabTarget);
      }
    } else if (step.action === 'Open TFlo Live' && activePlaybook?.event_id) {
      // Navigate to TFlo Live for this event
      window.open(`/tflo-live/${activePlaybook.event_id}`, '_blank');
    }
  };

  const handleCloseWizard = () => {
    if (activePlaybook && selectedTemplate) {
      const existingPlaybooks = activePlaybooks.filter((p) => p.id !== activePlaybook.id);
      if (completedSteps.length > 0 || currentStepIndex > 0) {
        const updatedPlaybook: ActivePlaybook = {
          ...activePlaybook,
          current_step: currentStepIndex,
          completed_steps: completedSteps,
        };
        savePlaybooks([...existingPlaybooks, updatedPlaybook]);
      }
    }

    setShowWizard(false);
    setSelectedTemplate(null);
    setActivePlaybook(null);
  };

  const handleDeletePlaybook = (playbookId: string) => {
    const updatedPlaybooks = activePlaybooks.filter((p) => p.id !== playbookId);
    savePlaybooks(updatedPlaybooks);
    toast({
      title: "Playbook Removed",
      description: "The playbook has been removed from your active list.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          Event Marketing Playbooks
        </h1>
        <p className="text-muted-foreground mt-2">
          Guided workflows to help you run successful event marketing campaigns with CRM integration.
        </p>
      </div>

      {/* Active Playbooks */}
      {activePlaybooks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Active Playbooks</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activePlaybooks.map((playbook) => {
              const template = PLAYBOOK_TEMPLATES.find((t) => t.type === playbook.playbook_type);
              if (!template) return null;

              const progress = (playbook.completed_steps.length / template.steps.length) * 100;
              const isComplete = playbook.completed_steps.length >= template.steps.length;

              return (
                <Card key={playbook.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${template.bgColor}`}>
                        <div className={template.color}>{template.icon}</div>
                      </div>
                      <Badge variant={isComplete ? "default" : "outline"}>
                        {isComplete ? "Complete" : `${playbook.completed_steps.length}/${template.steps.length} steps`}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                    <CardDescription>
                      {playbook.event_name ? (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {playbook.event_name}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">No event linked</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={progress} className="h-2 mb-3" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleContinuePlaybook(playbook)}
                      >
                        {isComplete ? 'Review' : 'Continue'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlaybook(playbook.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Playbook Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Start a New Playbook</h2>
        <p className="text-muted-foreground mb-6">
          Choose a playbook template to get step-by-step guidance for your event marketing campaign.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLAYBOOK_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
              onClick={() => handleStartPlaybook(template)}
            >
              <CardHeader>
                <div className={`p-3 rounded-xl ${template.bgColor} w-fit mb-2`}>
                  <div className={template.color}>{template.icon}</div>
                </div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {template.benefits.slice(0, 3).map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full group-hover:bg-primary">
                  Start Playbook
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Selector Dialog */}
      <Dialog open={showEventSelector} onOpenChange={setShowEventSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <div className={`p-2 rounded-lg ${selectedTemplate.bgColor}`}>
                  <div className={selectedTemplate.color}>{selectedTemplate.icon}</div>
                </div>
              )}
              Link an Event
            </DialogTitle>
            <DialogDescription>
              Choose an existing event or create a new one for this playbook.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {events.length > 0 && (
              <div className="space-y-2">
                <Label>Select an existing event</Label>
                <Select onValueChange={handleSelectEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{event.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {event.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSelectEvent('new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create a New Event
            </Button>

            {events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                You don't have any events yet. Create one to get started!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Playbook Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={(open) => !open && handleCloseWizard()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedTemplate.bgColor}`}>
                    <div className={selectedTemplate.color}>{selectedTemplate.icon}</div>
                  </div>
                  {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  Follow these steps to run a successful {selectedTemplate.name.toLowerCase()}.
                </DialogDescription>
              </DialogHeader>

              {/* Linked Event */}
              <div className="my-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Linked Event:</span>
                    {activePlaybook?.event_name ? (
                      <span className="text-sm">{activePlaybook.event_name}</span>
                    ) : (
                      <span className="text-sm text-amber-600 dark:text-amber-400">None</span>
                    )}
                  </div>
                  {events.length > 0 && (
                    <Select onValueChange={handleLinkEvent} value={activePlaybook?.event_id || ''}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Link event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Progress Overview */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {completedSteps.length} of {selectedTemplate.steps.length} steps complete
                  </span>
                </div>
                <Progress
                  value={(completedSteps.length / selectedTemplate.steps.length) * 100}
                  className="h-2"
                />
              </div>

              {/* Step Navigation */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {selectedTemplate.steps.map((step, idx) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <button
                      key={step.id}
                      onClick={() => handleGoToStep(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                      )}
                      <span className="hidden sm:inline">{step.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Current Step Content */}
              {selectedTemplate.steps[currentStepIndex] && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${selectedTemplate.bgColor}`}>
                        <div className={selectedTemplate.color}>
                          {selectedTemplate.steps[currentStepIndex].icon}
                        </div>
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-1">
                          Step {currentStepIndex + 1} of {selectedTemplate.steps.length}
                        </Badge>
                        <CardTitle className="text-xl">
                          {selectedTemplate.steps[currentStepIndex].title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {selectedTemplate.steps[currentStepIndex].description}
                    </p>

                    {/* Warning if step requires event */}
                    {selectedTemplate.steps[currentStepIndex].requiresEvent && !activePlaybook?.event_id && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Note:</strong> This step requires an event to be linked. Please link an event above or create one first.
                        </p>
                      </div>
                    )}

                    {/* Help Text */}
                    {selectedTemplate.steps[currentStepIndex].helpText && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Tip:</strong> {selectedTemplate.steps[currentStepIndex].helpText}
                        </p>
                      </div>
                    )}

                    {/* Step Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      {(selectedTemplate.steps[currentStepIndex].tabTarget ||
                        selectedTemplate.steps[currentStepIndex].action === 'Open TFlo Live') && (
                        <Button
                          variant="default"
                          onClick={() => handleNavigateToAction(selectedTemplate.steps[currentStepIndex])}
                          disabled={selectedTemplate.steps[currentStepIndex].requiresEvent && !activePlaybook?.event_id}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {selectedTemplate.steps[currentStepIndex].action}
                        </Button>
                      )}

                      {completedSteps.includes(selectedTemplate.steps[currentStepIndex].id) ? (
                        <Button variant="outline" disabled className="flex-1 sm:flex-none">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                          Step Completed
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleMarkStepComplete}
                          className="flex-1 sm:flex-none"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Steps Checklist */}
              <div className="mt-6">
                <h3 className="font-medium mb-3">All Steps</h3>
                <div className="space-y-2">
                  {selectedTemplate.steps.map((step, idx) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <button
                        key={step.id}
                        onClick={() => handleGoToStep(idx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <Circle className={`h-5 w-5 shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {step.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => currentStepIndex > 0 && setCurrentStepIndex(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStepIndex < selectedTemplate.steps.length - 1 ? (
                  <Button onClick={() => setCurrentStepIndex(currentStepIndex + 1)}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleCloseWizard}>
                    Finish
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playbooks;
