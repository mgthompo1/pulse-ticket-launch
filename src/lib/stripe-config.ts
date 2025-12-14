/**
 * Stripe Configuration Utility
 *
 * Supports two ways to enable test mode:
 * 1. Per-organization toggle in Payment Settings (recommended)
 * 2. Global environment variable toggle (for development)
 *
 * Test card numbers (when in test mode):
 * - Success: 4242 4242 4242 4242 (any future date, any CVC)
 * - Decline: 4000 0000 0000 0002
 * - Requires auth: 4000 0025 0000 3155
 */

/**
 * Check if Stripe test mode is enabled via environment variable
 * This is used when organization data is not available
 */
export const isStripeTestMode = (): boolean => {
  const testMode = import.meta.env.VITE_STRIPE_TEST_MODE;
  return testMode === 'true' || testMode === true;
};

/**
 * Check if test mode is enabled for a specific organization
 * Organization setting takes precedence over environment variable
 * Only falls back to env var if organization setting is not explicitly set
 */
export const isStripeTestModeForOrg = (organization?: { stripe_test_mode?: boolean } | null): boolean => {
  // If organization has test mode explicitly set, use that value
  if (organization && typeof organization.stripe_test_mode === 'boolean') {
    return organization.stripe_test_mode;
  }
  // Fall back to environment variable only if org setting is not defined
  return isStripeTestMode();
};

/**
 * Get the appropriate Stripe publishable key based on test mode
 * @param organization - Optional organization data to check for test mode setting
 */
export const getStripePublishableKey = (organization?: { stripe_test_mode?: boolean } | null): string => {
  const testMode = isStripeTestModeForOrg(organization);

  if (testMode) {
    const testKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;
    if (testKey && !testKey.includes('YOUR_TEST_PUBLISHABLE_KEY')) {
      console.info('🧪 Stripe TEST MODE - use card 4242 4242 4242 4242');
      return testKey;
    }
    // Test mode enabled but no test key - warn and fall back
    console.warn('⚠️ Test mode enabled but VITE_STRIPE_TEST_PUBLISHABLE_KEY not set. Using live key.');
  }

  // Default: use the live/existing key
  return import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
};

/**
 * Get mode label for UI display
 */
export const getStripeModeLabel = (organization?: { stripe_test_mode?: boolean } | null): 'test' | 'live' => {
  return isStripeTestModeForOrg(organization) ? 'test' : 'live';
};

/**
 * Stripe configuration object with getters
 */
export const stripeConfig = {
  get publishableKey() {
    return getStripePublishableKey();
  },
  get isTestMode() {
    return isStripeTestMode();
  },
  get modeLabel() {
    return getStripeModeLabel();
  },
  // Helper to get config for a specific organization
  forOrg(organization?: { stripe_test_mode?: boolean } | null) {
    return {
      publishableKey: getStripePublishableKey(organization),
      isTestMode: isStripeTestModeForOrg(organization),
      modeLabel: getStripeModeLabel(organization),
    };
  },
  // Test card numbers for reference
  testCards: {
    success: '4242 4242 4242 4242',
    decline: '4000 0000 0000 0002',
    requiresAuth: '4000 0025 0000 3155',
    insufficientFunds: '4000 0000 0000 9995',
  }
};

export default stripeConfig;
