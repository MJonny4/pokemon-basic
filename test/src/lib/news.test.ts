import { describe, expect, test } from 'bun:test'
import { fetchNews } from '../../../src/lib/news'
import savedBulbanews from '../../../src/lib/data/bulbanews-fallback.json'

function rss(prefix: string, startDay: number, count: number): Response {
    const items = Array.from({ length: count }, (_, i) => `
        <item>
            <title>${prefix} story ${i + 1}</title>
            <link>https://example.com/${prefix}/${i + 1}</link>
            <pubDate>${new Date(Date.UTC(2027, 0, startDay - i)).toUTCString()}</pubDate>
            <description>Story summary</description>
        </item>`).join('')
    return new Response(`<rss><channel>${items}</channel></rss>`)
}

function mockFetch(reply: (url: string) => Response): typeof fetch {
    return (async (input: RequestInfo | URL) => reply(String(input))) as typeof fetch
}

describe('build-time franchise news', () => {
    test('shows both working sources among the first five cards', async () => {
        const result = await fetchNews(mockFetch((url) => rss(url.includes('bulbagarden') ? 'bulba' : 'db', url.includes('bulbagarden') ? 10 : 30, 8)))
        expect(result.bulbanewsSavedAt).toBeNull()
        expect(result.items).toHaveLength(16)
        expect(result.items.slice(0, 5).filter((item) => item.source === 'Bulbanews')).toHaveLength(2)
        expect(result.items.slice(0, 5).filter((item) => item.source === 'PokémonDB')).toHaveLength(3)
        expect(new Set(result.items.map((item) => item.link)).size).toBe(result.items.length)
    })

    test('tries the alternate official Bulbanews host before using saved headlines', async () => {
        const tried: string[] = []
        const result = await fetchNews(mockFetch((url) => {
            tried.push(url)
            if (url === 'https://bulbagarden.net/forums/news/index.rss') return new Response('', { status: 503 })
            return rss(url.includes('bulbagarden') ? 'bulba' : 'db', 30, 2)
        }))
        expect(tried).toContain('https://www.bulbagarden.net/forums/news/index.rss')
        expect(result.bulbanewsSavedAt).toBeNull()
        expect(result.items.some((item) => item.source === 'Bulbanews')).toBeTrue()
    })

    test('keeps dated Bulbanews headlines visible when both live hosts fail', async () => {
        const result = await fetchNews(mockFetch((url) => url.includes('bulbagarden')
            ? new Response('', { status: 503 })
            : rss('db', 30, 8)))
        expect(result.bulbanewsSavedAt?.toISOString()).toBe(new Date(savedBulbanews.savedAt).toISOString())
        expect(result.items.slice(0, 5).filter((item) => item.source === 'Bulbanews')).toHaveLength(2)
        expect(result.items.some((item) => item.link === savedBulbanews.items[0].link)).toBeTrue()
    })
})
