/**
 * Google Analytics 4 utility for enhanced event tracking
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

type GtagEventParams = {
  [key: string]: string | number | boolean | undefined;
};

/**
 * Track a custom event in GA4
 */
export function trackEvent(
  eventName: string,
  params?: GtagEventParams
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/**
 * Track page view (useful for SPA navigation)
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }
}

/**
 * Track ticket purchase initiation
 */
export function trackBeginCheckout(
  eventId: string,
  eventName: string,
  value: number,
  currency: string = 'USD'
): void {
  trackEvent('begin_checkout', {
    event_id: eventId,
    event_name: eventName,
    value,
    currency,
  });
}

/**
 * Track successful purchase
 */
export function trackPurchase(
  transactionId: string,
  eventId: string,
  eventName: string,
  value: number,
  currency: string = 'USD',
  ticketCount: number = 1
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    event_id: eventId,
    event_name: eventName,
    value,
    currency,
    items: ticketCount,
  });
}

/**
 * Track event view (when user views an event widget)
 */
export function trackEventView(eventId: string, eventName: string): void {
  trackEvent('view_item', {
    event_id: eventId,
    event_name: eventName,
    content_type: 'event',
  });
}

/**
 * Track ticket selection
 */
export function trackSelectTicket(
  eventId: string,
  ticketType: string,
  price: number
): void {
  trackEvent('select_item', {
    event_id: eventId,
    item_name: ticketType,
    price,
  });
}

/**
 * Track form submission (contact, support, etc.)
 */
export function trackFormSubmission(formName: string): void {
  trackEvent('form_submission', {
    form_name: formName,
  });
}

/**
 * Track user sign up
 */
export function trackSignUp(method: string = 'email'): void {
  trackEvent('sign_up', {
    method,
  });
}

/**
 * Track user login
 */
export function trackLogin(method: string = 'email'): void {
  trackEvent('login', {
    method,
  });
}

/**
 * Track share action
 */
export function trackShare(
  contentType: string,
  itemId: string,
  method: string
): void {
  trackEvent('share', {
    content_type: contentType,
    item_id: itemId,
    method,
  });
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string): void {
  trackEvent('search', {
    search_term: searchTerm,
  });
}
