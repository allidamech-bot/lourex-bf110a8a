import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

// Vite preview normally sends index.html for extensionless SPA URLs.
// Serve generated documents first, as the configured production filesystem routes do.
function publicSearchPreview(): Plugin {
  return {
    name: "lourex-public-search-preview",
    configurePreviewServer(server) {
      const output = path.resolve(server.config.root, server.config.build.outDir);
      const routing = JSON.parse(readFileSync(path.resolve(server.config.root, "vercel.json"), "utf8")) as { routes: {src?: string; dest?: string; status?: number; headers?: Record<string,string>; handle?: string; continue?: boolean}[] };
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const pathname = new URL(req.url || "/", "http://localhost").pathname;
        for (const route of routing.routes) {
          if (route.handle === "filesystem") {
            // Generated extensionless HTML is served by its explicit route below.
            if (pathname === "/" || (Boolean(path.extname(pathname)) && !pathname.includes("..") && existsSync(path.join(output, pathname)))) return next();
            continue;
          }
          if (!route.src || !new RegExp("^" + route.src + "$").test(pathname)) continue;
          for (const [key,value] of Object.entries(route.headers || {})) res.setHeader(key,value);
          if (route.continue) continue;
          if (route.status && route.status >= 300 && route.status < 400) { res.statusCode = route.status; return res.end(); }
          if (route.dest?.startsWith("/api/search-catalog?")) {
            // Browser preview uses the SPA detail view; runtime catalog HTTP is tested separately.
            if (pathname.startsWith("/products/")) { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(readFileSync(path.join(output, "spa.html"))); }
            return next();
          }
          if (route.dest) {
            const file = path.resolve(output, "." + route.dest);
            if (!file.startsWith(output + path.sep) || !existsSync(file)) return next();
            res.statusCode = route.status || 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.end(req.method === "HEAD" ? undefined : readFileSync(file));
          }
        }
        next();
      });
    },
  };
}


// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), publicSearchPreview()],
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
