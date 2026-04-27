// @ts-check
import { defineConfig } from 'astro/config';

import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://MJonny4.github.io',
  base: '/pokemon-basic',
  integrations: [alpinejs({ entrypoint: '/src/entrypoint' })],

  vite: {
    plugins: [tailwindcss()]
  }
});