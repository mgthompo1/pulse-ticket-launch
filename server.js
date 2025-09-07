import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import compression from 'compression';
import sirv from 'sirv';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Create Express app
const app = express();

// Add compression middleware
app.use(compression());

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
  app.use(vite.ssrLoadModule);
}

// SSR middleware (catch-all)
app.use(async (req, res, next) => {
  const url = req.originalUrl;
  
  try {
    let template;
    let render;
    
    if (!isProduction) {
      // Development: read template and transform with Vite
      const vite = res.locals.vite;
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
      render = (await import('./dist/server/entry-server.js')).render;
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

    // If a bot is requesting a widget URL, enrich head with dynamic meta
    if (isBot && url.startsWith('/widget/')) {
      console.log('Dynamic meta attempt', {
        url,
        hasSUPABASE_URL: Boolean(SUPABASE_URL),
        hasSUPABASE_ANON_KEY: Boolean(SUPABASE_ANON_KEY)
      });
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          const eventId = url.split('/widget/')[1]?.split(/[?#]/)[0];
          const qs = new URLSearchParams({ path: url, eventId: eventId || '' }).toString();
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/dynamic-meta-tags?${qs}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            // Append Open Graph and Twitter meta tags
            const dynamicHead = `
              <title>${escapeHtml(data.title || '')}</title>
              <meta name="description" content="${escapeHtml(data.description || '')}" />
              <link rel="canonical" href="${escapeAttr(data.canonical || '')}" />
              <meta property="og:title" content="${escapeAttr(data.ogTitle || data.title || '')}" />
              <meta property="og:description" content="${escapeAttr(data.ogDescription || data.description || '')}" />
              <meta property="og:image" content="${escapeAttr(data.ogImage || '')}" />
              <meta property="og:url" content="${escapeAttr(data.canonical || '')}" />
              <meta name="twitter:title" content="${escapeAttr(data.ogTitle || data.title || '')}" />
              <meta name="twitter:description" content="${escapeAttr(data.ogDescription || data.description || '')}" />
              <meta name="twitter:image" content="${escapeAttr(data.ogImage || '')}" />
            `;
            headContent = `${headContent}\n${dynamicHead}`;
          } else {
            const text = await resp.text().catch(() => '');
            console.warn('Dynamic meta fetch non-200:', resp.status, text);
          }
        } catch (e) {
          console.warn('Dynamic meta fetch failed:', e?.message || e);
        }
      } else {
        console.warn('Dynamic meta skipped: missing SUPABASE_URL or SUPABASE_ANON_KEY');
      }
    }

    finalHtml = finalHtml.replace('<!--ssr-head-->', headContent);
    
    res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
    
  } catch (error) {
    console.error('SSR Error:', error);
    
    if (!isProduction && res.locals.vite) {
      // In development, let Vite fix the stack trace
      res.locals.vite.ssrFixStacktrace(error);
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

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📦 Mode: ${isProduction ? 'production' : 'development'}`);
  console.log(`🔍 SSR: Enabled for public pages`);
  console.log(`⚡ SPA: Enabled for dashboard pages`);
});
