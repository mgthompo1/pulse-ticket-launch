import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  esbuild: false, // Disable esbuild completely
  plugins: [
    react({
      tsDecorators: true
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    emptyOutDir: true,
    // Skip all type checking
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      }
    }
  },
}));