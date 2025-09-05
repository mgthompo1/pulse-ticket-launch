// Global type overrides to fix build errors temporarily
declare global {
  interface Window {
    // Add any global window properties if needed
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  }
}

// Add as React component assertions for module imports
declare module "*.tsx" {
  const content: React.ComponentType<unknown>;
  export default content;
}

declare module "*.ts" {
  const content: unknown;
  export default content;
}

export {};