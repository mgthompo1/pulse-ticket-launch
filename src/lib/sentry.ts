import * as Sentry from "@sentry/react";

export const initSentry = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not configured. Error monitoring disabled.');
    return;
  }

  console.log('🚀 Initializing Sentry...');

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Environment
    environment: import.meta.env.MODE,

    // Release tracking
    release: `ticketflo@${import.meta.env.VITE_APP_VERSION || 'dev'}`,

    // Don't send in development
    enabled: import.meta.env.MODE === 'production',

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized successfully!');
};

// Helper function to capture errors with context
export const captureError = (
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
) => {
  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  if (context?.extra) {
    Sentry.setContext('extra', context.extra);
  }

  Sentry.captureException(error, {
    level: context?.level || 'error',
  });
};

// Helper function to add breadcrumbs for tracking user actions
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
};

// Helper to set user context (without sensitive data)
export const setUserContext = (userId: string, organizationId?: string) => {
  Sentry.setUser({ id: userId });
  if (organizationId) {
    Sentry.setTag('organization_id', organizationId);
  }
};

// Helper to clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null);
};
