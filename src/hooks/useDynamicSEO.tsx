import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { metaTagService, DynamicMetaTags } from '@/services/metaTagService';

interface UseDynamicSEOOptions {
  eventId?: string;
  organizationId?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  enabled?: boolean;
}

export const useDynamicSEO = (options: UseDynamicSEOOptions = {}) => {
  const location = useLocation();
  const [metaTags, setMetaTags] = useState<DynamicMetaTags | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    eventId,
    organizationId,
    fallbackTitle,
    fallbackDescription,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const loadMetaTags = async () => {
      setLoading(true);
      setError(null);

      try {
        const dynamicMetaTags = await metaTagService.getDynamicMetaTags(
          location.pathname,
          { eventId, organizationId }
        );

        if (dynamicMetaTags) {
          setMetaTags(dynamicMetaTags);
          metaTagService.applyMetaTags(dynamicMetaTags);
        } else if (fallbackTitle || fallbackDescription) {
          // Apply fallback meta tags
          const fallbackMetaTags: DynamicMetaTags = {
            title: fallbackTitle || document.title,
            description: fallbackDescription || '',
            ogTitle: fallbackTitle || document.title,
            ogDescription: fallbackDescription || '',
            ogImage: 'https://www.ticketflo.org/og-image.jpg',
            canonical: `https://www.ticketflo.org${location.pathname}`,
            keywords: 'TicketFlo, event ticketing, online tickets'
          };
          
          setMetaTags(fallbackMetaTags);
          metaTagService.applyMetaTags(fallbackMetaTags);
        }
      } catch (err) {
        console.error('Dynamic SEO error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meta tags');
      } finally {
        setLoading(false);
      }
    };

    loadMetaTags();
  }, [location.pathname, eventId, organizationId, fallbackTitle, fallbackDescription, enabled]);

  // Preload meta tags for better performance
  const preloadMetaTags = async (routes: Array<{ path: string; eventId?: string; organizationId?: string }>) => {
    try {
      await metaTagService.preloadMetaTags(
        routes.map(route => ({
          path: route.path,
          params: { eventId: route.eventId, organizationId: route.organizationId }
        }))
      );
    } catch (err) {
      console.error('Preload meta tags error:', err);
    }
  };

  return {
    metaTags,
    loading,
    error,
    preloadMetaTags
  };
};
