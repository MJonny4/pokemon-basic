// Keep physical index.html keys. Supplying this transform disables Astro's
// extensionless-key transform; native Workbox directoryIndex handles slashes.
export function preserveDocumentPaths(entries) {
    return { manifest: entries, warnings: [] }
}

// Serialized by Workbox: no references to build-time closures/imports.
export function redirectDirectory({ url }) {
    const directory = new URL(url.href)
    directory.pathname += '/'
    return Response.redirect(directory.href, 302)
}

export const offlineDocuments = [
    'index.html',
    'games/**/index.html',
    '{pokedex,moves,items,types,stats,team}/index.html',
]

export const offlineAssets = [
    'favicon.ico', 'icon.png', 'search.svg', 'apple-touch-icon-180x180.png',
    'pwa-*.png', 'maskable-icon-512x512.png', 'icons/*.png',
    'licenses/smogon-calc-mit.txt',
]

export const offlineData = ['data/red-blue-opponents.json']

// The optional Gen 9 calculator is loaded and cached only after use.
export const offlinePrecacheIgnores = ['_astro/gen9-damage.*.js']

/** @type {import('workbox-build').RuntimeCaching[]} */
export const runtimeCaching = [
    {
        // Slashless directory URLs redirect to their real cached index, rather
        // than storing three copies of every document or falling back to home.
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.mode === 'navigate' && url.pathname.startsWith('/pokemon-basic/') && !url.pathname.endsWith('/') && !/\.[^/]+$/.test(url.pathname),
        handler: redirectDirectory,
    },
    {
        // Detail documents are cached only after a visit, never all 3,766 pages.
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.mode === 'navigate' && url.pathname.startsWith('/pokemon-basic/'),
        handler: 'NetworkFirst',
        options: {
            cacheName: 'pokebasic-pages-v1',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [200] },
        },
    },
    {
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.destination === 'image' && url.pathname.startsWith('/pokemon-basic/items/'),
        handler: 'StaleWhileRevalidate',
        options: {
            cacheName: 'pokebasic-item-images-v1',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] },
        },
    },
    {
        // These repositories use mutable master URLs, NOT immutable commit URLs.
        urlPattern: /^https:\/\/raw\.githubusercontent\.com\/(?:PokeAPI\/sprites\/|msikma\/pokesprite\/|duiker101\/pokemon-type-svg-icons\/)/i,
        handler: 'StaleWhileRevalidate',
        options: {
            cacheName: 'pokebasic-sprites-v2',
            expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
        },
    },
    {
        urlPattern: ({ request, url, sameOrigin }) => sameOrigin && request.destination === 'script' && /^\/pokemon-basic\/_astro\/gen9-damage\.[^/]+\.js$/.test(url.pathname),
        handler: 'CacheFirst',
        options: {
            cacheName: 'pokebasic-gen9-calc-v1',
            expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] },
        },
    },
]
