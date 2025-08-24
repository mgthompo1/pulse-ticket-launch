import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

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
  ogImage
}) => {
  const location = useLocation();
  
  // Generate canonical URL based on current location if not provided
  const canonicalUrl = canonical || `https://www.ticketflo.org${location.pathname}`;
  
  // Remove any fragment identifiers from canonical URL for SEO best practices
  const cleanCanonicalUrl = canonicalUrl.split('#')[0];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL - prevents duplicate content issues */}
      <link rel="canonical" href={cleanCanonicalUrl} />
      
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
      
      {/* Open Graph tags */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:url" content={cleanCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage || "https://www.ticketflo.org/og-image.jpg"} />
      
      {/* Twitter tags */}
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage || "https://www.ticketflo.org/og-image.jpg"} />
      <meta name="twitter:card" content="summary_large_image" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};