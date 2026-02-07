import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'script-defer',
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "ArcanoApp",
        short_name: "ArcanoApp",
        description: "ArcanoApp - A plataforma dos criadores do futuro. Prompts e arquivos com IA",
        // PWA Version 5.0.0 - Force update system with database control
        theme_color: "#552b99",
        background_color: "#fafafa",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}"],
        importScripts: ['/push-handler.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB
        clientsClaim: false,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        cacheId: "arcanoapp-v5.3.0",
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
            cacheName: "arcanoapp-images-v5.3.0",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 50, // 50 dias
              },
            },
          },
          // Cache para assets do WordPress (imagens)
          {
            urlPattern: /^https:\/\/(lp\.)?voxvisual\.com\.br\/.*\.(?:webp|jpg|jpeg|png|gif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "wordpress-images-v1",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
            },
          },
          // Cache para vídeos do WordPress (mp4)
          {
            urlPattern: /^https:\/\/(lp\.)?voxvisual\.com\.br\/.*\.mp4$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "wordpress-videos-v1",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Agrupa todos os ícones Lucide em um único chunk
          'lucide-icons': ['lucide-react'],
          // Agrupa bibliotecas de UI em um chunk
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-progress',
          ],
          // React e dependências core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'supabase': ['@supabase/supabase-js'],
          // i18n
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
}));
