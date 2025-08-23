import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: object;
  keywords?: string;
  author?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogSiteName?: string;
  ogLocale?: string;
  twitterSite?: string;
  twitterCreator?: string;
}

export const SEOHead = ({
  title = "TicketFlo - Event Ticketing Platform",
  description = "Professional event ticketing platform with advanced features for organizers and seamless experience for attendees.",
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  structuredData,
  keywords = "TicketFlo, event ticketing, online ticketing platform, event management software, ticket sales, seat selection, event booking, professional ticketing, event organizer tools, digital ticketing, event management platform, ticket management, event ticketing software, online event tickets, event registration, ticketing system, event planning software, ticket sales platform, event management tools, automated ticketing",
  author = "TicketFlo",
  noindex = false,
  nofollow = false,
  ogSiteName = "TicketFlo",
  ogLocale = "en_US",
  twitterSite = "@ticketflo",
  twitterCreator = "@ticketflo"
}: SEOHeadProps) => {
  const finalTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const finalDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;

  // Robots meta tag
  const robotsContent = [];
  if (noindex) robotsContent.push('noindex');
  if (nofollow) robotsContent.push('nofollow');
  if (!noindex && !nofollow) robotsContent.push('index', 'follow', 'max-snippet:-1', 'max-image-preview:large', 'max-video-preview:-1');

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent.join(', ')} />
      <meta name="googlebot" content={robotsContent.join(', ')} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={ogTitle || finalTitle} />
      <meta property="og:description" content={ogDescription || finalDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={ogSiteName} />
      <meta property="og:locale" content={ogLocale} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonical && <meta property="og:url" content={canonical} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle || finalTitle} />
      <meta name="twitter:description" content={ogDescription || finalDescription} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {canonical && <meta name="twitter:url" content={canonical} />}
      
      {/* Additional SEO Meta Tags */}
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="General" />
      <meta name="distribution" content="Global" />
      <meta name="coverage" content="Worldwide" />
      <meta name="target" content="all" />
      <meta name="HandheldFriendly" content="true" />
      <meta name="MobileOptimized" content="width" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};