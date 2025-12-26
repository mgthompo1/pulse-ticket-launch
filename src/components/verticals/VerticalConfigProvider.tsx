/**
 * Vertical Configuration Provider
 * Provides vertical-specific context to child components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useVerticalConfig } from '@/hooks/useVerticalConfig';
import type {
  VerticalType,
  VerticalFeatures,
  VerticalTerminology,
  VerticalConfig,
} from '@/types/verticals';

interface VerticalContextValue {
  config: VerticalConfig | null;
  features: VerticalFeatures;
  terminology: VerticalTerminology;
  verticalType: VerticalType;
  isLoading: boolean;
  error: Error | null;
  isFeatureEnabled: (feature: keyof VerticalFeatures) => boolean;
  getTerm: (key: keyof VerticalTerminology, plural?: boolean) => string;
}

const VerticalContext = createContext<VerticalContextValue | null>(null);

interface VerticalConfigProviderProps {
  children: ReactNode;
  attractionId?: string;
  verticalType?: VerticalType;
}

/**
 * Provider component that makes vertical configuration available to child components
 */
export function VerticalConfigProvider({
  children,
  attractionId,
  verticalType,
}: VerticalConfigProviderProps) {
  const verticalConfig = useVerticalConfig({ attractionId, verticalType });

  return (
    <VerticalContext.Provider value={verticalConfig}>
      {children}
    </VerticalContext.Provider>
  );
}

/**
 * Hook to access vertical configuration from context
 * Must be used within a VerticalConfigProvider
 */
export function useVerticalContext(): VerticalContextValue {
  const context = useContext(VerticalContext);

  if (!context) {
    throw new Error(
      'useVerticalContext must be used within a VerticalConfigProvider'
    );
  }

  return context;
}

/**
 * Component that conditionally renders children based on feature flags
 */
interface VerticalFeatureGateProps {
  children: ReactNode;
  feature: keyof VerticalFeatures;
  fallback?: ReactNode;
}

export function VerticalFeatureGate({
  children,
  feature,
  fallback = null,
}: VerticalFeatureGateProps) {
  const { isFeatureEnabled } = useVerticalContext();

  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that renders different content based on vertical type
 */
interface VerticalSwitchProps {
  children: Partial<Record<VerticalType, ReactNode>> & { default?: ReactNode };
}

export function VerticalSwitch({ children }: VerticalSwitchProps) {
  const { verticalType } = useVerticalContext();

  const content = children[verticalType] ?? children.default ?? null;

  return <>{content}</>;
}

/**
 * Component that renders a term with proper vertical terminology
 */
interface TermProps {
  term: keyof VerticalTerminology;
  plural?: boolean;
  className?: string;
}

export function Term({ term, plural = false, className }: TermProps) {
  const { getTerm } = useVerticalContext();

  return <span className={className}>{getTerm(term, plural)}</span>;
}

export default VerticalConfigProvider;
