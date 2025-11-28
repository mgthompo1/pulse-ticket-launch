import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingState {
  showWizard: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  hasEvents: boolean;
  hasPaymentSetup: boolean;
  checklistItems: ChecklistItem[];
  refreshOnboardingState: () => Promise<void>;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  link?: string;
}

export const useOnboarding = (): OnboardingState => {
  const { user, organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  // Default to true to prevent flash - will be set to false if no events found
  const [hasEvents, setHasEvents] = useState(true);
  const [hasPaymentSetup, setHasPaymentSetup] = useState(false);
  const [hasPublishedEvent, setHasPublishedEvent] = useState(false);
  const [hasSoldTicket, setHasSoldTicket] = useState(false);

  const checkOnboardingStatus = useCallback(async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Check localStorage for onboarding completion
      const onboardingCompleted = localStorage.getItem("onboarding_completed") === "true";

      // Check if organization has any events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, status")
        .eq("organization_id", organization.id)
        .limit(10);

      if (eventsError) throw eventsError;

      const hasAnyEvents = events && events.length > 0;
      const hasPublished = events?.some(e => e.status === "published") || false;
      setHasEvents(hasAnyEvents);
      setHasPublishedEvent(hasPublished);

      // Check if payment is set up (Stripe connected)
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("stripe_connected_account_id, windcave_user_id")
        .eq("id", organization.id)
        .single();

      if (orgError && orgError.code !== "PGRST116") throw orgError;

      const hasPayment = !!(orgData?.stripe_connected_account_id || orgData?.windcave_user_id);
      setHasPaymentSetup(hasPayment);

      // Check if any tickets have been sold
      if (hasAnyEvents && events) {
        const eventIds = events.map(e => e.id);
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id")
          .in("event_id", eventIds)
          .eq("status", "completed")
          .limit(1);

        if (!ordersError) {
          setHasSoldTicket(orders && orders.length > 0);
        }
      }

      // Show wizard if:
      // 1. Onboarding not completed in localStorage
      // 2. No events exist
      // 3. User just signed up (could check created_at)
      const shouldShowWizard = !onboardingCompleted && !hasAnyEvents;
      setShowWizard(shouldShowWizard);

    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const hasCompletedOnboarding = localStorage.getItem("onboarding_completed") === "true";

  const checklistItems: ChecklistItem[] = [
    {
      id: "create-event",
      label: "Create your first event",
      completed: hasEvents,
      link: "events",
    },
    {
      id: "setup-payment",
      label: "Connect a payment provider",
      completed: hasPaymentSetup,
      link: "payments",
    },
    {
      id: "publish-event",
      label: "Publish your event",
      completed: hasPublishedEvent,
      link: "events",
    },
    {
      id: "sell-ticket",
      label: "Sell your first ticket",
      completed: hasSoldTicket,
    },
  ];

  const refreshOnboardingState = useCallback(async () => {
    setIsLoading(true);
    await checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    showWizard,
    isLoading,
    hasCompletedOnboarding,
    hasEvents,
    hasPaymentSetup,
    checklistItems,
    refreshOnboardingState,
  };
};
