import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingState {
  showWizard: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  hasEvents: boolean;
  hasPublishedEvent: boolean;
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

interface UseOnboardingOptions {
  organizationId?: string | null;
}

export const useOnboarding = (options?: UseOnboardingOptions): OnboardingState => {
  const organizationId = options?.organizationId;
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  // Default to true to prevent flash - will be set to false if no events found
  const [hasEvents, setHasEvents] = useState(true);
  const [hasPaymentSetup, setHasPaymentSetup] = useState(false);
  const [hasPublishedEvent, setHasPublishedEvent] = useState(false);
  const [hasSoldTicket, setHasSoldTicket] = useState(false);

  const checkOnboardingStatus = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    console.log("🎯 Checking onboarding status for org:", organizationId);

    try {
      // Check if organization has any events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, status")
        .eq("organization_id", organizationId)
        .limit(10);

      if (eventsError) throw eventsError;

      const hasAnyEvents = events && events.length > 0;
      const hasPublished = events?.some(e => e.status === "published") || false;

      console.log("🎯 Onboarding check - hasAnyEvents:", hasAnyEvents, "hasPublished:", hasPublished);

      setHasEvents(hasAnyEvents);
      setHasPublishedEvent(hasPublished);

      // Show wizard if user doesn't have a published event yet
      // This ensures onboarding shows until they complete the full flow
      // Set this FIRST before any other queries that might fail
      const shouldShowWizard = !hasPublished;
      console.log("🎯 Should show wizard:", shouldShowWizard);
      setShowWizard(shouldShowWizard);

      // Check if payment is set up (Stripe connected) - non-blocking
      try {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("stripe_account_id, payment_provider")
          .eq("id", organizationId)
          .single();

        if (!orgError) {
          // Check if Stripe is connected or any payment provider is configured
          const hasPayment = !!(orgData?.stripe_account_id || orgData?.payment_provider);
          setHasPaymentSetup(hasPayment);
        }
      } catch (e) {
        console.warn("Could not check payment setup:", e);
      }

      // Check if any tickets have been sold - non-blocking
      if (hasAnyEvents && events) {
        try {
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
        } catch (e) {
          console.warn("Could not check tickets sold:", e);
        }
      }

    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const hasCompletedOnboarding = hasPublishedEvent;

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
    hasPublishedEvent,
    hasPaymentSetup,
    checklistItems,
    refreshOnboardingState,
  };
};
