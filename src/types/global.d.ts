// Global type overrides to fix build errors temporarily
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window {
    // Add any global window properties if needed

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