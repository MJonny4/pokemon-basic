// Build-time RSS aggregation for the home page news hub.
// Runs once per `astro build` — the scheduled GitHub Action rebuild keeps it fresh.
// Serebii offers no RSS feed (deliberate, ad-revenue funded), so the two
// sources are Bulbanews (daily volume) and PokémonDB (major announcements).
import savedBulbanews from './data/bulbanews-fallback.json'

export type NewsSource = 'Bulbanews' | 'PokémonDB'

export interface NewsItem {
    title: string
    link: string
    date: Date
    source: NewsSource
    /** Plain-text summary trimmed to card length, if the feed provided a body */
    excerpt: string | null
    /** First usable image URL found in the item body, if any */
    image: string | null
}

export interface NewsResult {
    items: NewsItem[]
    /** Present when the live Bulbanews feed was unavailable during the build. */
    bulbanewsSavedAt: Date | null
}

const FEEDS: { source: NewsSource; urls: string[] }[] = [
    { source: 'Bulbanews', urls: ['https://bulbagarden.net/forums/news/index.rss', 'https://www.bulbagarden.net/forums/news/index.rss'] },
    { source: 'PokémonDB', urls: ['https://pokemondb.net/news/feed'] },
]

// The page shows 5 up front and reveals the rest behind "Load more".
const MAX_ITEMS = 20
// PokémonDB posts ~monthly while Bulbanews posts several times a day.
// Reserve slots in both the full list and the first five visible cards.
const MIN_PER_SOURCE = 2

function decodeEntities(s: string): string {
    return s
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}

function tagContent(itemXml: string, tag: string): string | null {
    const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
    if (!m) return null
    let value = m[1].trim()
    const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
    if (cdata) value = cdata[1].trim()
    return decodeEntities(value)
}

// Bulbanews lazy-loads images (real URL in data-src, src is a base64 placeholder);
// PokémonDB uses plain <img src>. Skip data: URIs either way.
function extractImage(html: string): string | null {
    const lazy = html.match(/<img[^>]+data-src="(https?:\/\/[^"]+)"/i)
    if (lazy) return lazy[1]
    for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/gi)) {
        if (m[1].startsWith('http')) return m[1]
    }
    return null
}

function extractExcerpt(html: string, max = 180): string | null {
    const text = decodeEntities(html.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
    if (!text) return null
    if (text.length <= max) return text
    return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

function parseFeed(source: NewsSource, xml: string): NewsItem[] {
    const items: NewsItem[] = []
    for (const match of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
        const raw = match[0]
        const title = tagContent(raw, 'title')
        const link = tagContent(raw, 'link')
        const pubDate = tagContent(raw, 'pubDate')
        const date = pubDate ? new Date(pubDate) : null
        const body = tagContent(raw, 'content:encoded') ?? tagContent(raw, 'description')
        if (title && link && date && !Number.isNaN(date.getTime())) {
            items.push({
                title,
                link,
                date,
                source,
                excerpt: body ? extractExcerpt(body) : null,
                image: body ? extractImage(body) : null,
            })
        }
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
}

async function fetchFeed(source: NewsSource, urls: string[], fetcher: typeof fetch): Promise<NewsItem[]> {
    const failures: string[] = []
    for (const url of urls) {
        try {
            const res = await fetcher(url, {
                headers: { 'user-agent': 'PokeBasic build (https://github.com/MJonny4)' },
                signal: AbortSignal.timeout(15_000),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const items = parseFeed(source, await res.text())
            if (!items.length) throw new Error('no usable RSS items')
            return items
        } catch (err) {
            failures.push(`${url}: ${err instanceof Error ? err.message : String(err)}`)
        }
    }
    console.warn(`[news] ${source} feed unavailable: ${failures.join('; ')}`)
    return []
}

function savedBulbanewsItems(): NewsItem[] {
    return savedBulbanews.items.map((item) => ({
        ...item,
        date: new Date(item.date),
        source: 'Bulbanews',
        excerpt: null,
        image: null,
    }))
}

export async function fetchNews(fetcher: typeof fetch = fetch): Promise<NewsResult> {
    const liveFeeds = await Promise.all(FEEDS.map((f) => fetchFeed(f.source, f.urls, fetcher)))
    const bulbanewsSavedAt = liveFeeds[0].length ? null : new Date(savedBulbanews.savedAt)
    const feeds = [liveFeeds[0].length ? liveFeeds[0] : savedBulbanewsItems(), liveFeeds[1]]
    const reserved = feeds.flatMap((items) => items.slice(0, MIN_PER_SOURCE))
    const rest = feeds
        .flatMap((items) => items.slice(MIN_PER_SOURCE))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    const selected = [...reserved, ...rest].slice(0, MAX_ITEMS)
    const remaining = selected.filter((item) => !reserved.includes(item)).sort((a, b) => b.date.getTime() - a.date.getTime())
    const firstFive = [...reserved, ...remaining.slice(0, Math.max(0, 5 - reserved.length))]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    return {
        items: [...firstFive, ...remaining.slice(Math.max(0, 5 - reserved.length))],
        bulbanewsSavedAt,
    }
}

export function formatNewsDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
