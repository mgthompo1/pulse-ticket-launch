import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket,
  User,
  CreditCard,
  ShoppingCart,
  Tag,
  HelpCircle,
  FileText,
  Clock,
  CheckSquare,
  Type,
  Minus,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  Save,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Image,
  Moon,
  Sun,
  Monitor,
  LayoutTemplate,
  PanelRight,
  PanelLeft,
  Mail,
  Phone,
  DollarSign,
  MessageSquare,
  Users,
  FolderOpen,
  Utensils,
  AlertCircle,
  Accessibility,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Search,
  Heading,
  Square,
  Columns,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { CustomQuestion, ConditionalDisplay } from "@/types/widget";

// Types
export interface CheckoutElement {
  id: string;
  type: ElementType;
  label: string;
  config: ElementConfig;
  column?: "left" | "right"; // For two-column layout
}

export interface CheckoutPage {
  id: string;
  title: string;
  elements: CheckoutElement[];
}

export interface CheckoutTemplate {
  id: string;
  name: string;
  pages: CheckoutPage[];
  settings: TemplateSettings;
}

interface TemplateSettings {
  showProgressBar: boolean;
  allowBackNavigation: boolean;
  mobileLayout: "stack" | "accordion";
  showOrderSummaryOnAllPages: boolean;
  themeMode: "light" | "dark" | "system";
  layout: "single" | "sidebar" | "two_column";
  sidebarPosition: "left" | "right";
  // Two-column specific settings
  twoColumnLeftWidth: "1/3" | "1/2" | "2/3";
  twoColumnGap: "sm" | "md" | "lg";
  twoColumnStackOnMobile: boolean;
}

// Question template preset type
interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  questions: Omit<CustomQuestion, 'id'>[];
}

interface ElementConfig {
  required?: boolean;
  label?: string;
  placeholder?: string;
  helpText?: string;
  // For custom_questions and question_group elements
  questions?: CustomQuestion[];
  // For question_group
  groupTitle?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  [key: string]: unknown;
}

type ElementType =
  | "logo"
  | "event_header"
  | "ticket_selector"
  | "customer_info"
  | "attendee_details"
  | "payment_form"
  | "order_summary"
  | "promo_code"
  | "custom_questions"
  | "question_group"
  | "question_template"
  | "terms_checkbox"
  | "timer"
  | "text_block"
  | "divider"
  | "info_modal"
  | "section_header"
  | "container";

// Pre-built question templates
const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "dietary",
    name: "Dietary Requirements",
    description: "Allergies and dietary restrictions",
    icon: <Utensils className="h-4 w-4" />,
    questions: [
      {
        question: "Do you have any dietary requirements?",
        label: "Dietary Requirements",
        type: "checkbox",
        required: false,
        options: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Kosher", "None"],
      },
      {
        question: "Please list any food allergies",
        label: "Food Allergies",
        type: "textarea",
        required: false,
        conditionalDisplay: {
          dependsOn: "dietary_requirements",
          showWhen: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Kosher"],
          operator: "contains",
        },
      },
    ],
  },
  {
    id: "emergency",
    name: "Emergency Contact",
    description: "Emergency contact information",
    icon: <AlertCircle className="h-4 w-4" />,
    questions: [
      {
        question: "Emergency contact name",
        label: "Emergency Contact Name",
        type: "text",
        required: true,
      },
      {
        question: "Emergency contact phone",
        label: "Emergency Contact Phone",
        type: "phone",
        required: true,
      },
      {
        question: "Relationship to attendee",
        label: "Relationship",
        type: "select",
        required: false,
        options: ["Parent/Guardian", "Spouse/Partner", "Sibling", "Friend", "Other"],
      },
    ],
  },
  {
    id: "accessibility",
    name: "Accessibility Needs",
    description: "Mobility, hearing, and vision requirements",
    icon: <Accessibility className="h-4 w-4" />,
    questions: [
      {
        question: "Do you require any accessibility accommodations?",
        label: "Accessibility Needs",
        type: "radio",
        required: true,
        options: ["Yes", "No"],
      },
      {
        question: "Please select the accommodations you need",
        label: "Accommodation Type",
        type: "checkbox",
        required: false,
        options: ["Wheelchair Access", "Sign Language Interpreter", "Audio Description", "Reserved Seating", "Service Animal", "Other"],
        conditionalDisplay: {
          dependsOn: "accessibility_needs",
          showWhen: "Yes",
          operator: "equals",
        },
      },
      {
        question: "Please describe any other accessibility needs",
        label: "Other Accessibility Details",
        type: "textarea",
        required: false,
        conditionalDisplay: {
          dependsOn: "accessibility_needs",
          showWhen: "Yes",
          operator: "equals",
        },
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Consent",
    description: "GDPR-compliant opt-in checkboxes",
    icon: <Shield className="h-4 w-4" />,
    questions: [
      {
        question: "I agree to receive email updates about future events",
        label: "Email Marketing",
        type: "checkbox",
        required: false,
        options: ["Yes, send me updates"],
      },
      {
        question: "I agree to receive SMS notifications",
        label: "SMS Marketing",
        type: "checkbox",
        required: false,
        options: ["Yes, send me SMS updates"],
      },
    ],
  },
];

type ElementCategory = 'core' | 'forms' | 'content' | 'advanced';

interface ElementDefinition {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  description: string;
  required: boolean;
  defaultConfig: ElementConfig;
  category: ElementCategory;
  keywords?: string[]; // For search
}

const CATEGORY_INFO: Record<ElementCategory, { label: string; icon: React.ReactNode; description: string }> = {
  core: { label: 'Core', icon: <Ticket className="h-4 w-4" />, description: 'Essential checkout elements' },
  forms: { label: 'Forms & Data', icon: <HelpCircle className="h-4 w-4" />, description: 'Collect customer information' },
  content: { label: 'Content', icon: <Type className="h-4 w-4" />, description: 'Text, images, and layout' },
  advanced: { label: 'Advanced', icon: <Settings className="h-4 w-4" />, description: 'Extra features and widgets' },
};

// Element definitions with categories and search keywords
const AVAILABLE_ELEMENTS: ElementDefinition[] = [
  // CORE elements
  {
    type: "ticket_selector",
    label: "Ticket Selector",
    icon: <Ticket className="h-4 w-4" />,
    description: "Ticket types and quantities",
    required: true,
    defaultConfig: { showDescription: true, showAvailability: true },
    category: 'core',
    keywords: ['tickets', 'select', 'buy', 'purchase', 'quantity'],
  },
  {
    type: "customer_info",
    label: "Customer Info",
    icon: <User className="h-4 w-4" />,
    description: "Name, email, phone fields",
    required: true,
    defaultConfig: { requirePhone: false, requireName: true },
    category: 'core',
    keywords: ['customer', 'contact', 'name', 'email', 'phone', 'buyer'],
  },
  {
    type: "payment_form",
    label: "Payment",
    icon: <CreditCard className="h-4 w-4" />,
    description: "Payment method input",
    required: true,
    defaultConfig: { showSavedCards: true },
    category: 'core',
    keywords: ['payment', 'card', 'credit', 'stripe', 'checkout', 'pay'],
  },
  {
    type: "order_summary",
    label: "Order Summary",
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Cart and total breakdown",
    required: false,
    defaultConfig: { showItemized: true, collapsible: false },
    category: 'core',
    keywords: ['cart', 'total', 'summary', 'order', 'price', 'breakdown'],
  },
  // FORMS elements
  {
    type: "attendee_details",
    label: "Attendee Details",
    icon: <Users className="h-4 w-4" />,
    description: "Collect info for each ticket holder",
    required: false,
    defaultConfig: {
      collectPerTicket: true,
      prefillBuyer: true,
      requireEmail: true,
      requirePhone: false,
      showCustomQuestions: true,
    },
    category: 'forms',
    keywords: ['attendee', 'guest', 'participant', 'details', 'each', 'per ticket'],
  },
  {
    type: "custom_questions",
    label: "Custom Questions",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Your custom form fields",
    required: false,
    defaultConfig: { questions: [] },
    category: 'forms',
    keywords: ['questions', 'custom', 'form', 'fields', 'survey', 'input'],
  },
  {
    type: "question_group",
    label: "Question Group",
    icon: <FolderOpen className="h-4 w-4" />,
    description: "Group related questions together",
    required: false,
    defaultConfig: {
      groupTitle: "Additional Information",
      collapsible: true,
      defaultExpanded: true,
      questions: [],
    },
    category: 'forms',
    keywords: ['group', 'section', 'collapse', 'organize', 'questions'],
  },
  {
    type: "question_template",
    label: "Quick Add Templates",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Pre-built question sets",
    required: false,
    defaultConfig: { templateId: "" },
    category: 'forms',
    keywords: ['template', 'preset', 'dietary', 'emergency', 'accessibility', 'quick'],
  },
  {
    type: "terms_checkbox",
    label: "Terms & Conditions",
    icon: <CheckSquare className="h-4 w-4" />,
    description: "Acceptance checkbox",
    required: false,
    defaultConfig: { termsUrl: "", privacyUrl: "" },
    category: 'forms',
    keywords: ['terms', 'conditions', 'privacy', 'checkbox', 'agree', 'consent'],
  },
  // CONTENT elements
  {
    type: "logo",
    label: "Logo",
    icon: <Image className="h-4 w-4" />,
    description: "Your event or organization logo",
    required: false,
    defaultConfig: { size: "medium", alignment: "center", showOrgLogo: false },
    category: 'content',
    keywords: ['logo', 'image', 'brand', 'header'],
  },
  {
    type: "event_header",
    label: "Event Header",
    icon: <FileText className="h-4 w-4" />,
    description: "Event name, image, and date",
    required: false,
    defaultConfig: { showImage: true, showDate: true, showVenue: true },
    category: 'content',
    keywords: ['event', 'header', 'title', 'date', 'venue', 'banner'],
  },
  {
    type: "text_block",
    label: "Text Block",
    icon: <Type className="h-4 w-4" />,
    description: "Custom text or HTML",
    required: false,
    defaultConfig: { content: "" },
    category: 'content',
    keywords: ['text', 'paragraph', 'html', 'content', 'description', 'info'],
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="h-4 w-4" />,
    description: "Visual separator",
    required: false,
    defaultConfig: { style: "line", thickness: "thin", width: "full", spacing: "md" },
    category: 'content',
    keywords: ['divider', 'line', 'separator', 'space', 'break'],
  },
  {
    type: "section_header",
    label: "Section Header",
    icon: <Heading className="h-4 w-4" />,
    description: "Styled heading for sections",
    required: false,
    defaultConfig: { text: "Section Title", size: "lg", alignment: "left", showDivider: false },
    category: 'content',
    keywords: ['header', 'heading', 'title', 'section', 'h1', 'h2'],
  },
  {
    type: "container",
    label: "Container",
    icon: <Square className="h-4 w-4" />,
    description: "Style wrapper for elements below",
    required: false,
    defaultConfig: { padding: "md", borderRadius: "md", border: false },
    category: 'content',
    keywords: ['container', 'wrapper', 'section', 'box', 'background', 'group'],
  },
  // ADVANCED elements
  {
    type: "promo_code",
    label: "Promo Code",
    icon: <Tag className="h-4 w-4" />,
    description: "Discount code input",
    required: false,
    defaultConfig: { autoExpand: false },
    category: 'advanced',
    keywords: ['promo', 'discount', 'coupon', 'code', 'voucher'],
  },
  {
    type: "timer",
    label: "Timer / Urgency",
    icon: <Clock className="h-4 w-4" />,
    description: "Countdown or availability",
    required: false,
    defaultConfig: { showCountdown: true, showAvailability: true },
    category: 'advanced',
    keywords: ['timer', 'countdown', 'urgency', 'limited', 'time'],
  },
  {
    type: "info_modal",
    label: "Info Modal",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Popup with additional info",
    required: false,
    defaultConfig: {
      triggerText: "Learn More",
      modalTitle: "Additional Information",
      modalContent: "Add your content here...",
      triggerStyle: "link"
    },
    category: 'advanced',
    keywords: ['modal', 'popup', 'info', 'learn more', 'dialog', 'help'],
  },
];

// Draggable Element from Palette - with larger touch-friendly drag handle
function DraggableElement({ element, compact = false }: { element: ElementDefinition; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `palette-${element.type}`,
    data: { type: "palette", element },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all group"
        title={element.description}
      >
        <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          {element.icon}
        </div>
        <span className="font-medium text-xs truncate flex-1">{element.label}</span>
        {element.required && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            Req
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all group"
    >
      {/* Large touch-friendly drag handle area */}
      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {element.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{element.label}</span>
          {element.required && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Required
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {element.description}
        </p>
      </div>
      <div className="p-2 rounded-md hover:bg-muted transition-colors">
        <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  );
}

// Visual Element Canvas Item - shows actual preview of element
function VisualCanvasElement({
  element,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  canDelete,
  renderPreview,
  allElements,
  onUpdateElementConfig,
}: {
  element: CheckoutElement;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canDelete: boolean;
  renderPreview: (element: CheckoutElement) => React.ReactNode;
  allElements?: CheckoutElement[];
  onUpdateElementConfig?: (elementId: string, config: Record<string, unknown>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg transition-all ${
        isDragging ? "shadow-lg scale-[1.01] z-10" : ""
      } ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2"
          : "hover:ring-1 hover:ring-muted-foreground/30"
      }`}
      onClick={onSelect}
    >
      {/* Floating toolbar on hover/select */}
      <div className={`absolute -top-3 right-2 z-20 flex items-center gap-1 bg-background border rounded-md shadow-sm px-1 py-0.5 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {/* Element type label */}
        <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
          {elementDef?.icon}
          <span>{element.label}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {/* Duplicate */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </Button>
        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${!canDelete ? 'opacity-30' : 'hover:bg-destructive/10'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete) onRemove();
          }}
          disabled={!canDelete}
          title="Delete"
        >
          <Trash2 className={`h-3 w-3 ${!canDelete ? 'text-muted-foreground' : 'text-destructive'}`} />
        </Button>
      </div>

      {/* Visual Preview of Element */}
      <div className="p-3">
        {renderPreview(element)}
      </div>
    </div>
  );
}

// Legacy card-style element (for compact view)
function SortableElement({
  element,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  canDelete,
  isOverTop,
  isOverBottom,
}: {
  element: CheckoutElement;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canDelete: boolean;
  isOverTop?: boolean;
  isOverBottom?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);

  return (
    <div className="relative">
      {/* Drop indicator line - top */}
      {isOverTop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-2 p-3 rounded-lg border transition-all ${
          isDragging ? "shadow-lg scale-[1.02]" : ""
        } ${
          isSelected
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "bg-card hover:border-muted-foreground/30"
        }`}
        onClick={onSelect}
      >
        {/* Large touch-friendly drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 -m-1 hover:bg-muted rounded-md transition-colors touch-manipulation"
          title="Drag to reorder"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>

        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {elementDef?.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{element.label}</span>
            {elementDef?.required && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                Required
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Duplicate button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate element"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${!canDelete ? 'opacity-30 cursor-not-allowed' : 'hover:bg-destructive/10'} transition-opacity`}
            onClick={(e) => {
              e.stopPropagation();
              if (canDelete) {
                onRemove();
              }
            }}
            disabled={!canDelete}
            title={!canDelete ? "Last required element cannot be removed" : "Remove element"}
          >
            <Trash2 className={`h-4 w-4 ${!canDelete ? 'text-muted-foreground' : 'text-destructive'}`} />
          </Button>
        </div>
      </div>

      {/* Drop indicator line - bottom */}
      {isOverBottom && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

// Page Canvas - WYSIWYG visual canvas
function PageCanvas({
  page,
  pageIndex,
  totalPages,
  selectedElement,
  onSelectElement,
  onRemoveElement,
  onDuplicateElement,
  onUpdatePageTitle,
  onRemovePage,
  canDeleteElement,
  renderPreview,
  visualMode = true,
  allElements,
  onUpdateElementConfig,
  layout = "single",
  twoColumnSettings,
}: {
  page: CheckoutPage;
  pageIndex: number;
  totalPages: number;
  selectedElement: string | null;
  onSelectElement: (id: string) => void;
  onRemoveElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onUpdatePageTitle: (title: string) => void;
  onRemovePage: () => void;
  canDeleteElement: (elementId: string) => boolean;
  renderPreview: (element: CheckoutElement) => React.ReactNode;
  visualMode?: boolean;
  allElements: CheckoutElement[];
  onUpdateElementConfig: (elementId: string, config: Record<string, unknown>) => void;
  layout?: "single" | "sidebar" | "two_column";
  twoColumnSettings?: {
    leftWidth: "1/3" | "1/2" | "2/3";
    gap: "sm" | "md" | "lg";
  };
}) {
  // Make the page itself a droppable target
  const { setNodeRef, isOver } = useDroppable({
    id: `page-drop-${pageIndex}`,
  });

  // Droppable zones for two-column layout
  const { setNodeRef: setLeftRef, isOver: isOverLeft } = useDroppable({
    id: `page-${pageIndex}-left`,
  });
  const { setNodeRef: setRightRef, isOver: isOverRight } = useDroppable({
    id: `page-${pageIndex}-right`,
  });

  // Filter elements by column for two-column layout
  // Unassigned elements default to left column (same as preview)
  const leftElements = page.elements.filter((e) => e.column === "left" || !e.column);
  const rightElements = page.elements.filter((e) => e.column === "right");

  // Column width classes
  const getColumnWidthClasses = () => {
    if (!twoColumnSettings) return { left: "w-1/2", right: "w-1/2" };
    switch (twoColumnSettings.leftWidth) {
      case "1/3": return { left: "w-1/3", right: "w-2/3" };
      case "2/3": return { left: "w-2/3", right: "w-1/3" };
      default: return { left: "w-1/2", right: "w-1/2" };
    }
  };
  const columnWidths = getColumnWidthClasses();

  // Gap classes
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-8",
  };
  const gapClass = twoColumnSettings ? gapClasses[twoColumnSettings.gap] : "gap-4";

  const renderElementsList = (elements: CheckoutElement[]) => {
    if (visualMode) {
      return elements.map((element) => (
        <VisualCanvasElement
          key={element.id}
          element={element}
          isSelected={selectedElement === element.id}
          onSelect={() => onSelectElement(element.id)}
          onDuplicate={() => onDuplicateElement(element.id)}
          onRemove={() => onRemoveElement(element.id)}
          canDelete={canDeleteElement(element.id)}
          renderPreview={renderPreview}
          allElements={allElements}
          onUpdateElementConfig={onUpdateElementConfig}
        />
      ));
    }
    return elements.map((element) => (
      <SortableElement
        key={element.id}
        element={element}
        isSelected={selectedElement === element.id}
        onSelect={() => onSelectElement(element.id)}
        onDuplicate={() => onDuplicateElement(element.id)}
        onRemove={() => onRemoveElement(element.id)}
        canDelete={canDeleteElement(element.id)}
      />
    ));
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Page {pageIndex + 1}
            </Badge>
            <Input
              value={page.title}
              onChange={(e) => onUpdatePageTitle(e.target.value)}
              className="h-8 w-40 text-sm"
              placeholder="Page title..."
            />
          </div>
          {totalPages > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemovePage}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {layout === "two_column" ? (
          // Two-column layout
          <div className={`flex ${gapClass} min-h-[300px]`}>
            {/* Left Column */}
            <div
              ref={setLeftRef}
              className={`${columnWidths.left} rounded-lg border-2 border-dashed transition-colors ${
                isOverLeft
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/20"
              } ${visualMode ? "p-4 space-y-4 bg-white dark:bg-gray-950" : "p-3 space-y-2 bg-muted/30"}`}
            >
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <PanelLeft className="h-3 w-3" />
                Left Column
              </div>
              <SortableContext
                items={leftElements.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {leftElements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                    <Layers className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">Drop elements here</p>
                  </div>
                ) : (
                  renderElementsList(leftElements)
                )}
              </SortableContext>
            </div>

            {/* Right Column */}
            <div
              ref={setRightRef}
              className={`${columnWidths.right} rounded-lg border-2 border-dashed transition-colors ${
                isOverRight
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/20"
              } ${visualMode ? "p-4 space-y-4 bg-white dark:bg-gray-950" : "p-3 space-y-2 bg-muted/30"}`}
            >
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <PanelRight className="h-3 w-3" />
                Right Column
              </div>
              <SortableContext
                items={rightElements.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {rightElements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                    <Layers className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">Drop elements here</p>
                  </div>
                ) : (
                  renderElementsList(rightElements)
                )}
              </SortableContext>
            </div>
          </div>
        ) : (
          // Single column or sidebar layout
          <SortableContext
            items={page.elements.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={setNodeRef}
              className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors ${
                isOver
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/20"
              } ${visualMode ? "p-6 space-y-4 bg-white dark:bg-gray-950" : "p-4 space-y-2 bg-muted/30"}`}
            >
              {page.elements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Layers className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Drag elements here</p>
                  <p className="text-xs mt-1">Build your checkout visually</p>
                </div>
              ) : (
                renderElementsList(page.elements)
              )}
            </div>
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}

// Color Picker Component
function ColorPicker({
  value,
  onChange,
  label
}: {
  value?: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border cursor-pointer bg-background"
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          className="h-9 flex-1 font-mono text-sm"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Element Properties Panel
function ElementProperties({
  element,
  onUpdate,
}: {
  element: CheckoutElement | null;
  onUpdate: (config: Partial<ElementConfig>) => void;
}) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Settings className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm text-center">Select an element to configure</p>
      </div>
    );
  }

  const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {elementDef?.icon}
        </div>
        <div>
          <h4 className="font-medium">{element.label}</h4>
          <p className="text-xs text-muted-foreground">{elementDef?.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Display Label</Label>
          <Input
            value={element.config.label || element.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-9"
          />
        </div>

        {element.type === "customer_info" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require Phone</Label>
              <Switch
                checked={element.config.requirePhone as boolean}
                onCheckedChange={(checked) => onUpdate({ requirePhone: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require Full Name</Label>
              <Switch
                checked={element.config.requireName as boolean}
                onCheckedChange={(checked) => onUpdate({ requireName: checked })}
              />
            </div>
          </>
        )}

        {element.type === "attendee_details" && (
          <>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground mb-3">
              Collects name and contact info for each ticket purchased. Great for events that need to identify individual attendees at check-in.
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Pre-fill buyer as first attendee</Label>
              <Switch
                checked={element.config.prefillBuyer as boolean}
                onCheckedChange={(checked) => onUpdate({ prefillBuyer: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require Email</Label>
              <Switch
                checked={element.config.requireEmail as boolean}
                onCheckedChange={(checked) => onUpdate({ requireEmail: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require Phone</Label>
              <Switch
                checked={element.config.requirePhone as boolean}
                onCheckedChange={(checked) => onUpdate({ requirePhone: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Custom Questions</Label>
              <Switch
                checked={element.config.showCustomQuestions as boolean}
                onCheckedChange={(checked) => onUpdate({ showCustomQuestions: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Custom questions are configured in Event Settings → Custom Questions
            </p>
          </>
        )}

        {element.type === "ticket_selector" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Descriptions</Label>
              <Switch
                checked={element.config.showDescription as boolean}
                onCheckedChange={(checked) => onUpdate({ showDescription: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Availability</Label>
              <Switch
                checked={element.config.showAvailability as boolean}
                onCheckedChange={(checked) => onUpdate({ showAvailability: checked })}
              />
            </div>
          </>
        )}

        {element.type === "order_summary" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Itemized</Label>
              <Switch
                checked={element.config.showItemized as boolean}
                onCheckedChange={(checked) => onUpdate({ showItemized: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Collapsible</Label>
              <Switch
                checked={element.config.collapsible as boolean}
                onCheckedChange={(checked) => onUpdate({ collapsible: checked })}
              />
            </div>
          </>
        )}

        {element.type === "logo" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Size</Label>
              <Select
                value={(element.config.size as string) || "medium"}
                onValueChange={(value) => onUpdate({ size: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (48px)</SelectItem>
                  <SelectItem value="medium">Medium (64px)</SelectItem>
                  <SelectItem value="large">Large (96px)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(element.config.size as string) === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs">Custom Height (px)</Label>
                <Input
                  type="number"
                  value={(element.config.customHeight as number) || 64}
                  onChange={(e) => onUpdate({ customHeight: parseInt(e.target.value) || 64 })}
                  className="h-9"
                  min={16}
                  max={300}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Max Width (px)</Label>
              <Input
                type="number"
                value={(element.config.maxWidth as number) || ""}
                onChange={(e) => onUpdate({ maxWidth: e.target.value ? parseInt(e.target.value) : undefined })}
                className="h-9"
                placeholder="No limit"
                min={50}
                max={800}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no limit</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Alignment</Label>
              <div className="flex gap-1">
                <Button
                  variant={(element.config.alignment as string) === "left" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "left" })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={(element.config.alignment as string) === "center" || !(element.config.alignment as string) ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "center" })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={(element.config.alignment as string) === "right" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "right" })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vertical Padding</Label>
              <Select
                value={(element.config.verticalPadding as string) || "none"}
                onValueChange={(value) => onUpdate({ verticalPadding: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Use Organization Logo</Label>
              <Switch
                checked={element.config.showOrgLogo as boolean}
                onCheckedChange={(checked) => onUpdate({ showOrgLogo: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If disabled, uses the event logo instead
            </p>
          </>
        )}

        {element.type === "event_header" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Image</Label>
              <Switch
                checked={element.config.showImage as boolean}
                onCheckedChange={(checked) => onUpdate({ showImage: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Date</Label>
              <Switch
                checked={element.config.showDate as boolean}
                onCheckedChange={(checked) => onUpdate({ showDate: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Venue</Label>
              <Switch
                checked={element.config.showVenue as boolean}
                onCheckedChange={(checked) => onUpdate({ showVenue: checked })}
              />
            </div>
          </>
        )}

        {element.type === "text_block" && (
          <div className="space-y-2">
            <Label className="text-xs">Content</Label>
            <textarea
              value={(element.config.content as string) || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full h-24 p-2 text-sm rounded-md border bg-background resize-none"
              placeholder="Enter custom text..."
            />
          </div>
        )}

        {element.type === "terms_checkbox" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Terms URL</Label>
              <Input
                value={(element.config.termsUrl as string) || ""}
                onChange={(e) => onUpdate({ termsUrl: e.target.value })}
                className="h-9"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Privacy URL</Label>
              <Input
                value={(element.config.privacyUrl as string) || ""}
                onChange={(e) => onUpdate({ privacyUrl: e.target.value })}
                className="h-9"
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {element.type === "info_modal" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Trigger Text</Label>
              <Input
                value={(element.config.triggerText as string) || "Learn More"}
                onChange={(e) => onUpdate({ triggerText: e.target.value })}
                className="h-9"
                placeholder="Learn More"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Trigger Style</Label>
              <Select
                value={(element.config.triggerStyle as string) || "link"}
                onValueChange={(value) => onUpdate({ triggerStyle: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Text Link</SelectItem>
                  <SelectItem value="button">Button</SelectItem>
                  <SelectItem value="icon">Icon Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Modal Title</Label>
              <Input
                value={(element.config.modalTitle as string) || ""}
                onChange={(e) => onUpdate({ modalTitle: e.target.value })}
                className="h-9"
                placeholder="Additional Information"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Modal Content</Label>
              <textarea
                value={(element.config.modalContent as string) || ""}
                onChange={(e) => onUpdate({ modalContent: e.target.value })}
                className="w-full h-32 p-2 text-sm rounded-md border bg-background resize-none"
                placeholder="Enter the content to show in the modal..."
              />
            </div>
          </>
        )}

        {/* Custom Questions Builder */}
        {element.type === "custom_questions" && (
          <CustomQuestionsEditor
            questions={(element.config.questions as CustomQuestion[]) || []}
            onUpdate={(questions) => onUpdate({ questions })}
          />
        )}

        {/* Question Group */}
        {element.type === "question_group" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Group Title</Label>
              <Input
                value={(element.config.groupTitle as string) || "Additional Information"}
                onChange={(e) => onUpdate({ groupTitle: e.target.value })}
                className="h-9"
                placeholder="Section title..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Collapsible</Label>
              <Switch
                checked={element.config.collapsible as boolean}
                onCheckedChange={(checked) => onUpdate({ collapsible: checked })}
              />
            </div>
            {element.config.collapsible && (
              <div className="flex items-center justify-between">
                <Label className="text-sm">Start Expanded</Label>
                <Switch
                  checked={element.config.defaultExpanded as boolean}
                  onCheckedChange={(checked) => onUpdate({ defaultExpanded: checked })}
                />
              </div>
            )}
            <div className="border-t pt-4 mt-4">
              <CustomQuestionsEditor
                questions={(element.config.questions as CustomQuestion[]) || []}
                onUpdate={(questions) => onUpdate({ questions })}
              />
            </div>
          </>
        )}

        {/* Question Template Selector */}
        {element.type === "question_template" && (
          <QuestionTemplateSelector
            onSelectTemplate={(template) => {
              const questionsWithIds = template.questions.map((q, idx) => ({
                ...q,
                id: `${template.id}_${idx}_${Date.now()}`,
              }));
              onUpdate({
                templateId: template.id,
                questions: questionsWithIds,
                label: template.name,
              });
            }}
            selectedTemplateId={(element.config.templateId as string) || ""}
          />
        )}

        {/* Section Header */}
        {element.type === "section_header" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Header Text</Label>
              <Input
                value={(element.config.text as string) || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="h-9"
                placeholder="Section Title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Size</Label>
              <Select
                value={(element.config.size as string) || "lg"}
                onValueChange={(value) => onUpdate({ size: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Alignment</Label>
              <div className="flex gap-1">
                <Button
                  variant={(element.config.alignment as string) === "left" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "left" })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={(element.config.alignment as string) === "center" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "center" })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={(element.config.alignment as string) === "right" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onUpdate({ alignment: "right" })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ColorPicker
              label="Text Color"
              value={element.config.textColor as string}
              onChange={(color) => onUpdate({ textColor: color })}
            />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Underline</Label>
              <Switch
                checked={element.config.showDivider as boolean}
                onCheckedChange={(checked) => onUpdate({ showDivider: checked })}
              />
            </div>
          </>
        )}

        {/* Container */}
        {element.type === "container" && (
          <>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground mb-3">
              Styles all elements below until the next container, divider, or two-column layout.
            </div>
            <ColorPicker
              label="Background Color"
              value={element.config.backgroundColor as string}
              onChange={(color) => onUpdate({ backgroundColor: color })}
            />
            <div className="space-y-2">
              <Label className="text-xs">Padding</Label>
              <Select
                value={(element.config.padding as string) || "md"}
                onValueChange={(value) => onUpdate({ padding: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border Radius</Label>
              <Select
                value={(element.config.borderRadius as string) || "md"}
                onValueChange={(value) => onUpdate({ borderRadius: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Border</Label>
              <Switch
                checked={element.config.border as boolean}
                onCheckedChange={(checked) => onUpdate({ border: checked })}
              />
            </div>
            {element.config.border && (
              <ColorPicker
                label="Border Color"
                value={element.config.borderColor as string}
                onChange={(color) => onUpdate({ borderColor: color })}
              />
            )}
          </>
        )}

        {/* Two Column Layout */}
        {element.type === "two_column" && (
          <>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground mb-3">
              Drag elements into the left or right column on the canvas. Perfect for putting event info on one side and payment on the other.
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Left Column Width</Label>
              <Select
                value={(element.config.leftWidth as string) || "1/2"}
                onValueChange={(value) => onUpdate({ leftWidth: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1/3">1/3 - 2/3</SelectItem>
                  <SelectItem value="1/2">1/2 - 1/2</SelectItem>
                  <SelectItem value="2/3">2/3 - 1/3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Gap Size</Label>
              <Select
                value={(element.config.gap as string) || "md"}
                onValueChange={(value) => onUpdate({ gap: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Stack on Mobile</Label>
              <Switch
                checked={element.config.stackOnMobile as boolean}
                onCheckedChange={(checked) => onUpdate({ stackOnMobile: checked })}
              />
            </div>
            <ColorPicker
              label="Left Column Background"
              value={element.config.leftBackgroundColor as string}
              onChange={(color) => onUpdate({ leftBackgroundColor: color })}
            />
            <ColorPicker
              label="Right Column Background"
              value={element.config.rightBackgroundColor as string}
              onChange={(color) => onUpdate({ rightBackgroundColor: color })}
            />
          </>
        )}

        {/* Enhanced Divider */}
        {element.type === "divider" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Style</Label>
              <Select
                value={(element.config.style as string) || "line"}
                onValueChange={(value) => onUpdate({ style: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Solid Line</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Thickness</Label>
              <Select
                value={(element.config.thickness as string) || "thin"}
                onValueChange={(value) => onUpdate({ thickness: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thin">Thin</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="thick">Thick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Width</Label>
              <Select
                value={(element.config.width as string) || "full"}
                onValueChange={(value) => onUpdate({ width: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Width</SelectItem>
                  <SelectItem value="half">Half Width</SelectItem>
                  <SelectItem value="third">Third Width</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Spacing</Label>
              <Select
                value={(element.config.spacing as string) || "md"}
                onValueChange={(value) => onUpdate({ spacing: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ColorPicker
              label="Color"
              value={element.config.color as string}
              onChange={(color) => onUpdate({ color: color })}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Custom Questions Editor Component
function CustomQuestionsEditor({
  questions,
  onUpdate,
}: {
  questions: CustomQuestion[];
  onUpdate: (questions: CustomQuestion[]) => void;
}) {
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showNewQuestion, setShowNewQuestion] = useState(false);

  const addQuestion = (type: CustomQuestion['type']) => {
    const newQuestion: CustomQuestion = {
      id: `q_${Date.now()}`,
      question: "",
      label: "",
      type,
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? [] : undefined,
    };
    onUpdate([...questions, newQuestion]);
    setEditingQuestion(newQuestion.id);
    setShowNewQuestion(false);
  };

  const updateQuestion = (id: string, updates: Partial<CustomQuestion>) => {
    onUpdate(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (id: string) => {
    onUpdate(questions.filter((q) => q.id !== id));
    if (editingQuestion === id) setEditingQuestion(null);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    onUpdate(newQuestions);
  };

  const questionTypeIcons: Record<CustomQuestion['type'], React.ReactNode> = {
    text: <Type className="h-3 w-3" />,
    email: <Mail className="h-3 w-3" />,
    phone: <Phone className="h-3 w-3" />,
    textarea: <FileText className="h-3 w-3" />,
    select: <ChevronDown className="h-3 w-3" />,
    radio: <CheckSquare className="h-3 w-3" />,
    checkbox: <CheckSquare className="h-3 w-3" />,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Questions ({questions.length})</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewQuestion(!showNewQuestion)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Question Type Selector */}
      {showNewQuestion && (
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">Select field type:</p>
          <div className="grid grid-cols-2 gap-1">
            {(['text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox'] as const).map((type) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="h-8 justify-start text-xs"
                onClick={() => addQuestion(type)}
              >
                {questionTypeIcons[type]}
                <span className="ml-2 capitalize">{type}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-2">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className={`p-3 rounded-lg border transition-all ${
              editingQuestion === question.id
                ? "border-primary bg-primary/5"
                : "bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => moveQuestion(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => moveQuestion(index, 'down')}
                  disabled={index === questions.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setEditingQuestion(editingQuestion === question.id ? null : question.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-muted">
                    {questionTypeIcons[question.type]}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {question.label || question.question || "Untitled Question"}
                  </span>
                  {question.required && (
                    <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => removeQuestion(question.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Expanded Question Editor */}
            {editingQuestion === question.id && (
              <div className="mt-3 pt-3 border-t space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Question Label</Label>
                  <Input
                    value={question.label}
                    onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="e.g., Dietary Requirements"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Question Text (optional)</Label>
                  <Input
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="e.g., Do you have any dietary requirements?"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Required</Label>
                  <Switch
                    checked={question.required}
                    onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                  />
                </div>

                {/* Options for select/radio/checkbox */}
                {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options (one per line)</Label>
                    <textarea
                      value={Array.isArray(question.options) ? question.options.join('\n') : question.options || ''}
                      onChange={(e) => updateQuestion(question.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                      className="w-full h-20 p-2 text-xs rounded-md border bg-background resize-none"
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                {/* Conditional Logic */}
                <ConditionalLogicEditor
                  question={question}
                  allQuestions={questions}
                  onUpdate={(conditionalDisplay) => updateQuestion(question.id, { conditionalDisplay })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {questions.length === 0 && !showNewQuestion && (
        <div className="p-4 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <HelpCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No questions yet. Click "Add" to create one.</p>
        </div>
      )}
    </div>
  );
}

// Conditional Logic Editor Component
function ConditionalLogicEditor({
  question,
  allQuestions,
  onUpdate,
}: {
  question: CustomQuestion;
  allQuestions: CustomQuestion[];
  onUpdate: (conditionalDisplay: ConditionalDisplay | undefined) => void;
}) {
  const [enabled, setEnabled] = useState(!!question.conditionalDisplay);
  const otherQuestions = allQuestions.filter((q) => q.id !== question.id);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onUpdate(undefined);
    } else if (otherQuestions.length > 0) {
      onUpdate({
        dependsOn: otherQuestions[0].id,
        showWhen: "",
        operator: "equals",
      });
    }
  };

  if (otherQuestions.length === 0) {
    return null; // Can't add conditional logic without other questions
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Conditional Display
        </Label>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && question.conditionalDisplay && (
        <div className="space-y-2 p-2 rounded bg-muted/50">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Show this question when...</Label>
            <Select
              value={question.conditionalDisplay.dependsOn}
              onValueChange={(value) =>
                onUpdate({ ...question.conditionalDisplay!, dependsOn: value })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select question" />
              </SelectTrigger>
              <SelectContent>
                {otherQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id} className="text-xs">
                    {q.label || q.question || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Select
              value={question.conditionalDisplay.operator || "equals"}
              onValueChange={(value) =>
                onUpdate({
                  ...question.conditionalDisplay!,
                  operator: value as ConditionalDisplay['operator'],
                })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals" className="text-xs">equals</SelectItem>
                <SelectItem value="notEquals" className="text-xs">does not equal</SelectItem>
                <SelectItem value="contains" className="text-xs">contains</SelectItem>
                <SelectItem value="notContains" className="text-xs">does not contain</SelectItem>
                <SelectItem value="isNotEmpty" className="text-xs">is answered</SelectItem>
                <SelectItem value="isEmpty" className="text-xs">is empty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {question.conditionalDisplay.operator !== 'isEmpty' && question.conditionalDisplay.operator !== 'isNotEmpty' && (
            <div className="space-y-1">
              <Input
                value={
                  Array.isArray(question.conditionalDisplay.showWhen)
                    ? question.conditionalDisplay.showWhen.join(', ')
                    : question.conditionalDisplay.showWhen
                }
                onChange={(e) =>
                  onUpdate({
                    ...question.conditionalDisplay!,
                    showWhen: e.target.value,
                  })
                }
                className="h-7 text-xs"
                placeholder="Value to match..."
              />
              <p className="text-[10px] text-muted-foreground">
                Separate multiple values with commas
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Question Template Selector Component
function QuestionTemplateSelector({
  onSelectTemplate,
  selectedTemplateId,
}: {
  onSelectTemplate: (template: QuestionTemplate) => void;
  selectedTemplateId: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Choose a pre-built question set to quickly add common form fields.
      </p>
      <div className="space-y-2">
        {QUESTION_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedTemplateId === template.id
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "hover:border-muted-foreground/30"
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                {template.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {template.questions.length} questions
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
              {selectedTemplateId === template.id && (
                <CheckSquare className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>
      {selectedTemplateId && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckSquare className="h-3 w-3" />
          Template applied! Questions will be added to checkout.
        </p>
      )}
    </div>
  );
}

// Preview Element Component - Renders realistic mockups
function PreviewElement({ element }: { element: CheckoutElement }) {
  const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);

  switch (element.type) {
    case "logo":
      return (
        <div className={`flex ${element.config.alignment === "left" ? "justify-start" : element.config.alignment === "right" ? "justify-end" : "justify-center"}`}>
          <div className={`bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center ${element.config.size === "small" ? "h-12 w-24" : element.config.size === "large" ? "h-24 w-48" : "h-16 w-32"}`}>
            <Image className="h-6 w-6 text-primary/50" />
          </div>
        </div>
      );

    case "event_header":
      return (
        <div className="space-y-3">
          {element.config.showImage && (
            <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Image className="h-8 w-8 text-primary/30" />
            </div>
          )}
          <h2 className="text-xl font-bold">Summer Music Festival 2024</h2>
          {element.config.showDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Saturday, August 15, 2024 at 7:00 PM</span>
            </div>
          )}
          {element.config.showVenue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Central Park Amphitheater</span>
            </div>
          )}
        </div>
      );

    case "ticket_selector":
      return (
        <div className="space-y-3">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          {/* Mock Ticket 1 */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-medium">General Admission</div>
              {element.config.showDescription && (
                <p className="text-sm text-muted-foreground">Standard entry to the event</p>
              )}
              <div className="text-lg font-bold mt-1">$25.00</div>
              {element.config.showAvailability && (
                <p className="text-xs text-muted-foreground">142 available</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">2</span>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Mock Ticket 2 */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-medium">VIP Pass</div>
              {element.config.showDescription && (
                <p className="text-sm text-muted-foreground">Includes backstage access</p>
              )}
              <div className="text-lg font-bold mt-1">$75.00</div>
              {element.config.showAvailability && (
                <p className="text-xs text-muted-foreground">23 available</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">0</span>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );

    case "customer_info":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">First Name *</Label>
              <Input placeholder="John" className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Last Name *</Label>
              <Input placeholder="Doe" className="bg-muted/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Mail className="h-3 w-3" /> Email *
            </Label>
            <Input placeholder="john@example.com" className="bg-muted/50" />
          </div>
          {(element.config.requirePhone || element.config.showPhone !== false) && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Phone className="h-3 w-3" /> Phone {element.config.requirePhone ? "*" : "(optional)"}
              </Label>
              <Input placeholder="+1 (555) 000-0000" className="bg-muted/50" />
            </div>
          )}
        </div>
      );

    case "attendee_details":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{element.config.label || element.label}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Please provide details for each ticket holder
          </p>
          {/* Mock Attendee 1 */}
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Ticket 1</Badge>
                <span className="text-xs text-muted-foreground">(Primary Ticket Holder)</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input placeholder="John Doe" className="h-8 bg-muted/50 text-sm" disabled />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email {element.config.requireEmail ? "*" : ""}</Label>
                  <Input placeholder="john@example.com" className="h-8 bg-muted/50 text-sm" disabled />
                </div>
              </div>
              {element.config.requirePhone && (
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input placeholder="+1 (555) 000-0000" className="h-8 bg-muted/50 text-sm" disabled />
                </div>
              )}
            </CardContent>
          </Card>
          {/* Mock Attendee 2 */}
          <Card>
            <CardHeader className="pb-2">
              <Badge variant="outline" className="text-xs w-fit">Ticket 2</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input placeholder="Guest name" className="h-8 bg-muted/50 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email {element.config.requireEmail ? "*" : ""}</Label>
                  <Input placeholder="guest@example.com" className="h-8 bg-muted/50 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            + more attendees based on ticket quantity
          </p>
        </div>
      );

    case "payment_form":
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Pay with Card</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Card Number</Label>
                <div className="h-10 bg-muted/50 rounded-md border flex items-center px-3">
                  <span className="text-sm text-muted-foreground">4242 4242 4242 4242</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Expiry</Label>
                  <div className="h-10 bg-muted/50 rounded-md border flex items-center px-3">
                    <span className="text-sm text-muted-foreground">MM / YY</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CVC</Label>
                  <div className="h-10 bg-muted/50 rounded-md border flex items-center px-3">
                    <span className="text-sm text-muted-foreground">123</span>
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full">
              <DollarSign className="h-4 w-4 mr-1" />
              Pay $115.00
            </Button>
          </div>
        </div>
      );

    case "order_summary":
      return (
        <div className="space-y-3">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          <Card>
            <CardContent className="pt-4 space-y-3">
              {element.config.showItemized && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>General Admission x2</span>
                    <span>$50.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VIP Pass x1</span>
                    <span>$75.00</span>
                  </div>
                </>
              )}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span>Subtotal</span>
                <span>$125.00</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount (10%)</span>
                <span>-$12.50</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>$112.50</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case "promo_code":
      return (
        <div className="space-y-3">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          <div className="flex gap-2">
            <Input placeholder="Enter promo code" className="bg-muted/50" />
            <Button variant="outline">Apply</Button>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Tag className="h-3 w-3 mr-1" />
            SAVE10 - 10% off applied
          </Badge>
        </div>
      );

    case "terms_checkbox":
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg border">
          <div className="h-4 w-4 mt-0.5 rounded border-2 border-primary bg-primary flex items-center justify-center">
            <CheckSquare className="h-3 w-3 text-primary-foreground" />
          </div>
          <Label className="text-sm leading-relaxed cursor-pointer">
            I agree to the{" "}
            <span className="text-primary underline">Terms and Conditions</span>
            {element.config.privacyUrl && (
              <>
                {" "}and{" "}
                <span className="text-primary underline">Privacy Policy</span>
              </>
            )}
          </Label>
        </div>
      );

    case "timer":
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {element.config.showAvailability
              ? "Only 23 tickets remaining!"
              : "15:00 remaining to complete purchase"}
          </span>
        </div>
      );

    case "text_block":
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none p-3 rounded-lg bg-muted/30">
          {(element.config.content as string) || (
            <p className="text-muted-foreground italic">Custom text content will appear here...</p>
          )}
        </div>
      );

    case "divider": {
      const styleClasses: Record<string, string> = {
        line: "border-solid",
        dashed: "border-dashed",
        dotted: "border-dotted"
      };
      const thicknessClasses: Record<string, string> = {
        thin: "border-t",
        medium: "border-t-2",
        thick: "border-t-4"
      };
      const widthClasses: Record<string, string> = {
        full: "w-full",
        half: "w-1/2 mx-auto",
        third: "w-1/3 mx-auto"
      };
      const spacingClasses: Record<string, string> = {
        sm: "my-2",
        md: "my-4",
        lg: "my-8"
      };
      const style = (element.config.style as string) || "line";
      const thickness = (element.config.thickness as string) || "thin";
      const width = (element.config.width as string) || "full";
      const spacing = (element.config.spacing as string) || "md";
      return (
        <div
          className={`${widthClasses[width]} ${thicknessClasses[thickness]} ${styleClasses[style]} ${spacingClasses[spacing]}`}
          style={{ borderColor: (element.config.color as string) || undefined }}
        />
      );
    }

    case "section_header": {
      const sizeClasses: Record<string, string> = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl"
      };
      const alignClasses: Record<string, string> = {
        left: "text-left",
        center: "text-center",
        right: "text-right"
      };
      const size = (element.config.size as string) || "lg";
      const alignment = (element.config.alignment as string) || "left";
      return (
        <div className={`${alignClasses[alignment]} ${element.config.showDivider ? 'border-b pb-2' : ''}`}>
          <h2
            className={`font-semibold ${sizeClasses[size]}`}
            style={{ color: (element.config.textColor as string) || undefined }}
          >
            {(element.config.text as string) || element.label}
          </h2>
        </div>
      );
    }

    case "container": {
      const paddingClasses: Record<string, string> = {
        none: "p-0",
        sm: "p-2",
        md: "p-4",
        lg: "p-6"
      };
      const radiusClasses: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg"
      };
      const padding = (element.config.padding as string) || "md";
      const borderRadius = (element.config.borderRadius as string) || "md";
      return (
        <div
          className={`${paddingClasses[padding]} ${radiusClasses[borderRadius]} ${element.config.border ? 'border' : ''} min-h-[60px]`}
          style={{
            backgroundColor: (element.config.backgroundColor as string) || '#f8fafc',
            borderColor: (element.config.borderColor as string) || undefined
          }}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <Square className="h-4 w-4 mr-2 opacity-50" />
            Container - styles elements below
          </div>
        </div>
      );
    }

    case "info_modal": {
      const triggerStyle = element.config.triggerStyle as string || "link";
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {triggerStyle === "link" && (
              <span className="text-primary underline cursor-pointer text-sm hover:text-primary/80">
                {(element.config.triggerText as string) || "Learn More"}
              </span>
            )}
            {triggerStyle === "button" && (
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                {(element.config.triggerText as string) || "Learn More"}
              </Button>
            )}
            {triggerStyle === "icon" && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          {/* Mini modal preview */}
          <div className="ml-4 p-3 rounded-lg border bg-muted/30 text-xs">
            <div className="font-medium mb-1">
              {(element.config.modalTitle as string) || "Modal Title"}
            </div>
            <div className="text-muted-foreground line-clamp-2">
              {(element.config.modalContent as string) || "Modal content preview..."}
            </div>
          </div>
        </div>
      );
    }

    case "custom_questions": {
      const questions = (element.config.questions as CustomQuestion[]) || [];
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">{element.config.label || element.label}</h3>
          <div className="space-y-3 p-4 rounded-lg border border-dashed">
            {questions.length > 0 ? (
              questions.slice(0, 3).map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <Label className="text-sm flex items-center gap-1">
                    {q.label || q.question}
                    {q.required && <span className="text-destructive">*</span>}
                    {q.conditionalDisplay && (
                      <Badge variant="outline" className="text-[10px] ml-1">Conditional</Badge>
                    )}
                  </Label>
                  {(q.type === 'text' || q.type === 'email' || q.type === 'phone') && (
                    <Input placeholder={`Enter ${q.label || 'response'}...`} className="bg-muted/50" disabled />
                  )}
                  {q.type === 'textarea' && (
                    <div className="h-16 bg-muted/50 rounded-md border" />
                  )}
                  {q.type === 'select' && (
                    <Select disabled>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </Select>
                  )}
                  {(q.type === 'radio' || q.type === 'checkbox') && (
                    <div className="space-y-1">
                      {(Array.isArray(q.options) ? q.options.slice(0, 3) : []).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className={`h-4 w-4 rounded${q.type === 'radio' ? '-full' : ''} border`} />
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Dietary Requirements</Label>
                  <Input placeholder="e.g., Vegetarian, Gluten-free" className="bg-muted/50" disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">T-Shirt Size</Label>
                  <Select disabled>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </Select>
                </div>
              </>
            )}
            {questions.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                + {questions.length - 3} more questions
              </p>
            )}
          </div>
        </div>
      );
    }

    case "question_group": {
      const questions = (element.config.questions as CustomQuestion[]) || [];
      const isCollapsible = element.config.collapsible as boolean;
      const isExpanded = element.config.defaultExpanded as boolean;
      return (
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isCollapsible ? "cursor-pointer hover:bg-muted/30" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">
                {(element.config.groupTitle as string) || "Additional Information"}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {questions.length} questions
              </Badge>
            </div>
            {isCollapsible && (
              isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            )}
          </div>
          {(!isCollapsible || isExpanded) && questions.length > 0 && (
            <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-3">
              {questions.slice(0, 2).map((q, idx) => (
                <div key={idx} className="space-y-1">
                  <Label className="text-sm">{q.label || q.question}</Label>
                  <Input placeholder="..." className="bg-muted/50 h-8" disabled />
                </div>
              ))}
              {questions.length > 2 && (
                <p className="text-xs text-muted-foreground">+ {questions.length - 2} more</p>
              )}
            </div>
          )}
        </div>
      );
    }

    case "question_template": {
      const templateId = element.config.templateId as string;
      const template = QUESTION_TEMPLATES.find(t => t.id === templateId);
      return (
        <div className="space-y-3">
          {template ? (
            <>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {template.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
              </div>
              <div className="space-y-2 p-3 rounded-lg border border-dashed">
                {template.questions.slice(0, 2).map((q, idx) => (
                  <div key={idx} className="space-y-1">
                    <Label className="text-sm">{q.label}</Label>
                    <Input placeholder="..." className="bg-muted/50 h-8" disabled />
                  </div>
                ))}
                {template.questions.length > 2 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {template.questions.length - 2} more questions
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-center border-2 border-dashed rounded-lg">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a template in the properties panel</p>
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            {elementDef?.icon}
            {element.config.label || element.label}
          </div>
          <div className="h-12 bg-muted rounded animate-pulse" />
        </div>
      );
  }
}

// Main Component
interface CheckoutTemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  initialTemplate?: CheckoutTemplate | null;
  onSave: (template: CheckoutTemplate) => void;
}

export function CheckoutTemplateBuilder({
  open,
  onClose,
  initialTemplate,
  onSave,
}: CheckoutTemplateBuilderProps) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
  const [elementSearch, setElementSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<ElementCategory, boolean>>({
    core: true,
    forms: true,
    content: false,
    advanced: false,
  });

  // Initialize template
  const [template, setTemplate] = useState<CheckoutTemplate>(() => {
    if (initialTemplate) return initialTemplate;
    return {
      id: `template-${Date.now()}`,
      name: "Custom Checkout",
      pages: [
        {
          id: `page-${Date.now()}`,
          title: "Checkout",
          elements: [
            {
              id: `el-${Date.now()}-1`,
              type: "ticket_selector",
              label: "Select Tickets",
              config: { showDescription: true, showAvailability: true },
            },
            {
              id: `el-${Date.now()}-2`,
              type: "customer_info",
              label: "Your Details",
              config: { requirePhone: false, requireName: true },
            },
            {
              id: `el-${Date.now()}-3`,
              type: "payment_form",
              label: "Payment",
              config: { showSavedCards: true },
            },
          ],
        },
      ],
      settings: {
        showProgressBar: true,
        allowBackNavigation: true,
        mobileLayout: "stack",
        showOrderSummaryOnAllPages: false,
        themeMode: "system",
        layout: "single",
        sidebarPosition: "right",
        twoColumnLeftWidth: "1/2",
        twoColumnGap: "md",
        twoColumnStackOnMobile: true,
      },
    };
  });

  // Helper function to render element preview for WYSIWYG canvas
  const renderPreviewElement = (element: CheckoutElement): React.ReactNode => {
    return <PreviewElement element={element} />;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic for visual feedback
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Helper to find element and its position within a column
    const findElementPositionInColumn = (elementId: string, pageIndex: number, targetColumn: "left" | "right") => {
      const pageElements = template.pages[pageIndex]?.elements || [];
      const columnElements = pageElements.filter(e =>
        e.column === targetColumn || (targetColumn === "left" && !e.column)
      );
      const index = columnElements.findIndex(e => e.id === elementId);
      if (index === -1) return -1;

      // Find the actual index in the full elements array
      const element = columnElements[index];
      return pageElements.findIndex(e => e.id === element.id);
    };

    // Check if dropping onto a two-column zone (e.g., "page-0-left" or "page-0-right")
    const twoColumnPageMatch = overIdStr.match(/^page-(\d+)-(left|right)$/);

    // Also check if dropping onto an element that's in a column (for position-aware drops)
    let targetColumn: "left" | "right" | null = null;
    let targetPageIndex = -1;
    let insertPosition = -1;

    if (template.settings.layout === "two_column") {
      if (twoColumnPageMatch) {
        // Dropping onto the column zone itself
        const [, pageIndexStr, side] = twoColumnPageMatch;
        targetPageIndex = parseInt(pageIndexStr, 10);
        targetColumn = side as "left" | "right";
        // Insert at end of column
        insertPosition = template.pages[targetPageIndex]?.elements.length || 0;
      } else {
        // Check if dropping onto an existing element - find which column it's in
        for (let i = 0; i < template.pages.length; i++) {
          const element = template.pages[i].elements.find(e => e.id === overIdStr);
          if (element) {
            targetPageIndex = i;
            targetColumn = element.column || "left"; // Default to left if no column
            // Insert at this element's position
            insertPosition = template.pages[i].elements.findIndex(e => e.id === overIdStr);
            break;
          }
        }
      }
    }

    if (targetColumn && targetPageIndex >= 0) {
      // Handle dropping from palette into column
      if (activeIdStr.startsWith("palette-")) {
        const elementType = activeIdStr.replace("palette-", "") as ElementType;
        const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === elementType);
        if (!elementDef) return;

        // Create new element with column assignment
        const newElement: CheckoutElement = {
          id: `el-${Date.now()}`,
          type: elementType,
          label: elementDef.label,
          config: { ...elementDef.defaultConfig },
          column: targetColumn,
        };

        // Add element at the correct position
        setTemplate((prev) => {
          const newPages = [...prev.pages];
          const newElements = [...newPages[targetPageIndex].elements];
          newElements.splice(insertPosition, 0, newElement);
          newPages[targetPageIndex] = {
            ...newPages[targetPageIndex],
            elements: newElements,
          };
          return { ...prev, pages: newPages };
        });

        setSelectedElement(newElement.id);
        return;
      }

      // Handle dropping an EXISTING element into a column
      const existingElement = template.pages
        .flatMap(p => p.elements)
        .find(el => el.id === activeIdStr);

      if (existingElement) {
        // Update the element's column property and reorder
        setTemplate((prev) => {
          const newPages = prev.pages.map((page, idx) => {
            if (idx !== targetPageIndex) {
              // Remove from other pages if present
              return {
                ...page,
                elements: page.elements.filter(el => el.id !== activeIdStr)
              };
            }

            // For target page, remove element first then insert at position
            const elementsWithoutActive = page.elements.filter(el => el.id !== activeIdStr);
            const updatedElement = { ...existingElement, column: targetColumn };

            // Adjust insert position if we removed an element before it
            const originalIndex = page.elements.findIndex(el => el.id === activeIdStr);
            let adjustedPosition = insertPosition;
            if (originalIndex !== -1 && originalIndex < insertPosition) {
              adjustedPosition = insertPosition - 1;
            }

            elementsWithoutActive.splice(adjustedPosition, 0, updatedElement);
            return { ...page, elements: elementsWithoutActive };
          });
          return { ...prev, pages: newPages };
        });
        return;
      }
      return;
    }

    // Check if dropping onto a page drop zone (for empty pages or adding to end)
    const isPageDrop = overIdStr.startsWith("page-drop-");
    let dropPageIndex = -1;
    if (isPageDrop) {
      dropPageIndex = parseInt(overIdStr.replace("page-drop-", ""), 10);
    }

    // Check if dragging from palette
    if (activeIdStr.startsWith("palette-")) {
      const elementType = activeIdStr.replace("palette-", "") as ElementType;
      const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === elementType);
      if (!elementDef) return;

      // Find which page to add to
      let targetPageIndex = 0;
      let targetPosition = 0;

      // If dropped on a page drop zone, add to end of that page
      if (isPageDrop && dropPageIndex >= 0) {
        targetPageIndex = dropPageIndex;
        targetPosition = template.pages[dropPageIndex].elements.length;
      } else {
        // Check if dropping on a specific element
        for (let i = 0; i < template.pages.length; i++) {
          const pageElements = template.pages[i].elements;
          const elementIndex = pageElements.findIndex((e) => e.id === overIdStr);
          if (elementIndex !== -1) {
            targetPageIndex = i;
            targetPosition = elementIndex;
            break;
          }
        }
      }

      // Create new element
      const newElement: CheckoutElement = {
        id: `el-${Date.now()}`,
        type: elementType,
        label: elementDef.label,
        config: { ...elementDef.defaultConfig },
      };

      // Add to page
      setTemplate((prev) => {
        const newPages = [...prev.pages];
        const newElements = [...newPages[targetPageIndex].elements];
        newElements.splice(targetPosition, 0, newElement);
        newPages[targetPageIndex] = {
          ...newPages[targetPageIndex],
          elements: newElements,
        };
        return { ...prev, pages: newPages };
      });

      setSelectedElement(newElement.id);
      return;
    }

    // Find source page/position for existing element being moved
    let srcPageIdx = -1;
    let srcElementIdx = -1;
    let tgtPageIdx = -1;
    let tgtElementIdx = -1;

    for (let i = 0; i < template.pages.length; i++) {
      const page = template.pages[i];
      const activeIdx = page.elements.findIndex((e) => e.id === activeIdStr);
      const overIdx = page.elements.findIndex((e) => e.id === overIdStr);

      if (activeIdx !== -1) {
        srcPageIdx = i;
        srcElementIdx = activeIdx;
      }
      if (overIdx !== -1) {
        tgtPageIdx = i;
        tgtElementIdx = overIdx;
      }
    }

    // If we couldn't find the element being dragged, exit
    if (srcPageIdx === -1 || srcElementIdx === -1) return;

    // Handle drop onto page drop zone (moving element to a different page)
    if (isPageDrop && dropPageIndex >= 0 && dropPageIndex !== srcPageIdx) {
      setTemplate((prev) => {
        const newPages = [...prev.pages];

        // Get the element being moved
        const elementToMove = prev.pages[srcPageIdx].elements[srcElementIdx];

        // Remove from source page
        const sourceElements = [...prev.pages[srcPageIdx].elements];
        sourceElements.splice(srcElementIdx, 1);
        newPages[srcPageIdx] = {
          ...newPages[srcPageIdx],
          elements: sourceElements,
        };

        // Add to end of target page
        const targetElements = [...prev.pages[dropPageIndex].elements];
        targetElements.push(elementToMove);
        newPages[dropPageIndex] = {
          ...newPages[dropPageIndex],
          elements: targetElements,
        };

        return { ...prev, pages: newPages };
      });
      return;
    }

    // Same page reordering
    if (srcPageIdx === tgtPageIdx && tgtElementIdx !== -1) {
      if (srcElementIdx !== tgtElementIdx) {
        setTemplate((prev) => {
          const newPages = [...prev.pages];
          newPages[srcPageIdx] = {
            ...newPages[srcPageIdx],
            elements: arrayMove(prev.pages[srcPageIdx].elements, srcElementIdx, tgtElementIdx),
          };
          return { ...prev, pages: newPages };
        });
      }
      return;
    }

    // Cross-page move (dropping on an element in another page)
    if (tgtPageIdx !== -1 && srcPageIdx !== tgtPageIdx) {
      setTemplate((prev) => {
        const newPages = [...prev.pages];

        // Get the element being moved
        const elementToMove = prev.pages[srcPageIdx].elements[srcElementIdx];

        // Remove from source page
        const sourceElements = [...prev.pages[srcPageIdx].elements];
        sourceElements.splice(srcElementIdx, 1);
        newPages[srcPageIdx] = {
          ...newPages[srcPageIdx],
          elements: sourceElements,
        };

        // Add to target page at specific position
        const targetElements = [...prev.pages[tgtPageIdx].elements];
        targetElements.splice(tgtElementIdx, 0, elementToMove);
        newPages[tgtPageIdx] = {
          ...newPages[tgtPageIdx],
          elements: targetElements,
        };

        return { ...prev, pages: newPages };
      });
      return;
    }
  };

  const addPage = () => {
    const newPageId = `page-${Date.now()}`;
    setTemplate((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        {
          id: newPageId,
          title: `Step ${prev.pages.length + 1}`,
          elements: [],
        },
      ],
    }));
    toast({
      title: "Page Added",
      description: "New checkout page has been added. Drag elements to customize it.",
    });
    // Scroll to bottom after state update
    setTimeout(() => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }, 100);
  };

  const removePage = (pageIndex: number) => {
    if (template.pages.length <= 1) return;
    setTemplate((prev) => ({
      ...prev,
      pages: prev.pages.filter((_, i) => i !== pageIndex),
    }));
  };

  const updatePageTitle = (pageIndex: number, title: string) => {
    setTemplate((prev) => {
      const newPages = [...prev.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], title };
      return { ...prev, pages: newPages };
    });
  };

  // Helper to count how many of a specific element type exist across all pages
  const countElementsOfType = (type: ElementType): number => {
    return template.pages.reduce((count, page) => {
      return count + page.elements.filter((e) => e.type === type).length;
    }, 0);
  };

  // Check if an element can be deleted (required elements can be deleted if there's more than one)
  const canDeleteElement = (elementId: string): boolean => {
    for (const page of template.pages) {
      const element = page.elements.find((e) => e.id === elementId);
      if (element) {
        const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);
        if (!elementDef?.required) return true; // Non-required elements can always be deleted
        // Required elements can be deleted if there's more than one of that type
        return countElementsOfType(element.type) > 1;
      }
    }
    return true;
  };

  const removeElement = (pageIndex: number, elementId: string) => {
    const element = template.pages[pageIndex].elements.find((e) => e.id === elementId);
    const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element?.type);

    // Check if this is the last required element of its type
    if (elementDef?.required && countElementsOfType(element!.type) <= 1) {
      toast({
        title: "Cannot Remove",
        description: `At least one ${elementDef.label} is required for checkout`,
        variant: "destructive",
      });
      return;
    }

    setTemplate((prev) => {
      const newPages = [...prev.pages];
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        elements: newPages[pageIndex].elements.filter((e) => e.id !== elementId),
      };
      return { ...prev, pages: newPages };
    });

    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  // Duplicate an element
  const duplicateElement = (pageIndex: number, elementId: string) => {
    const element = template.pages[pageIndex].elements.find((e) => e.id === elementId);
    if (!element) return;

    const elementIndex = template.pages[pageIndex].elements.findIndex((e) => e.id === elementId);
    const newElement: CheckoutElement = {
      ...element,
      id: `el-${Date.now()}`,
      label: `${element.label} (Copy)`,
      config: JSON.parse(JSON.stringify(element.config)), // Deep clone config
    };

    setTemplate((prev) => {
      const newPages = [...prev.pages];
      const newElements = [...newPages[pageIndex].elements];
      newElements.splice(elementIndex + 1, 0, newElement);
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        elements: newElements,
      };
      return { ...prev, pages: newPages };
    });

    setSelectedElement(newElement.id);
    toast({
      title: "Element Duplicated",
      description: `${element.label} has been duplicated`,
    });
  };

  const updateElementConfig = useCallback(
    (elementId: string, config: Partial<ElementConfig>) => {
      setTemplate((prev) => ({
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          elements: page.elements.map((el) =>
            el.id === elementId ? { ...el, config: { ...el.config, ...config } } : el
          ),
        })),
      }));
    },
    []
  );

  const getSelectedElement = (): CheckoutElement | null => {
    for (const page of template.pages) {
      const element = page.elements.find((e) => e.id === selectedElement);
      if (element) return element;
    }
    return null;
  };

  const handleSave = () => {
    // Validate required elements exist
    const allElements = template.pages.flatMap((p) => p.elements);
    const requiredTypes: ElementType[] = ["ticket_selector", "customer_info", "payment_form"];

    for (const type of requiredTypes) {
      if (!allElements.some((e) => e.type === type)) {
        const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === type);
        toast({
          title: "Missing Required Element",
          description: `You must include "${elementDef?.label}" in your template`,
          variant: "destructive",
        });
        return;
      }
    }

    onSave(template);
    toast({
      title: "Template Saved",
      description: "Your custom checkout template has been saved",
    });
    onClose();
  };

  // Render preview of element for drag overlay
  const renderDragOverlay = () => {
    if (!activeId) return null;

    const activeIdStr = String(activeId);
    if (activeIdStr.startsWith("palette-")) {
      const type = activeIdStr.replace("palette-", "");
      const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === type);
      if (!elementDef) return null;

      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-lg">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            {elementDef.icon}
          </div>
          <span className="font-medium text-sm">{elementDef.label}</span>
        </div>
      );
    }

    // Find element in pages
    for (const page of template.pages) {
      const element = page.elements.find((e) => e.id === activeIdStr);
      if (element) {
        const elementDef = AVAILABLE_ELEMENTS.find((e) => e.type === element.type);
        return (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-lg">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              {elementDef?.icon}
            </div>
            <span className="font-medium text-sm">{element.label}</span>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>Custom Checkout Template</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? "Edit" : "Preview"}
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 ml-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {previewMode ? (
          // Preview Mode with realistic mockups
          (() => {
            // Check if user has added sidebar elements
            const allElements = template.pages.flatMap(p => p.elements);
            const hasOrderSummary = allElements.some(e => e.type === "order_summary");
            const orderSummaryElement = allElements.find(e => e.type === "order_summary");
            const promoCodeElement = allElements.find(e => e.type === "promo_code");
            const showSidebar = template.settings.layout === "sidebar" && hasOrderSummary;
            const sidebarOnLeft = template.settings.sidebarPosition === "left";
            const isTwoColumn = template.settings.layout === "two_column";

            // Filter out sidebar elements from inline when showing in sidebar
            const getElementsToShow = (elements: CheckoutElement[]) => {
              if (showSidebar) {
                return elements.filter(e => e.type !== "order_summary" && e.type !== "promo_code");
              }
              return elements;
            };

            // Two-column layout settings
            const twoColWidthClasses: Record<string, { left: string; right: string }> = {
              "1/3": { left: "w-1/3", right: "w-2/3" },
              "1/2": { left: "w-1/2", right: "w-1/2" },
              "2/3": { left: "w-2/3", right: "w-1/3" },
            };
            const twoColGapClasses: Record<string, string> = { sm: "gap-3", md: "gap-4", lg: "gap-6" };
            const twoColLeftWidth = template.settings.twoColumnLeftWidth || "1/2";
            const twoColGap = template.settings.twoColumnGap || "md";

            return (
              <div className="flex-1 p-6 bg-muted/30 overflow-auto">
                <div className={`mx-auto ${showSidebar ? "max-w-4xl" : isTwoColumn ? "max-w-3xl" : "max-w-md"}`}>
                  {/* Progress Bar */}
                  {template.pages.length > 1 && template.settings.showProgressBar && (
                    <div className="mb-6">
                      <div className="flex justify-between mb-2">
                        {template.pages.map((page, i) => (
                          <div
                            key={page.id}
                            className={`flex-1 text-center text-sm ${
                              i === currentPreviewPage
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {page.title || `Step ${i + 1}`}
                          </div>
                        ))}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${((currentPreviewPage + 1) / template.pages.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hint when sidebar layout but no order summary */}
                  {template.settings.layout === "sidebar" && !hasOrderSummary && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 text-sm">
                      <p className="font-medium">Sidebar Layout Selected</p>
                      <p className="text-xs mt-1">Add an "Order Summary" element to enable the sidebar view</p>
                    </div>
                  )}

                  {/* Main Content with Optional Sidebar */}
                  <div className={`${showSidebar ? "flex gap-6" : ""} ${showSidebar && sidebarOnLeft ? "flex-row-reverse" : ""}`}>
                    {/* Main Content */}
                    <div className="flex-1">
                      <Card>
                        <CardHeader>
                          <CardTitle>{template.pages[currentPreviewPage]?.title || "Checkout"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {isTwoColumn ? (
                            // Two-column preview layout
                            (() => {
                              const pageElements = template.pages[currentPreviewPage]?.elements || [];
                              // Unassigned elements default to left column
                              const leftElements = pageElements.filter(e => e.column === "left" || !e.column);
                              const rightElements = pageElements.filter(e => e.column === "right");

                              return (
                                <div className={`flex ${twoColGapClasses[twoColGap]}`}>
                                  <div className={`${twoColWidthClasses[twoColLeftWidth].left} space-y-4`}>
                                    {leftElements.length > 0 ? (
                                      leftElements.map((element) => (
                                        <PreviewElement key={element.id} element={element} />
                                      ))
                                    ) : (
                                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center text-muted-foreground text-sm">
                                        Left Column
                                      </div>
                                    )}
                                  </div>
                                  <div className={`${twoColWidthClasses[twoColLeftWidth].right} space-y-4`}>
                                    {rightElements.length > 0 ? (
                                      rightElements.map((element) => (
                                        <PreviewElement key={element.id} element={element} />
                                      ))
                                    ) : (
                                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center text-muted-foreground text-sm">
                                        Right Column
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            // Single column or sidebar layout
                            getElementsToShow(template.pages[currentPreviewPage]?.elements || []).map((element) => (
                              <PreviewElement key={element.id} element={element} />
                            ))
                          )}
                        </CardContent>
                      </Card>

                      {template.pages.length > 1 && (
                        <div className="flex justify-between mt-4">
                          <Button
                            variant="outline"
                            disabled={currentPreviewPage === 0}
                            onClick={() => setCurrentPreviewPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back
                          </Button>
                          <Button
                            disabled={currentPreviewPage === template.pages.length - 1}
                            onClick={() => setCurrentPreviewPage((p) => p + 1)}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Sidebar - only shows if user added order_summary AND layout is sidebar */}
                    {showSidebar && orderSummaryElement && (
                      <div className="w-80 flex-shrink-0 space-y-4">
                        {/* Promo Code in Sidebar */}
                        {promoCodeElement && (
                          <Card>
                            <CardContent className="pt-4">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Enter promo code"
                                    className="pl-9"
                                    disabled
                                  />
                                </div>
                                <Button variant="outline" size="sm" disabled>
                                  Apply
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Order Summary */}
                        <Card className="sticky top-4">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ShoppingCart className="h-5 w-5" />
                              {orderSummaryElement.config.label || orderSummaryElement.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Mock Order Items */}
                            {orderSummaryElement.config.showItemized !== false && (
                              <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span>General Admission x2</span>
                                  <span className="font-medium">$50.00</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>VIP Pass x1</span>
                                  <span className="font-medium">$75.00</span>
                                </div>
                              </div>
                            )}
                            <div className="border-t pt-3 space-y-2">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Subtotal</span>
                                <span>$125.00</span>
                              </div>
                              {promoCodeElement && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>Promo (SAVE10)</span>
                                  <span>-$12.50</span>
                                </div>
                              )}
                            </div>
                            <div className="border-t pt-3">
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{promoCodeElement ? "$112.50" : "$125.00"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          // Edit Mode
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - Elements Palette */}
              <div className="w-64 border-r bg-muted/20 flex flex-col">
                <div className="p-3 border-b space-y-2">
                  <h3 className="font-medium text-sm">Elements</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search elements..."
                      value={elementSearch}
                      onChange={(e) => setElementSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                    {elementSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                        onClick={() => setElementSearch('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <SortableContext
                    items={AVAILABLE_ELEMENTS.map((e) => `palette-${e.type}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-2">
                      {elementSearch ? (
                        // Search results - flat list
                        <div className="space-y-1">
                          {AVAILABLE_ELEMENTS.filter((el) => {
                            const search = elementSearch.toLowerCase();
                            return (
                              el.label.toLowerCase().includes(search) ||
                              el.description.toLowerCase().includes(search) ||
                              el.keywords?.some(k => k.toLowerCase().includes(search))
                            );
                          }).map((element) => (
                            <DraggableElement key={element.type} element={element} compact />
                          ))}
                          {AVAILABLE_ELEMENTS.filter((el) => {
                            const search = elementSearch.toLowerCase();
                            return (
                              el.label.toLowerCase().includes(search) ||
                              el.description.toLowerCase().includes(search) ||
                              el.keywords?.some(k => k.toLowerCase().includes(search))
                            );
                          }).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No elements match "{elementSearch}"
                            </p>
                          )}
                        </div>
                      ) : (
                        // Categorized view
                        <div className="space-y-2">
                          {(Object.keys(CATEGORY_INFO) as ElementCategory[]).map((category) => {
                            const categoryElements = AVAILABLE_ELEMENTS.filter(el => el.category === category);
                            const isExpanded = expandedCategories[category];
                            const info = CATEGORY_INFO[category];

                            return (
                              <div key={category} className="rounded-lg border bg-background">
                                <button
                                  onClick={() => setExpandedCategories(prev => ({
                                    ...prev,
                                    [category]: !prev[category],
                                  }))}
                                  className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-t-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {info.icon}
                                    <span className="text-xs font-medium">{info.label}</span>
                                    <Badge variant="secondary" className="h-4 text-[10px] px-1">
                                      {categoryElements.length}
                                    </Badge>
                                  </div>
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                </button>
                                {isExpanded && (
                                  <div className="p-1.5 pt-0 space-y-1">
                                    {categoryElements.map((element) => (
                                      <DraggableElement key={element.type} element={element} compact />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </div>

              {/* Center - Canvas */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {template.pages.length} {template.pages.length === 1 ? "Page" : "Pages"}
                    </span>
                    {template.settings.layout === "sidebar" && (
                      <Badge variant="outline" className="text-xs">
                        <PanelRight className="h-3 w-3 mr-1" />
                        Sidebar Layout
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={addPage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Page
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {/* Show sidebar layout visualization */}
                  {(() => {
                    const allElements = template.pages.flatMap(p => p.elements);
                    const hasOrderSummary = allElements.some(e => e.type === "order_summary");
                    const orderSummaryElement = allElements.find(e => e.type === "order_summary");
                    const promoCodeElement = allElements.find(e => e.type === "promo_code");
                    const showSidebarLayout = template.settings.layout === "sidebar";
                    const sidebarOnLeft = template.settings.sidebarPosition === "left";

                    // Find which page has each sidebar element
                    let orderSummaryPageIndex = -1;
                    let promoCodePageIndex = -1;
                    for (let i = 0; i < template.pages.length; i++) {
                      if (template.pages[i].elements.some(e => e.type === "order_summary")) {
                        orderSummaryPageIndex = i;
                      }
                      if (template.pages[i].elements.some(e => e.type === "promo_code")) {
                        promoCodePageIndex = i;
                      }
                    }

                    return (
                      <div className={`${showSidebarLayout ? "flex gap-4" : ""} ${showSidebarLayout && sidebarOnLeft ? "flex-row-reverse" : ""}`}>
                        {/* Main Pages Area */}
                        <div className="flex-1 space-y-4">
                          {template.pages.map((page, pageIndex) => {
                            // Filter out sidebar elements for sidebar layout
                            let elementsToShow = page.elements;
                            if (showSidebarLayout && hasOrderSummary) {
                              elementsToShow = elementsToShow.filter(e => e.type !== "order_summary" && e.type !== "promo_code");
                            }

                            const filteredPage = { ...page, elements: elementsToShow };

                            return (
                              <PageCanvas
                                key={page.id}
                                page={filteredPage}
                                pageIndex={pageIndex}
                                totalPages={template.pages.length}
                                selectedElement={selectedElement}
                                onSelectElement={setSelectedElement}
                                onRemoveElement={(elementId) => removeElement(pageIndex, elementId)}
                                onDuplicateElement={(elementId) => duplicateElement(pageIndex, elementId)}
                                onUpdatePageTitle={(title) => updatePageTitle(pageIndex, title)}
                                onRemovePage={() => removePage(pageIndex)}
                                canDeleteElement={canDeleteElement}
                                renderPreview={renderPreviewElement}
                                visualMode={true}
                                allElements={template.pages.flatMap(p => p.elements)}
                                onUpdateElementConfig={updateElementConfig}
                                layout={template.settings.layout}
                                twoColumnSettings={{
                                  leftWidth: template.settings.twoColumnLeftWidth,
                                  gap: template.settings.twoColumnGap,
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Sidebar Preview Area */}
                        {showSidebarLayout && (
                          <div className="w-64 flex-shrink-0 space-y-3">
                            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {sidebarOnLeft ? "Left" : "Right"} Sidebar
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-3">
                                {/* Promo Code in Sidebar */}
                                {promoCodeElement && (
                                  <div
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                      selectedElement === promoCodeElement.id
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                        : "bg-card hover:border-muted-foreground/30"
                                    }`}
                                    onClick={() => setSelectedElement(promoCodeElement.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <Tag className="h-3 w-3" />
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-xs">
                                          {promoCodeElement.config.label || promoCodeElement.label}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeElement(promoCodePageIndex, promoCodeElement.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Order Summary */}
                                {hasOrderSummary && orderSummaryElement ? (
                                  <div
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                      selectedElement === orderSummaryElement.id
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                        : "bg-card hover:border-muted-foreground/30"
                                    }`}
                                    onClick={() => setSelectedElement(orderSummaryElement.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <ShoppingCart className="h-3 w-3" />
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-xs">
                                          {orderSummaryElement.config.label || orderSummaryElement.label}
                                        </span>
                                        <p className="text-[10px] text-muted-foreground">
                                          Sticky sidebar
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeElement(orderSummaryPageIndex, orderSummaryElement.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                    {/* Mini preview */}
                                    <div className="mt-2 space-y-1.5 text-[10px] text-muted-foreground">
                                      <div className="flex justify-between">
                                        <span>Tickets</span>
                                        <span>$XX.XX</span>
                                      </div>
                                      <div className="border-t pt-1 flex justify-between font-medium text-foreground">
                                        <span>Total</span>
                                        <span>$XX.XX</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 text-center">
                                    <ShoppingCart className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                                    <p className="text-xs text-muted-foreground">
                                      Drag "Order Summary" here or to any page
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </ScrollArea>
              </div>

              {/* Right Panel - Properties */}
              <div className="w-72 border-l bg-muted/20 flex flex-col">
                <Tabs defaultValue="element" className="flex-1 flex flex-col">
                  <TabsList className="mx-3 mt-3">
                    <TabsTrigger value="element" className="flex-1">Element</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="element" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                      <ElementProperties
                        element={getSelectedElement()}
                        onUpdate={(config) =>
                          selectedElement && updateElementConfig(selectedElement, config)
                        }
                      />
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="settings" className="flex-1 mt-0 p-4">
                    <div className="space-y-4">
                      {/* Layout Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm">Layout</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={template.settings.layout === "single" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, layout: "single" },
                              }))
                            }
                          >
                            <LayoutTemplate className="h-4 w-4" />
                            <span className="text-xs">Single</span>
                          </Button>
                          <Button
                            variant={template.settings.layout === "sidebar" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, layout: "sidebar" },
                              }))
                            }
                          >
                            <PanelRight className="h-4 w-4" />
                            <span className="text-xs">Sidebar</span>
                          </Button>
                          <Button
                            variant={template.settings.layout === "two_column" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, layout: "two_column" },
                              }))
                            }
                          >
                            <Columns className="h-4 w-4" />
                            <span className="text-xs">Two Col</span>
                          </Button>
                        </div>
                      </div>

                      {/* Sidebar Position - only show if sidebar layout */}
                      {template.settings.layout === "sidebar" && (
                        <div className="space-y-2">
                          <Label className="text-sm">Sidebar Position</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant={template.settings.sidebarPosition === "right" ? "default" : "outline"}
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, sidebarPosition: "right" },
                                }))
                              }
                            >
                              <PanelRight className="h-4 w-4" />
                              Right
                            </Button>
                            <Button
                              variant={template.settings.sidebarPosition === "left" ? "default" : "outline"}
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, sidebarPosition: "left" },
                                }))
                              }
                            >
                              <PanelLeft className="h-4 w-4" />
                              Left
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Two Column Settings - only show if two_column layout */}
                      {template.settings.layout === "two_column" && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Column Split</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                variant={template.settings.twoColumnLeftWidth === "1/3" ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, twoColumnLeftWidth: "1/3" },
                                  }))
                                }
                              >
                                1/3 - 2/3
                              </Button>
                              <Button
                                variant={template.settings.twoColumnLeftWidth === "1/2" ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, twoColumnLeftWidth: "1/2" },
                                  }))
                                }
                              >
                                1/2 - 1/2
                              </Button>
                              <Button
                                variant={template.settings.twoColumnLeftWidth === "2/3" ? "default" : "outline"}
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, twoColumnLeftWidth: "2/3" },
                                  }))
                                }
                              >
                                2/3 - 1/3
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Gap</Label>
                            <Select
                              value={template.settings.twoColumnGap}
                              onValueChange={(v: "sm" | "md" | "lg") =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, twoColumnGap: v },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sm">Small</SelectItem>
                                <SelectItem value="md">Medium</SelectItem>
                                <SelectItem value="lg">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Stack on Mobile</Label>
                            <Switch
                              checked={template.settings.twoColumnStackOnMobile}
                              onCheckedChange={(checked) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, twoColumnStackOnMobile: checked },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-4" />

                      {/* Theme Mode Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm">Theme Mode</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={template.settings.themeMode === "light" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, themeMode: "light" },
                              }))
                            }
                          >
                            <Sun className="h-4 w-4" />
                            <span className="text-xs">Light</span>
                          </Button>
                          <Button
                            variant={template.settings.themeMode === "dark" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, themeMode: "dark" },
                              }))
                            }
                          >
                            <Moon className="h-4 w-4" />
                            <span className="text-xs">Dark</span>
                          </Button>
                          <Button
                            variant={template.settings.themeMode === "system" ? "default" : "outline"}
                            size="sm"
                            className="flex flex-col gap-1 h-auto py-3"
                            onClick={() =>
                              setTemplate((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, themeMode: "system" },
                              }))
                            }
                          >
                            <Monitor className="h-4 w-4" />
                            <span className="text-xs">System</span>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Controls the checkout appearance for customers
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Progress Bar</Label>
                        <Switch
                          checked={template.settings.showProgressBar}
                          onCheckedChange={(checked) =>
                            setTemplate((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, showProgressBar: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Back Navigation</Label>
                        <Switch
                          checked={template.settings.allowBackNavigation}
                          onCheckedChange={(checked) =>
                            setTemplate((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, allowBackNavigation: checked },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Summary on All Pages</Label>
                        <Switch
                          checked={template.settings.showOrderSummaryOnAllPages}
                          onCheckedChange={(checked) =>
                            setTemplate((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, showOrderSummaryOnAllPages: checked },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DragOverlay>{renderDragOverlay()}</DragOverlay>
          </DndContext>
        )}
      </DialogContent>
    </Dialog>
  );
}
