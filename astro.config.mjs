// @ts-check
import { defineConfig } from 'astro/config';

import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';

const BASE = '/pokemon-basic';

// https://astro.build/config
export default defineConfig({
  site: 'https://MJonny4.github.io',
  base: BASE,
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    AstroPWA({
      registerType: 'autoUpdate',
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
        // Sprite CDNs are content-addressed by commit path — never change once
        // fetched, so cache-and-serve beats revalidating on every visit.
        runtimeCaching: [{
          urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'sprite-cache',
            expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
