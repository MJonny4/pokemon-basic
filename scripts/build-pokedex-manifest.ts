/**
 * One-time manifest builder — fetches all 1025 Pokémon from PokeAPI and writes
 * a slim build-time manifest for the /pokedex listing pages:
 *
 *   src/lib/data/pokedex-manifest.json — [{ id, name, types, h, w, bst }]
 *     h = height in decimetres, w = weight in hectograms (PokeAPI raw units)
 *
 * Run manually: `bun scripts/build-pokedex-manifest.ts`
 * Never wire this into build/CI — the output is static repo data.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'https://pokeapi.co/api/v2'
const OUT = join(import.meta.dir, '../src/lib/data/pokedex-manifest.json')
const CONCURRENCY = 5
const MAX_ID = 1025

interface ManifestEntry {
    id: number
    name: string
    types: string[]
    h: number
    w: number
    bst: number
}

async function fetchJson(url: string, retries = 2): Promise<any | null> {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url)
            if (res.status === 404) return null
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return await res.json()
        } catch (e) {
            if (i === retries) {
                console.warn(`  ✗ failed: ${url} (${e})`)
                return null
            }
            await new Promise((r) => setTimeout(r, 500 * (i + 1)))
        }
    }
    return null
}

const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1)
const entries: ManifestEntry[] = new Array(MAX_ID)
let next = 0
let done = 0

async function lane() {
    while (next < ids.length) {
        const i = next++
        const d = await fetchJson(`${API}/pokemon/${ids[i]}`)
        if (d) {
            entries[i] = {
                id: d.id,
                name: d.name,
                types: d.types.map((t: any) => t.type.name),
                h: d.height,
                w: d.weight,
                bst: d.stats.reduce((sum: number, s: any) => sum + s.base_stat, 0),
            }
        }
        if (++done % 100 === 0) console.log(`  pokemon: ${done}/${MAX_ID}`)
    }
}

await Promise.all(Array.from({ length: CONCURRENCY }, lane))

const result = entries.filter(Boolean)
writeFileSync(OUT, JSON.stringify(result))
console.log(`\n✓ pokedex-manifest.json: ${result.length} Pokémon`)
console.log('  #1:', JSON.stringify(result[0]))
console.log('  #1025:', JSON.stringify(result[result.length - 1]))
