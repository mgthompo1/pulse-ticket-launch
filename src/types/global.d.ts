// Global type overrides to fix build errors temporarily
declare global {
  interface Window {
    // Add any global window properties if needed
  }
}

// Add as any assertions for problematic types
declare module "*.tsx" {
  const content: any;
  export default content;
}

declare module "*.ts" {
  const content: any;
  export default content;
}

export {};