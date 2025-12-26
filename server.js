import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import compression from 'compression';
import sirv from 'sirv';
import fetch from 'node-fetch';
import { addAppleWalletRoutes } from './apple-wallet-routes.js';
import { sendHeartbeat, createIncident, kodoErrorHandler } from './kodo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Create Express app
const app = express();

// Add compression middleware
app.use(compression());

// Add global JSON parsing middleware
app.use(express.json({ limit: '10mb' }));

// Add Apple Wallet signing routes
addAppleWalletRoutes(app);

// Health check endpoint - pings Kodo heartbeat
app.get('/health', async (req, res) => {
  const start = Date.now();

  // Send heartbeat to Kodo (fire-and-forget)
  sendHeartbeat({
    status: 'up',
    response_time_ms: Date.now() - start,
    message: 'Health check passed',
  }).catch(() => {}); // Silent fail

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Dynamic sitemap generation
app.get('/sitemap.xml', async (req, res) => {
  const supabaseUrl = SUPABASE_URL || 'https://yoxsewbpoqxscsutqlcb.supabase.co';
  const supabaseKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';

  const baseUrl = 'https://www.ticketflo.org';
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/contact', priority: '0.8', changefreq: 'monthly' },
    { loc: '/privacy-policy', priority: '0.6', changefreq: 'yearly' },
    { loc: '/auth', priority: '0.7', changefreq: 'monthly' },
    { loc: '/support', priority: '0.7', changefreq: 'monthly' },
  ];

  let dynamicUrls = [];

  try {
    // Fetch published events
    const eventsResp = await fetch(
      `${supabaseUrl}/rest/v1/events?status=eq.published&select=id,updated_at,event_date`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (eventsResp.ok) {
      const events = await eventsResp.json();
      dynamicUrls = dynamicUrls.concat(
        events.map(event => ({
          loc: `/widget/${event.id}`,
          lastmod: event.updated_at ? event.updated_at.split('T')[0] : today,
          priority: '0.9',
          changefreq: 'daily'
        }))
      );
    }

    // Fetch active attractions
    const attractionsResp = await fetch(
      `${supabaseUrl}/rest/v1/attractions?status=eq.active&select=id,updated_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (attractionsResp.ok) {
      const attractions = await attractionsResp.json();
      dynamicUrls = dynamicUrls.concat(
        attractions.map(attraction => ({
          loc: `/attraction/${attraction.id}`,
          lastmod: attraction.updated_at ? attraction.updated_at.split('T')[0] : today,
          priority: '0.8',
          changefreq: 'weekly'
        }))
      );
    }
  } catch (error) {
    console.error('Error fetching dynamic sitemap data:', error);
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${dynamicUrls.map(page => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.send(xml);
});

// Serve static files
if (isProduction) {
  app.use('/', sirv(path.resolve(__dirname, 'dist/client'), {
    extensions: [],
    gzip: true,
    brotli: true
  }));
} else {
  // In development, Vite handles static files
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  app.use(vite.middlewares);
  
  // Store vite instance for SSR middleware
  app.locals.vite = vite;
}

// SSR middleware (catch-all) - Skip API routes
app.use('/', async (req, res, next) => {
  const url = req.originalUrl;

  // Skip SSR for API routes
  if (url.startsWith('/api/')) {
    return next();
  }
  
  try {
    let template;
    let render;
    
    if (!isProduction) {
      // Development: read template and transform with Vite
      const vite = req.app.locals.vite;
      template = fs.readFileSync(
        path.resolve(__dirname, 'index.html'),
        'utf-8'
      );
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
    } else {
      // Production: use built files
      template = fs.readFileSync(
        path.resolve(__dirname, 'dist/client/index.html'),
        'utf-8'
      );
      render = (await import('./dist/server/server.js')).render;
    }
    
    // Determine if this is a bot/crawler
    const userAgent = req.get('User-Agent') || '';
    const isBot = isBotUserAgent(userAgent);
    
    // Render the app
    const context = {
      url,
      userAgent,
      isBot
    };
    
    const { html, shouldSSR, helmet } = render(url, context);
    
    if (!shouldSSR) {
      // For SPA routes, return the template with minimal content
      const spaHtml = template
        .replace('<!--ssr-outlet-->', '')
        .replace('<!--ssr-head-->', '');
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end(spaHtml);
      return;
    }
    
    // For SSR routes, inject the rendered content
    let finalHtml = template.replace('<!--ssr-outlet-->', html);

    // Build head content from Helmet
    let headContent = '';
    if (helmet && helmet.helmet) {
      const { title, meta, link } = helmet.helmet;
      headContent = [
        title?.toString() || '',
        meta?.toString() || '',
        link?.toString() || ''
      ].join('\n');
    }

    // Enrich head for widget URLs with dynamic meta (run for all agents to ensure coverage)
    if (url.startsWith('/widget/')) {
      console.log('=== DYNAMIC META ATTEMPT ===');
      console.log('URL:', url);
      
      const supabaseUrl = SUPABASE_URL || 'https://yoxsewbpoqxscsutqlcb.supabase.co';
      // Use the current anon key from the client configuration
      const supabaseKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHNld2Jwb3F4c2NzdXRxbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzU4NDgsImV4cCI6MjA2ODAxMTg0OH0.CrW53mnoXiatBWePensSroh0yfmVALpcWxX2dXYde5k';
      
      try {
        const eventId = url.split('/widget/')[1]?.split(/[?#]/)[0];
        console.log('Extracted eventId:', eventId);
        
        if (eventId) {
          // Fetch event data directly from Supabase (only published events are publicly accessible)
          const eventResp = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${eventId}&status=eq.published&select=id,name,description,venue,event_date,featured_image_url,logo_url,organizations(name,logo_url)`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (eventResp.ok) {
            const events = await eventResp.json();
            const event = events[0];
            
            if (event) {
              console.log('Event found:', event.name);
              
              const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
              });
              
              const title = `${event.name} - Get Tickets | TicketFlo`;
              const description = event.description 
                ? `${event.description.substring(0, 150)}... Join us ${eventDate} at ${event.venue || 'TBD'}. Get your tickets now!`
                : `Join us for ${event.name} on ${eventDate} at ${event.venue || 'TBD'}. Get your tickets now on TicketFlo!`;
              
              // Prioritize event-specific images over organization logo
              console.log('Image options:', {
                featured_image_url: event.featured_image_url,
                logo_url: event.logo_url,
                org_logo: event.organizations?.logo_url
              });

              const ogImage = event.featured_image_url || event.logo_url || event.organizations?.logo_url || "https://www.ticketflo.org/og-image.jpg";
              console.log('Selected image:', ogImage);
              
              const canonical = `https://www.ticketflo.org/widget/${eventId}`;
              
              // Generate dynamic meta tags
              const dynamicHead = `
                <title>${escapeHtml(title)}</title>
                <meta name="description" content="${escapeHtml(description)}" />
                <link rel="canonical" href="${escapeAttr(canonical)}" />
                <meta property="og:title" content="${escapeAttr(event.name)}" />
                <meta property="og:description" content="${escapeAttr(description)}" />
                <meta property="og:image" content="${escapeAttr(ogImage)}" />
                <meta property="og:url" content="${escapeAttr(canonical)}" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${escapeAttr(event.name)}" />
                <meta name="twitter:description" content="${escapeAttr(description)}" />
                <meta name="twitter:image" content="${escapeAttr(ogImage)}" />
              `;
              headContent = `${headContent}\n${dynamicHead}`;
              console.log('✅ Dynamic meta tags added for:', event.name);
            } else {
              console.warn('❌ Event not found:', eventId);
            }
          } else {
            console.warn('❌ Failed to fetch event data:', eventResp.status);
          }
        } else {
          console.warn('❌ No eventId extracted from URL');
        }
      } catch (e) {
        console.error('❌ Dynamic meta generation failed:', e?.message || e);
        console.error('Stack:', e?.stack);
      }
    }

    finalHtml = finalHtml.replace('<!--ssr-head-->', headContent);
    
    // If we generated dynamic meta tags for widgets, remove conflicting default ones
    if (url.startsWith('/widget/') && headContent.includes('og:title')) {
      // Remove default og:title, og:description, og:image that conflict with dynamic ones
      finalHtml = finalHtml.replace(/<meta property="og:title" content="TicketFlo - Professional Event Ticketing Platform" \/>/g, '');
      finalHtml = finalHtml.replace(/<meta property="og:description" content="The complete solution for event organizers[^"]*" \/>/g, '');
      finalHtml = finalHtml.replace(/<meta property="og:image" content="https:\/\/www\.ticketflo\.org\/og-image\.jpg" \/>/g, '');
      finalHtml = finalHtml.replace(/<meta property="og:url" content="https:\/\/www\.ticketflo\.org\/" \/>/g, '');
    }
    
    res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
    
  } catch (error) {
    console.error('SSR Error:', error);

    if (!isProduction && req.app.locals.vite) {
      // In development, let Vite fix the stack trace
      req.app.locals.vite.ssrFixStacktrace(error);
    }

    // Report SSR errors to Kodo (production only)
    if (isProduction) {
      createIncident({
        title: `SSR Error: ${error.message?.substring(0, 50) || 'Unknown SSR error'}`,
        severity: 'major',
        status: 'investigating',
        message: `SSR rendering failed for ${url}\n\nError: ${error.message}\n\nStack: ${error.stack?.substring(0, 500) || 'No stack trace'}`,
        services: ['Website'],
      }).catch(() => {}); // Silent fail
    }

    // Fallback to SPA mode on error
    const template = isProduction
      ? fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
      : fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');

    const fallbackHtml = template
      .replace('<!--ssr-outlet-->', '')
      .replace('<!--ssr-head-->', '');

    res.status(500).set({ 'Content-Type': 'text/html' }).end(fallbackHtml);
  }
});

/**
 * Detect if user agent is a bot/crawler
 */
function isBotUserAgent(userAgent) {
  if (!userAgent) return false;
  
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /rogerbot/i,
    /linkedinbot/i,
    /embedly/i,
    /quora link preview/i,
    /showyoubot/i,
    /outbrain/i,
    /pinterest\/0\./i,
    /developers\.google\.com\/\+\/web\/snippet\//i,
    /slackbot/i,
    /vkshare/i,
    /w3c_validator/i,
    /redditbot/i,
    /applebot/i,
    /whatsapp/i,
    /flipboard/i,
    /tumblr/i,
    /bitlybot/i,
    /skypeuripreview/i,
    /nuzzel/i,
    /discordbot/i,
    /google page speed/i,
    /qwantify/i,
    /pinterestbot/i,
    /bitrix link preview/i,
    /xing-contenttabreceiver/i,
    /chrome-lighthouse/i,
    /telegrambot/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

// Kodo error handler middleware (must be after all routes)
app.use(kodoErrorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📦 Mode: ${isProduction ? 'production' : 'development'}`);
  console.log(`🔍 SSR: Enabled for public pages`);
  console.log(`⚡ SPA: Enabled for dashboard pages`);

  // Send startup heartbeat to Kodo
  if (isProduction) {
    sendHeartbeat({
      status: 'up',
      message: 'Server started successfully',
    }).then(() => {
      console.log('📊 Kodo heartbeat sent on startup');
    }).catch(() => {
      console.warn('⚠️ Failed to send Kodo startup heartbeat');
    });
  }
});
