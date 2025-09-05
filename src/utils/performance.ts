import React from 'react';

// Performance optimization utilities

export const preloadRoute = (routeModule: () => Promise<{ default: React.ComponentType<unknown> }>) => {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = routeModule.toString();
  document.head.appendChild(link);
};

export const lazyLoad = (importFunc: () => Promise<{ default: React.ComponentType<unknown> }>) => {
  return React.lazy(() => 
    importFunc().then(module => ({ 
      default: module.default || module 
    }))
  );
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Image lazy loading observer
export const createImageObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
  return new IntersectionObserver(callback, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });
};

export const optimizeImage = (src: string, width?: number, height?: number) => {
  const img = new Image();
  if (width) img.width = width;
  if (height) img.height = height;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = src;
  return img;
};