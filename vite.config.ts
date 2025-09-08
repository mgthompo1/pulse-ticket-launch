// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  esbuild: false, // Disable esbuild completely
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
    // Skip all type checking
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      }
    }
  },
});