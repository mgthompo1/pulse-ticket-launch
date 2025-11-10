import React from 'react';
import { hydrateRoot, createRoot, Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';
import './App.css';
import App from './App';
import { initSentry } from './lib/sentry';
import { ErrorFallback } from './components/ErrorFallback';

// Initialize Sentry
initSentry();

const container = document.getElementById('root')!;

// Check if the page was server-side rendered by requiring an actual element child
// Note: index.html includes an SSR comment placeholder <!--ssr-outlet--> which should not trigger hydration
const isSSR = container.firstElementChild !== null;

// Reuse a single root across HMR/re-executions to avoid React warnings
const w = window as unknown as { __appRoot?: Root };

const appTree = (
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);

if (w.__appRoot) {
  // Update existing root
  w.__appRoot.render(appTree);
} else {
  if (isSSR) {
    // Hydrate SSR content
    w.__appRoot = hydrateRoot(container, appTree);
  } else {
    // Client-side render for SPA routes
    w.__appRoot = createRoot(container);
    w.__appRoot.render(appTree);
  }
}

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
