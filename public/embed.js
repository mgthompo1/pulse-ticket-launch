/**
 * TicketFlo Widget Embed Script
 * One-line embed system for TicketFlo event widgets
 * 
 * Usage:
 * <script src="https://widget.ticketflo.org/embed.js" 
 *         data-event-id="your-event-id"
 *         data-theme="light"
 *         data-primary="#2563eb">
 * </script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_BASE_URL = 'https://ticketflo.org'; // Update with your domain
  const DEFAULT_CONFIG = {
    theme: 'light',
    primary: '#2563eb',
    locale: 'en-US',
    currency: 'USD',
    branding: 'true'
  };

  // Get the current script element
  const getCurrentScript = () => {
    return document.currentScript || 
           document.querySelector('script[src*="embed.js"]') ||
           Array.from(document.scripts).find(s => s.src.includes('embed.js'));
  };

  // Parse configuration from data attributes
  const parseConfig = (script) => {
    const config = { ...DEFAULT_CONFIG };
    
    // Extract all data-* attributes
    Array.from(script.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        config[key] = attr.value;
      }
    });

    return config;
  };

  // Validate required configuration
  const validateConfig = (config) => {
    if (!config.eventId) {
      throw new Error('TicketFlo Widget: data-event-id is required');
    }
    return true;
  };

  // Build widget URL with parameters
  const buildWidgetUrl = (config) => {
    const params = new URLSearchParams({
      embed: 'true',
      theme: config.theme,
      primary: encodeURIComponent(config.primary),
      locale: config.locale,
      currency: config.currency,
      branding: config.branding
    });

    return `${WIDGET_BASE_URL}/beta-widget/${config.eventId}?${params.toString()}`;
  };

  // Create responsive iframe
  const createIframe = (url, container) => {
    const iframe = document.createElement('iframe');
    
    // Set iframe attributes
    iframe.src = url;
    iframe.style.cssText = `
      width: 100%;
      max-width: 400px;
      min-height: 600px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      background: #f9fafb;
    `;
    
    // Accessibility attributes
    iframe.title = 'Event Ticket Widget';
    iframe.allow = 'payment';
    iframe.setAttribute('loading', 'lazy');
    
    // Security attributes
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation');
    
    return iframe;
  };

  // Handle iframe messaging for height adjustment
  const setupMessaging = (iframe) => {
    const handleMessage = (event) => {
      // Verify origin for security
      if (!event.origin.includes('ticketflo.org')) return;
      
      if (event.data.type === 'ticketflo-widget-height') {
        iframe.style.height = `${event.data.height}px`;
      }
      
      if (event.data.type === 'ticketflo-widget-redirect') {
        window.open(event.data.url, '_blank', 'noopener,noreferrer');
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Cleanup function
    return () => window.removeEventListener('message', handleMessage);
  };

  // Create container with loading state
  const createContainer = () => {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    // Loading state
    container.innerHTML = `
      <div style="text-align: center; color: #6b7280;">
        <div style="margin-bottom: 12px;">
          <div style="
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            margin: 0 auto;
            animation: spin 1s linear infinite;
          "></div>
        </div>
        <p>Loading event tickets...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    return container;
  };

  // Error handling
  const showError = (container, error) => {
    container.innerHTML = `
      <div style="
        max-width: 400px;
        padding: 20px;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fef2f2;
        color: #dc2626;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">Widget Error</h3>
        <p style="margin: 0; font-size: 14px;">${error.message}</p>
        <a href="${WIDGET_BASE_URL}" style="
          display: inline-block;
          margin-top: 12px;
          padding: 8px 16px;
          background: #dc2626;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
        ">View Events</a>
      </div>
    `;
  };

  // Main initialization function
  const initWidget = () => {
    try {
      const script = getCurrentScript();
      if (!script) {
        throw new Error('Could not find embed script element');
      }

      const config = parseConfig(script);
      validateConfig(config);

      const container = createContainer();
      const widgetUrl = buildWidgetUrl(config);
      
      // Insert container after the script
      script.parentNode.insertBefore(container, script.nextSibling);

      // Create and load iframe
      setTimeout(() => {
        try {
          const iframe = createIframe(widgetUrl, container);
          const cleanup = setupMessaging(iframe);
          
          // Replace loading state with iframe
          container.innerHTML = '';
          container.appendChild(iframe);
          
          // Handle iframe load events
          iframe.onload = () => {
            console.log('TicketFlo widget loaded successfully');
          };
          
          iframe.onerror = () => {
            throw new Error('Failed to load widget. Please check your connection.');
          };
          
          // Store cleanup function for potential later use
          window._ticketfloCleanup = cleanup;
          
        } catch (iframeError) {
          showError(container, iframeError);
        }
      }, 100);

    } catch (error) {
      console.error('TicketFlo Widget Error:', error);
      
      // Try to show error in container if possible
      const script = getCurrentScript();
      if (script && script.parentNode) {
        const errorContainer = createContainer();
        script.parentNode.insertBefore(errorContainer, script.nextSibling);
        showError(errorContainer, error);
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Expose global API (optional)
  window.TicketFloWidget = {
    version: '1.0.0',
    init: initWidget,
    
    // Allow manual widget creation
    create: (elementId, config) => {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }
      
      const widgetUrl = buildWidgetUrl({ ...DEFAULT_CONFIG, ...config });
      const iframe = createIframe(widgetUrl);
      
      element.appendChild(iframe);
      return setupMessaging(iframe);
    }
  };

})();