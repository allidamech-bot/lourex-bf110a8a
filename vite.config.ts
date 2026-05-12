import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("react/jsx") ||
              id.match(/node_modules[/\\]react[/\\]/) ||
              id.includes("scheduler") ||
              id.includes("use-sync-external-store")
            )
              return "vendor-react";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("framer-motion")) return "vendor-framer";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui") || id.includes("vaul") || id.includes("cmdk")) return "vendor-radix";
            if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) return "vendor-forms";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("date-fns") || id.includes("clsx") || id.includes("tailwind-merge") || id.includes("class-variance-authority")) return "vendor-utils";
          }
        },
      },
    },
  },
}));
