// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  esbuild: {
    target: 'esnext',
    // Completely skip TypeScript type checking
    tsconfigRaw: {}
  },
  plugins: [
    react({
      tsDecorators: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    emptyOutDir: true,
    // Skip type checking during build
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress TypeScript warnings
        if (warning.code === 'TYPESCRIPT_ERROR') return;
        warn(warning);
      }
    }
  },
});