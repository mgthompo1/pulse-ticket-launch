import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboarding } from "@/hooks/useOnboarding";

interface OnboardingChecklistProps {
  onNavigate?: (tab: string) => void;
  onDismiss?: () => void;
}

export const OnboardingChecklist = ({ onNavigate, onDismiss }: OnboardingChecklistProps) => {
  const { checklistItems, hasEvents } = useOnboarding();

  // Don't show if user has events (onboarding complete)
  if (hasEvents) {
    return null;
  }

  // Check if dismissed in localStorage
  const isDismissed = localStorage.getItem("onboarding_checklist_dismissed") === "true";
  if (isDismissed) {
    return null;
  }

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    localStorage.setItem("onboarding_checklist_dismissed", "true");
    onDismiss?.();
  };

  const handleItemClick = (link?: string) => {
    if (link && onNavigate) {
      onNavigate(link);
    }
  };

  return (
    <Card className="mx-3 mb-4 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50">
              <Rocket className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Getting Started</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} of {totalCount} complete</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Checklist items */}
        <div className="space-y-1.5">
          {checklistItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.link)}
              disabled={!item.link}
              className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                item.link
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
      </CardContent>
    </Card>
  );
};
