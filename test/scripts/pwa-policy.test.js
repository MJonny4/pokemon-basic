import { describe, expect, test } from 'bun:test'
import { offlineAssets, offlineData, offlineDocuments, offlinePrecacheIgnores, preserveDocumentPaths, redirectDirectory, runtimeCaching } from '../../scripts/pwa-policy.mjs'
import { readOptions } from './guide-browser-utils.mjs'

describe('bounded offline delivery policy', () => {
    test('keeps one physical key per document without adding alias copies', () => {
        const entries = [{ url: 'index.html', revision: '1' }, { url: 'games/red-blue/index.html', revision: '2' }]
        expect(preserveDocumentPaths(entries)).toEqual({ manifest: entries, warnings: [] })
        expect(preserveDocumentPaths(entries).manifest).toBe(entries)
    })
    test('slashless document redirects preserve origin and query without mutation', () => {
        const url = new URL('https://example.test/pokemon-basic/games/red-blue?view=blue')
        const response = redirectDirectory({ url })
        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe('https://example.test/pokemon-basic/games/red-blue/?view=blue')
        expect(url.pathname).toBe('/pokemon-basic/games/red-blue')
    })
    test('precache is explicit, not all detail HTML or all item sprites', () => {
        expect(offlineDocuments).toEqual(['index.html', 'games/**/index.html', '{pokedex,moves,items,types,stats,team}/index.html'])
        expect(offlineAssets.some((pattern) => pattern.includes('items/'))).toBe(false)
        expect(offlineAssets).toContain('pwa-*.png')
        expect(offlineData).toEqual(['data/red-blue-opponents.json'])
        expect(offlinePrecacheIgnores).toContain('_astro/gen9-damage.*.js')
    })
    test('runtime routes are scoped and bounded, not an arbitrary GitHub cache', () => {
        const [directories, pages, images, sprites, calculator] = runtimeCaching
        expect(directories.urlPattern({ sameOrigin: true, request: { mode: 'navigate' }, url: new URL('https://example.test/pokemon-basic/games/red-blue') })).toBe(true)
        for (const path of ['/pokemon-basic/games/red-blue/', '/pokemon-basic/games/red-blue/index.html', '/pokemon-basic/items/potion.png', '/pokemon-basic', '/other']) {
            expect(directories.urlPattern({ sameOrigin: true, request: { mode: 'navigate' }, url: new URL('https://example.test' + path) })).toBe(false)
        }
        expect(pages.urlPattern({ sameOrigin: true, request: { mode: 'navigate' }, url: new URL('https://example.test/pokemon-basic/items/potion') })).toBe(true)
        expect(pages.urlPattern({ sameOrigin: false, request: { mode: 'navigate' }, url: new URL('https://other.test/pokemon-basic/') })).toBe(false)
        expect(pages.urlPattern({ sameOrigin: true, request: { mode: 'navigate' }, url: new URL('https://example.test/other/') })).toBe(false)
        expect(images.urlPattern({ sameOrigin: true, request: { destination: 'image' }, url: new URL('https://example.test/pokemon-basic/items/potion.png') })).toBe(true)
        expect(sprites.urlPattern.test('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png')).toBe(true)
        expect(sprites.urlPattern.test('https://raw.githubusercontent.com/unrelated/repo/main/file')).toBe(false)
        for (const rule of runtimeCaching.slice(1)) expect(rule.options.expiration.maxEntries).toBeGreaterThan(0)
        expect(pages.handler).toBe('NetworkFirst')
        expect(sprites.handler).toBe('StaleWhileRevalidate')
        expect(calculator.handler).toBe('CacheFirst')
        expect(calculator.urlPattern({ sameOrigin: true, request: { destination: 'script' }, url: new URL('https://example.test/pokemon-basic/_astro/gen9-damage.hash.js') })).toBe(true)
        expect(calculator.urlPattern({ sameOrigin: true, request: { destination: 'script' }, url: new URL('https://example.test/pokemon-basic/_astro/page.hash.js') })).toBe(false)
    })
})

describe('optional browser harness arguments', () => {
    test('normalizes valid origins and rejects unsafe or malformed inputs', () => {
        expect(readOptions(['--origin', 'http://localhost:4322/', '--runs', '2']).origin).toBe('http://localhost:4322')
        for (const args of [['--runs', '0'], ['--runs', '1.2'], ['--runs', '21'], ['--origin', 'file:///tmp'], ['--origin', 'https://example.test/path'], ['--origin', 'https://example.test/?x=1'], ['--unknown', 'x'], ['--output']]) {
            expect(() => readOptions(args)).toThrow()
        }
    })
})
