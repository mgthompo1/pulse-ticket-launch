// @ts-nocheck
import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import './App.css';
import App from './App';

const container = document.getElementById('root')!;

// Check if the page was server-side rendered by requiring an actual element child
// Note: index.html includes an SSR comment placeholder <!--ssr-outlet--> which should not trigger hydration
const isSSR = container.firstElementChild !== null;

// Reuse a single root across HMR/re-executions to avoid React warnings
const w = window as unknown as { __appRoot?: any };

const appTree = (
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>
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
