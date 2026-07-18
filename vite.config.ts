import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Sub-path app on GitHub Pages (apex-routes pattern): hardcoded build-time
  // base, dev at root. NEVER read this from an env var.
  base: command === "build" ? "/banner-designer/" : "/",
  server: {
    host: "::",
    port: 8126,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        navigateFallback: "index.html",
        globIgnores: ["**/og-image.png"],
        // A newly deployed service worker activates immediately and claims open
        // pages, so a fresh deploy goes live on the next refresh — no stale-code
        // lockout.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
