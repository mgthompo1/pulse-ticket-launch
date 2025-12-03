import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Rocket, X, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  link?: string;
}

interface FloatingOnboardingWidgetProps {
  checklistItems: ChecklistItem[];
  onNavigate?: (tab: string) => void;
  onOpenWizard?: () => void;
  organizationId?: string;
}

export const FloatingOnboardingWidget = ({
  checklistItems,
  onNavigate,
  onOpenWizard,
  organizationId
}: FloatingOnboardingWidgetProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const dismissKey = organizationId
    ? `onboarding_widget_dismissed_${organizationId}`
    : "onboarding_widget_dismissed";

  useEffect(() => {
    const dismissed = localStorage.getItem(dismissKey) === "true";
    setIsDismissed(dismissed);
  }, [dismissKey]);

  if (isDismissed) {
    return null;
  }

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "true");
    setIsDismissed(true);
  };

  const handleItemClick = (link?: string) => {
    if (link && onNavigate) {
      onNavigate(link);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900">
        {/* Header - always visible */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50">
              <Rocket className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">Getting Started</div>
              <div className="text-xs text-muted-foreground">
                {completedCount} of {totalCount} complete
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            {isMinimized ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Content - collapsible */}
        {!isMinimized && (
          <CardContent className="px-3 pb-3 pt-0">
            {/* Progress bar */}
            <div className="mb-3">
              <Progress value={progressPercent} className="h-1.5" />
            </div>

            {/* Checklist items */}
            <div className="space-y-1">
              {checklistItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.link)}
                  disabled={!item.link || item.completed}
                  className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                    item.link && !item.completed
                      ? "hover:bg-muted/60 cursor-pointer"
                      : "cursor-default"
                  } ${item.completed ? "opacity-60" : ""}`}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      item.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Launch wizard button */}
            {onOpenWizard && (
              <Button
                onClick={onOpenWizard}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Quick Setup Wizard
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
