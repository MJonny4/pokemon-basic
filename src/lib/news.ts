// Build-time RSS aggregation for the home page news hub.
// Runs once per `astro build` — the scheduled GitHub Action rebuild keeps it fresh.
// Serebii offers no RSS feed (deliberate, ad-revenue funded), so the two
// sources are Bulbanews (daily volume) and PokémonDB (major announcements).

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

const FEEDS: { source: NewsSource; url: string }[] = [
    { source: 'Bulbanews', url: 'https://bulbagarden.net/forums/news/index.rss' },
    { source: 'PokémonDB', url: 'https://pokemondb.net/news/feed' },
]

// The page shows 5 up front and reveals the rest behind "Load more".
const MAX_ITEMS = 20
// PokémonDB posts ~monthly while Bulbanews posts several times a day —
// without reserved slots the quiet feed would never appear.
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

async function fetchFeed(source: NewsSource, url: string): Promise<NewsItem[]> {
    try {
        const res = await fetch(url, {
            headers: { 'user-agent': 'PokeBasic build (https://github.com/MJonny4)' },
            signal: AbortSignal.timeout(15_000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const xml = await res.text()

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
    } catch (err) {
        // A dead feed must never fail the build — the page renders without it.
        console.warn(`[news] ${source} feed failed, skipping:`, err)
        return []
    }
}

export async function fetchNews(): Promise<NewsItem[]> {
    const feeds = await Promise.all(FEEDS.map((f) => fetchFeed(f.source, f.url)))
    const reserved = feeds.flatMap((items) => items.slice(0, MIN_PER_SOURCE))
    const rest = feeds
        .flatMap((items) => items.slice(MIN_PER_SOURCE))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    return [...reserved, ...rest]
        .slice(0, MAX_ITEMS)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function formatNewsDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
