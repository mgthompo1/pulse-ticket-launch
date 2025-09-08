import { supabase } from "@/integrations/supabase/client";

export interface DynamicMetaTags {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  keywords: string;
  structuredData?: object;
}

class MetaTagService {
  private cache = new Map<string, { data: DynamicMetaTags; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getDynamicMetaTags(path: string, params?: { eventId?: string; organizationId?: string }): Promise<DynamicMetaTags | null> {
    const cacheKey = `${path}-${JSON.stringify(params)}`;
    
    // Check cache first (client-side only to avoid hydration mismatch)
    const cached = this.cache.get(cacheKey);
    const now = typeof window !== 'undefined' ? Date.now() : 0;
    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {

      const { data, error } = await supabase.functions.invoke('dynamic-meta-tags', {
        body: {
          path,
          eventId: params?.eventId,
          organizationId: params?.organizationId
        },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error('Meta tags fetch error:', error);
        return null;
      }

      // Cache the result (client-side only)
      const timestamp = typeof window !== 'undefined' ? Date.now() : 0;
      this.cache.set(cacheKey, { data, timestamp });
      return data;
    } catch (error) {
      console.error('Meta tags service error:', error);
      return null;
    }
  }

  applyMetaTags(metaTags: DynamicMetaTags) {
    // Only apply meta tags in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Update document title
    document.title = metaTags.title;

    // Update or create meta tags
    this.updateMetaTag('description', metaTags.description);
    this.updateMetaTag('keywords', metaTags.keywords);
    
    // Open Graph tags
    this.updateMetaTag('og:title', metaTags.ogTitle, true);
    this.updateMetaTag('og:description', metaTags.ogDescription, true);
    this.updateMetaTag('og:image', metaTags.ogImage, true);
    this.updateMetaTag('og:url', metaTags.canonical, true);
    
    // Twitter tags
    this.updateMetaTag('twitter:title', metaTags.ogTitle);
    this.updateMetaTag('twitter:description', metaTags.ogDescription);
    this.updateMetaTag('twitter:image', metaTags.ogImage);
    
    // Canonical URL
    this.updateCanonicalUrl(metaTags.canonical);
    
    // Structured data
    if (metaTags.structuredData) {
      this.updateStructuredData(metaTags.structuredData);
    }
  }

  private updateMetaTag(name: string, content: string, isProperty = false) {
    if (typeof document === 'undefined') return;
    
    const attribute = isProperty ? 'property' : 'name';
    const selector = `meta[${attribute}="${name}"]`;
    
    let tag = document.querySelector(selector) as HTMLMetaElement;
    
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, name);
      document.head.appendChild(tag);
    }
    
    tag.setAttribute('content', content);
  }

  private updateCanonicalUrl(url: string) {
    if (typeof document === 'undefined') return;
    
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    
    canonicalLink.setAttribute('href', url);
  }

  private updateStructuredData(data: object) {
    if (typeof document === 'undefined') return;
    
    let structuredDataScript = document.querySelector('#dynamic-structured-data') as HTMLScriptElement;
    
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'dynamic-structured-data';
      structuredDataScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(structuredDataScript);
    }
    
    structuredDataScript.textContent = JSON.stringify(data);
  }

  // Clear cache when needed
  clearCache() {
    this.cache.clear();
  }

  // Preload meta tags for better performance
  async preloadMetaTags(routes: Array<{ path: string; params?: { eventId?: string; organizationId?: string } }>) {
    const promises = routes.map(route => 
      this.getDynamicMetaTags(route.path, route.params)
    );
    
    await Promise.allSettled(promises);
  }
}

export const metaTagService = new MetaTagService();
