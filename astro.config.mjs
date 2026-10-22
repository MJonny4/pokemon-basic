// @ts-check
import { defineConfig } from 'astro/config';

import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';
import { offlineAssets, offlineData, offlineDocuments, offlinePrecacheIgnores, preserveDocumentPaths, runtimeCaching } from './scripts/pwa-policy.mjs';

const BASE = '/pokemon-basic';

// https://astro.build/config
export default defineConfig({
  site: 'https://MJonny4.github.io',
  base: BASE,
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    AstroPWA({
      // Do not force-reload a tab containing unsaved team/guide edits.
      registerType: 'prompt',
      includeAssets: offlineAssets,
      manifest: {
        name: 'PokeBasic',
        short_name: 'PokeBasic',
        description: 'A fan-made Pokédex, move/item dex, team builder, and battle simulator.',
        theme_color: '#FF3B30',
        background_color: '#000000',
        display: 'standalone',
        start_url: `${BASE}/`,
        scope: `${BASE}/`,
        icons: [
          { src: `${BASE}/pwa-64x64.png`, sizes: '64x64', type: 'image/png' },
          { src: `${BASE}/pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}/pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${BASE}/maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: [...offlineDocuments, ...offlineData, '_astro/**/*.{js,css,woff2,png,svg}'],
        globIgnores: offlinePrecacheIgnores,
        // Never serve the homepage as a successful response for another route.
        navigateFallback: null,
        manifestTransforms: [preserveDocumentPaths],
        // Every route/asset is static and query-independent. Hashed filenames
        // still identify asset revisions; query-only links work offline too.
        ignoreURLParametersMatching: [/.*/],
        clientsClaim: true,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        importScripts: ['pwa-runtime-cache.js'],
        runtimeCaching,
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
