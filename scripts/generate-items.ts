/**
 * One-time script to generate src/data/items-full.json from PokéAPI.
 * Run with: npx tsx scripts/generate-items.ts
 *
 * Fetches holdable item categories, deduplicates, and outputs:
 *   [{ name: string, slug: string, desc: string }]
 * Sprite URL at runtime: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{slug}.png
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

interface FullItem {
    name: string
    slug: string
    desc: string
}

const BASE = 'https://pokeapi.co/api/v2'

const CATEGORIES = [
    'held-items',        // 72 — general held items (Life Orb, Leftovers, etc.)
    'choice',            //  3 — Choice Band / Specs / Scarf
    'type-enhancement',  // 22 — Charcoal, Mystic Water, etc.
    'plates',            // 19 — Arceus plates
    'jewels',            // 18 — type jewels
    'mega-stones',       // 47 — mega stones
    'z-crystals',        // 29 — Z-crystals
    'type-protection',   // 18 — resistance berries (Occa, Passho, etc.)
    'species-specific',  // 22 — Adamant Orb, Soul Dew, etc.
    'memories',          // 17 — Silvally memories
    'bad-held-items',    //  6 — Toxic Orb, Flame Orb (trick strategies)
    'in-a-pinch',        //  9 — stat-boosting berries (Liechi, Salac, etc.)
    'picky-healing',     //  5 — healing berries with confusion drawback
    'medicine',          // 10 — status-cure berries (Cheri, Chesto, etc.)
]

async function get(url: string): Promise<any> {
    const res = await fetch(url, { headers: { 'User-Agent': 'pokemon-basic-item-gen/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
    return res.json()
}

async function fetchCategory(slug: string): Promise<string[]> {
    const data = await get(`${BASE}/item-category/${slug}`)
    return (data.items as { name: string }[]).map((i) => i.name)
}

async function fetchItem(slug: string): Promise<FullItem | null> {
    try {
        const data = await get(`${BASE}/item/${slug}`)

        // English display name
        const nameEntry = (data.names as { name: string; language: { name: string } }[])
            .find((n) => n.language.name === 'en')
        const name = nameEntry?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

        // English flavor text — pick the latest entry
        const flavorEntries = (data.flavor_text_entries as { text: string; language: { name: string } }[])
            .filter((f) => f.language.name === 'en')
        const rawDesc = flavorEntries[flavorEntries.length - 1]?.text ?? ''
        const desc = rawDesc.replace(/[\n\r\f]+/g, ' ').trim()

        return { name, slug, desc }
    } catch {
        return null
    }
}

async function main() {
    console.log('Collecting item slugs from categories…')
    const slugSet = new Set<string>()

    for (const cat of CATEGORIES) {
        process.stdout.write(`  ${cat}…`)
        const slugs = await fetchCategory(cat)
        slugs.forEach((s) => slugSet.add(s))
        console.log(` ${slugs.length} items`)
    }

    const allSlugs = [...slugSet]
    console.log(`\nTotal unique slugs: ${allSlugs.length}`)
    console.log('Fetching item details (this may take a minute)…')

    const items: FullItem[] = []
    let done = 0

    // Fetch in batches of 10 to avoid hammering the API
    for (let i = 0; i < allSlugs.length; i += 10) {
        const batch = allSlugs.slice(i, i + 10)
        const results = await Promise.all(batch.map(fetchItem))
        for (const r of results) {
            if (r) items.push(r)
        }
        done += batch.length
        process.stdout.write(`\r  ${done}/${allSlugs.length} fetched…`)
    }

    console.log('\n')

    // Sort alphabetically by display name
    items.sort((a, b) => a.name.localeCompare(b.name))

    const outPath = join(process.cwd(), 'src', 'data', 'items-full.json')
    writeFileSync(outPath, JSON.stringify(items, null, 2))
    console.log(`✓ Written ${items.length} items to ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
