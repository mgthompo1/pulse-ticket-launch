import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';

// Type definitions for SSR mocks
type MockWindow = {
  location: { href: string; origin: string; pathname: string };
  history: { pushState: () => void; replaceState: () => void };
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => void;
  getComputedStyle: () => Record<string, unknown>;
  matchMedia: () => { matches: boolean; addListener: () => void; removeListener: () => void };
};

type MockDocument = {
  createElement: () => Record<string, unknown>;
  getElementById: () => null;
  querySelector: () => null;
  querySelectorAll: () => never[];
  addEventListener: () => void;
  removeEventListener: () => void;
  head: { appendChild: () => void };
  body: { appendChild: () => void };
  title: string;
};

type MockStorage = {
  getItem: () => null;
  setItem: () => void;
  removeItem: () => void;
  clear: () => void;
};

// Mock browser APIs for SSR
if (typeof window === 'undefined') {
  global.window = {
    location: { href: '', origin: '', pathname: '/' },
    history: { pushState: () => {}, replaceState: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    getComputedStyle: () => ({}),
    matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} })
  } as unknown as MockWindow & typeof globalThis;

  global.document = {
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    title: ''
  } as unknown as MockDocument & Document;

  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  } as unknown as MockStorage & Storage;
  
  global.sessionStorage = global.localStorage;
  
  // Make navigator non-writable to prevent override attempts
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'SSR',
      language: 'en-US',
      languages: ['en-US', 'en'],
      onLine: true,
      platform: 'SSR'
    },
    writable: false,
    configurable: false
  });
}

import App from './App';

export interface SSRContext {
  url: string;
  userAgent?: string;
  isBot?: boolean;
}

export function render(url: string, context: SSRContext = { url }) {
  const helmetContext = {};
  
  // Determine if this should be SSR'd based on the route
  const shouldSSR = shouldServerSideRender(url, context);
  
  if (!shouldSSR) {
    // Return minimal HTML for SPA routes
    return {
      html: '',
      shouldSSR: false,
      helmet: null
    };
  }

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );

  return {
    html,
    shouldSSR: true,
    helmet: helmetContext
  };
}

/**
 * Determines if a route should be server-side rendered
 * Public pages = SSR for SEO
 * Dashboard/admin pages = SPA for performance
 */
function shouldServerSideRender(url: string, context: SSRContext): boolean {
  const path = new URL(url, 'http://localhost').pathname;
  
  // Always SSR for bots/crawlers
  if (context.isBot || isBotUserAgent(context.userAgent)) {
    return true;
  }
  
  // SSR routes (public pages that need SEO)
  const ssrRoutes = [
    '/',                    // Landing page
    '/contact',             // Contact page
    '/privacy-policy',      // Privacy policy
    '/support',            // Support page
    '/events/',            // Event pages
    '/org/',               // Organization pages
    '/widget/',            // Ticket widget (ENABLED for social sharing)
    '/attraction/',        // Attraction widget (ENABLED for social sharing)
    '/ticket-widget',      // Legacy ticket widget
    '/attraction-widget',  // Legacy attraction widget
  ];
  
  // Check if current path matches SSR routes
  const shouldSSR = ssrRoutes.some(route => {
    if (route.endsWith('/')) {
      return path.startsWith(route);
    }
    return path === route || path.startsWith(route + '/');
  });
  
  // SPA routes (authenticated/admin pages)
  const spaRoutes = [
    '/dashboard',          // Organization dashboard
    '/admin',             // Admin pages
    '/auth',              // Authentication
    '/master-admin',      // Master admin
    '/payment-success',   // Payment callbacks
    '/payment-failed',
    '/payment-cancelled',
    '/xero-callback',
    '/linkedin-callback',
    '/facebook-callback'
  ];
  
  // Force SPA for authenticated routes
  const shouldBeSPA = spaRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  );
  
  if (shouldBeSPA) {
    return false;
  }
  
  return shouldSSR;
}

/**
 * Detect if user agent is a bot/crawler
 */
function isBotUserAgent(userAgent?: string): boolean {
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
