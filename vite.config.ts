import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_APP_NAME white-labels the PWA manifest per deployment — defaults to
  // a neutral "CRM" so an unconfigured deployment never shows another
  // company's name (see .env.example and src/lib/appName.ts, which mirrors
  // this same default for the in-app title).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const appName = env.VITE_APP_NAME || 'CRM'
  // Most home-screen launchers truncate short_name around 12 characters.
  const appShortName = appName.length > 12 ? appName.slice(0, 12) : appName

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // The default auto-injected registerSW.js only calls
        // navigator.serviceWorker.register() once — it never checks for a
        // newer service worker or reloads the page when one activates, so an
        // already-open tab (or even a fresh reload, depending on browser SW
        // update timing) can keep serving a stale bundle indefinitely after a
        // deploy. injectRegister: false + the explicit registerSW() call in
        // main.tsx replaces that with a real check-and-reload.
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'offline.html'],
        manifest: {
          name: appName,
          short_name: appShortName,
          description: `${appName} — customers, subscriptions, billing and support in one app.`,
          theme_color: '#0B1220',
          background_color: '#0B1220',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // The SPA shell (precached index.html) is the fallback for every
          // navigation once installed — that's what makes routes work at all
          // while offline. `/offline.html` stays a plain precached page for
          // the one case that can't be helped: a first-ever visit with no
          // connection, before any service worker exists to serve the shell.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/offline\.html$/],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [
            {
              // A read-only cached view of today's tasks and assigned tickets
              // (§6): last-known-good rows are served instantly and refreshed
              // in the background, falling back to cache when offline.
              urlPattern: ({ url }: { url: URL }) => /\/rest\/v1\/(tasks|tickets)$/.test(url.pathname),
              handler: 'NetworkFirst',
              method: 'GET',
              options: {
                cacheName: 'hzx-today-cache',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
