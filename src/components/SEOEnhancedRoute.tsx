import React from 'react';
import { useDynamicSEO } from '@/hooks/useDynamicSEO';
import { SEOHead } from '@/components/SEOHead';

interface SEOEnhancedRouteProps {
  children: React.ReactNode;
  eventId?: string;
  organizationId?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  staticSEO?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    noindex?: boolean;
  };
  enableDynamicSEO?: boolean;
}

export const SEOEnhancedRoute: React.FC<SEOEnhancedRouteProps> = ({
  children,
  eventId,
  organizationId,
  fallbackTitle,
  fallbackDescription,
  staticSEO,
  enableDynamicSEO = true
}) => {
  // Use dynamic SEO for pages that need it
  const { metaTags, loading, error } = useDynamicSEO({
    eventId,
    organizationId,
    fallbackTitle,
    fallbackDescription,
    enabled: enableDynamicSEO
  });

  // If we have static SEO config, use that instead
  if (staticSEO) {
    return (
      <>
        <SEOHead
          title={staticSEO.title}
          description={staticSEO.description}
          keywords={staticSEO.keywords}
          ogImage={staticSEO.ogImage}
          noindex={staticSEO.noindex}
        />
        {children}
      </>
    );
  }

  // If dynamic SEO is disabled, just render children
  if (!enableDynamicSEO) {
    return <>{children}</>;
  }

  // Show loading state for dynamic SEO (optional)
  if (loading && !metaTags) {
    return (
      <>
        <SEOHead
          title={fallbackTitle}
          description={fallbackDescription}
        />
        {children}
      </>
    );
  }

  // Show error state with fallback SEO
  if (error) {
    console.warn('Dynamic SEO error:', error);
    return (
      <>
        <SEOHead
          title={fallbackTitle}
          description={fallbackDescription}
        />
        {children}
      </>
    );
  }

  // Dynamic SEO is handled by the hook, just render children
  return <>{children}</>;
};
