import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

const container = document.getElementById('root')!;

// Check if the page was server-side rendered
const isSSR = container.innerHTML.trim() !== '';

if (isSSR) {
  // Hydrate SSR content
  hydrateRoot(
    container,
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
} else {
  // Client-side render for SPA routes
  const root = createRoot(container);
  root.render(
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
}

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
