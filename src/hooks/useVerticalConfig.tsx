/**
 * Vertical Configuration Hook
 * Provides vertical-specific features, terminology, and configuration
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  VerticalType,
  VerticalFeatures,
  VerticalTerminology,
  VerticalConfig,
  VerticalFeatureDefaults,
} from '@/types/verticals';

// Default features for fallback
const DEFAULT_FEATURES: VerticalFeatures = {
  staffSelection: 'optional',
  serviceCatalog: false,
  staffSchedules: false,
  membershipPasses: false,
  pricingTiers: false,
  tipsEnabled: false,
  productSales: false,
  recurringBookings: false,
  clientProfiles: false,
  joinExisting: false,
  variableDuration: false,
};

const DEFAULT_TERMINOLOGY: VerticalTerminology = {
  booking: 'Booking',
  bookings: 'Bookings',
  resource: 'Staff',
  resources: 'Staff',
  customer: 'Guest',
  customers: 'Guests',
  partySize: 'Party Size',
  startTime: 'Start Time',
  duration: 'Duration',
  bookNow: 'Book Now',
  checkIn: 'Check In',
};

interface UseVerticalConfigOptions {
  attractionId?: string;
  verticalType?: VerticalType;
}

interface UseVerticalConfigResult {
  config: VerticalConfig | null;
  features: VerticalFeatures;
  terminology: VerticalTerminology;
  verticalType: VerticalType;
  isLoading: boolean;
  error: Error | null;
  isFeatureEnabled: (feature: keyof VerticalFeatures) => boolean;
  getTerm: (key: keyof VerticalTerminology, plural?: boolean) => string;
}

/**
 * Hook to get vertical configuration for an attraction or vertical type
 */
export function useVerticalConfig(options: UseVerticalConfigOptions = {}): UseVerticalConfigResult {
  const { attractionId, verticalType: providedVerticalType } = options;

  // Fetch vertical defaults
  const { data: verticalDefaults } = useQuery({
    queryKey: ['verticalDefaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_feature_defaults')
        .select('*');

      if (error) throw error;
      return data as VerticalFeatureDefaults[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch attraction config if attractionId provided
  const { data: attractionData, isLoading, error } = useQuery({
    queryKey: ['attractionVerticalConfig', attractionId],
    queryFn: async () => {
      if (!attractionId) return null;

      const { data, error } = await supabase
        .from('attractions')
        .select('vertical_type, vertical_config, terminology, feature_overrides')
        .eq('id', attractionId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!attractionId,
  });

  // Determine the vertical type
  const verticalType: VerticalType = attractionData?.vertical_type ||
    providedVerticalType ||
    'general';

  // Get defaults for this vertical
  const defaults = verticalDefaults?.find(d => d.vertical_type === verticalType);

  // Merge features: defaults + attraction overrides
  const features: VerticalFeatures = {
    ...DEFAULT_FEATURES,
    ...(defaults?.features as VerticalFeatures || {}),
    ...(attractionData?.feature_overrides as Partial<VerticalFeatures> || {}),
  };

  // Merge terminology: defaults + attraction overrides
  const terminology: VerticalTerminology = {
    ...DEFAULT_TERMINOLOGY,
    ...(defaults?.terminology as VerticalTerminology || {}),
    ...(attractionData?.terminology as Partial<VerticalTerminology> || {}),
  };

  // Build full config
  const config: VerticalConfig | null = defaults ? {
    type: verticalType,
    features,
    terminology,
    config: {
      ...(defaults.default_config || {}),
      ...(attractionData?.vertical_config || {}),
    },
  } : null;

  // Helper to check if a feature is enabled
  const isFeatureEnabled = (feature: keyof VerticalFeatures): boolean => {
    const value = features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'none';
    return false;
  };

  // Helper to get terminology
  const getTerm = (key: keyof VerticalTerminology, plural = false): string => {
    if (plural) {
      if (key === 'booking') return terminology.bookings || `${terminology.booking}s`;
      if (key === 'resource') return terminology.resources || `${terminology.resource}s`;
      if (key === 'customer') return terminology.customers || `${terminology.customer}s`;
    }
    return terminology[key] || key;
  };

  return {
    config,
    features,
    terminology,
    verticalType,
    isLoading,
    error: error as Error | null,
    isFeatureEnabled,
    getTerm,
  };
}

/**
 * Hook to get all available vertical types with their defaults
 */
export function useVerticalDefaults() {
  return useQuery({
    queryKey: ['verticalDefaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_feature_defaults')
        .select('*')
        .order('vertical_type');

      if (error) throw error;
      return data as VerticalFeatureDefaults[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export default useVerticalConfig;
