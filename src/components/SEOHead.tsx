import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  alternatePages?: { hreflang: string; href: string; }[];
  structuredData?: object;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterSite?: string;
  twitterCreator?: string;
  author?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "TicketFlo - Professional Event Ticketing Platform",
  description = "Create, manage, and sell tickets for your events with TicketFlo. Features include seat selection, payment processing, real-time analytics, and more.",
  canonical,
  noindex = false,
  alternatePages = [],
  structuredData,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  twitterSite = "@ticketflo",
  twitterCreator = "@ticketflo",
  author = "TicketFlo"
}) => {
  const location = useLocation();
  
  // URL validation function
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  // Memoized computed values for performance
  const computedValues = useMemo(() => {
    // Generate canonical URL with validation
    const fallbackCanonical = `https://www.ticketflo.org${location.pathname}`;
    const canonicalUrl = canonical && isValidUrl(canonical) 
      ? canonical 
      : fallbackCanonical;
    
    // Remove any fragment identifiers from canonical URL for SEO best practices
    const cleanCanonicalUrl = canonicalUrl.split('#')[0];
    
    // Optimize title length for search results (recommended max 60 characters)
    const optimizedTitle = title.length > 60 
      ? `${title.substring(0, 57)}...` 
      : title;
    
    // Default OG image with multiple fallbacks
    const getFinalOgImage = (): string => {
      if (ogImage) return ogImage;
      
      // Try primary fallback (create this file for production)
      const primaryFallback = "https://www.ticketflo.org/og-image.jpg";
      
      // Secondary fallback using existing large favicon
      const secondaryFallback = "https://www.ticketflo.org/favicon-large.png";
      
      // For now, return primary fallback (should be created)
      return primaryFallback;
    };
    
    const finalOgImage = getFinalOgImage();
    
    return {
      cleanCanonicalUrl,
      optimizedTitle,
      finalOgImage
    };
  }, [canonical, location.pathname, title, ogImage]);

  return (
    <Helmet>
      {/* Essential Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="author" content={author} />
      
      <title>{computedValues.optimizedTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL - prevents duplicate content issues */}
      <link rel="canonical" href={computedValues.cleanCanonicalUrl} />
      
      {/* Robots meta tag */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}
      
      {/* Alternate pages for internationalization */}
      {alternatePages.map((alt, index) => (
        <link 
          key={index}
          rel="alternate" 
          hrefLang={alt.hreflang} 
          href={alt.href} 
        />
      ))}
      
      {/* Enhanced Open Graph tags */}
      <meta property="og:title" content={ogTitle || computedValues.optimizedTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:url" content={computedValues.cleanCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="TicketFlo" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={computedValues.finalOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      {computedValues.finalOgImage && (
        <meta property="og:image:alt" content={`${ogTitle || computedValues.optimizedTitle} - TicketFlo`} />
      )}
      
      {/* Enhanced Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={ogTitle || computedValues.optimizedTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={computedValues.finalOgImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};