import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CustomerInfo } from '@/types/widget';

/**
 * Standard URL parameter names for pre-populating checkout forms
 */
export const URL_PARAM_KEYS = {
  // Customer info
  name: ['name', 'customer_name', 'fullname', 'full_name'],
  email: ['email', 'customer_email', 'e'],
  phone: ['phone', 'customer_phone', 'tel', 'mobile'],

  // Tracking / attribution
  source: ['source', 'utm_source', 'ref'],
  campaign: ['campaign', 'utm_campaign'],
  medium: ['medium', 'utm_medium'],

  // Promo code
  promoCode: ['promo', 'promo_code', 'promocode', 'code', 'discount'],

  // Custom question prefix
  customPrefix: 'q_', // e.g., q_dietary_requirements=vegetarian
} as const;

interface PrepopulatedData {
  customerInfo: Partial<CustomerInfo>;
  customAnswers: Record<string, string>;
  promoCode: string | null;
  trackingParams: {
    source: string | null;
    campaign: string | null;
    medium: string | null;
  };
}

/**
 * Hook to extract pre-populated form data from URL parameters
 *
 * Supported URL parameters:
 * - name, customer_name, fullname, full_name → Customer name
 * - email, customer_email, e → Customer email
 * - phone, customer_phone, tel, mobile → Customer phone
 * - promo, promo_code, promocode, code, discount → Promo code
 * - source, utm_source, ref → Traffic source tracking
 * - campaign, utm_campaign → Campaign tracking
 * - medium, utm_medium → Medium tracking
 * - q_[question_id]=value → Custom question answers
 *
 * @example
 * URL: /widget/event123?name=John%20Doe&email=john@example.com&promo=SAVE10&q_dietary=vegetarian
 *
 * Returns:
 * {
 *   customerInfo: { name: 'John Doe', email: 'john@example.com' },
 *   customAnswers: { dietary: 'vegetarian' },
 *   promoCode: 'SAVE10',
 *   trackingParams: { source: null, campaign: null, medium: null }
 * }
 */
export function useUrlPrepopulation(): PrepopulatedData {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const result: PrepopulatedData = {
      customerInfo: {},
      customAnswers: {},
      promoCode: null,
      trackingParams: {
        source: null,
        campaign: null,
        medium: null,
      },
    };

    // Helper to find first matching param
    const findParam = (keys: readonly string[]): string | null => {
      for (const key of keys) {
        const value = searchParams.get(key);
        if (value) return value;
      }
      return null;
    };

    // Extract customer info
    const name = findParam(URL_PARAM_KEYS.name);
    const email = findParam(URL_PARAM_KEYS.email);
    const phone = findParam(URL_PARAM_KEYS.phone);

    if (name) result.customerInfo.name = decodeURIComponent(name);
    if (email) result.customerInfo.email = decodeURIComponent(email);
    if (phone) result.customerInfo.phone = decodeURIComponent(phone);

    // Extract promo code
    result.promoCode = findParam(URL_PARAM_KEYS.promoCode);

    // Extract tracking params
    result.trackingParams.source = findParam(URL_PARAM_KEYS.source);
    result.trackingParams.campaign = findParam(URL_PARAM_KEYS.campaign);
    result.trackingParams.medium = findParam(URL_PARAM_KEYS.medium);

    // Extract custom question answers (q_questionId=value)
    searchParams.forEach((value, key) => {
      if (key.startsWith(URL_PARAM_KEYS.customPrefix)) {
        const questionId = key.slice(URL_PARAM_KEYS.customPrefix.length);
        result.customAnswers[questionId] = decodeURIComponent(value);
      }
    });

    return result;
  }, [searchParams]);
}

/**
 * Non-hook version for use outside React components
 */
export function extractUrlPrepopulation(url?: string): PrepopulatedData {
  const searchParams = new URLSearchParams(
    url ? new URL(url, window.location.origin).search : window.location.search
  );

  const result: PrepopulatedData = {
    customerInfo: {},
    customAnswers: {},
    promoCode: null,
    trackingParams: {
      source: null,
      campaign: null,
      medium: null,
    },
  };

  const findParam = (keys: readonly string[]): string | null => {
    for (const key of keys) {
      const value = searchParams.get(key);
      if (value) return value;
    }
    return null;
  };

  const name = findParam(URL_PARAM_KEYS.name);
  const email = findParam(URL_PARAM_KEYS.email);
  const phone = findParam(URL_PARAM_KEYS.phone);

  if (name) result.customerInfo.name = decodeURIComponent(name);
  if (email) result.customerInfo.email = decodeURIComponent(email);
  if (phone) result.customerInfo.phone = decodeURIComponent(phone);

  result.promoCode = findParam(URL_PARAM_KEYS.promoCode);
  result.trackingParams.source = findParam(URL_PARAM_KEYS.source);
  result.trackingParams.campaign = findParam(URL_PARAM_KEYS.campaign);
  result.trackingParams.medium = findParam(URL_PARAM_KEYS.medium);

  searchParams.forEach((value, key) => {
    if (key.startsWith(URL_PARAM_KEYS.customPrefix)) {
      const questionId = key.slice(URL_PARAM_KEYS.customPrefix.length);
      result.customAnswers[questionId] = decodeURIComponent(value);
    }
  });

  return result;
}

/**
 * Generate a pre-populated URL for an event
 *
 * @example
 * generatePrepopulatedUrl('/widget/event123', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   promoCode: 'SAVE10'
 * })
 * // Returns: '/widget/event123?name=John%20Doe&email=john%40example.com&promo=SAVE10'
 */
export function generatePrepopulatedUrl(
  baseUrl: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    promoCode?: string;
    source?: string;
    campaign?: string;
    medium?: string;
    customAnswers?: Record<string, string>;
  }
): string {
  const params = new URLSearchParams();

  if (data.name) params.set('name', data.name);
  if (data.email) params.set('email', data.email);
  if (data.phone) params.set('phone', data.phone);
  if (data.promoCode) params.set('promo', data.promoCode);
  if (data.source) params.set('source', data.source);
  if (data.campaign) params.set('campaign', data.campaign);
  if (data.medium) params.set('medium', data.medium);

  if (data.customAnswers) {
    Object.entries(data.customAnswers).forEach(([key, value]) => {
      params.set(`q_${key}`, value);
    });
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
