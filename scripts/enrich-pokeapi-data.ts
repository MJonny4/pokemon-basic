/**
 * One-time enrichment script — fetches PokeAPI metadata that the local JSON
 * files lack and writes two NEW committed data files:
 *
 *   src/lib/data/moves-meta.json    — per-move: gen introduced, effect_chance,
 *                                     compact cross-gen change history
 *   src/lib/data/items-catalog.json — full item catalog (~2000): category,
 *                                     pocket, gen, cost, effect text
 *
 * moves-data.json / items-full.json are never touched (existing consumers
 * depend on their exact shapes). Run manually: `bun scripts/enrich-pokeapi-data.ts`
 * Never wire this into build/CI — the outputs are static repo data.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import movesData from '../src/lib/data/moves-data.json'

const API = 'https://pokeapi.co/api/v2'
const OUT_DIR = join(import.meta.dir, '../src/lib/data')
const CONCURRENCY = 5

const GEN_NUM: Record<string, number> = {
    'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3,
    'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6,
    'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
}

// Version group → generation. past_values semantics (verified empirically):
// an entry's version_group is where the NEW value took effect, so the listed
// old values were in force through gen(version_group) - 1.
const VG_GEN: Record<string, number> = {
    'red-blue': 1, 'yellow': 1,
    'gold-silver': 2, 'crystal': 2,
    'ruby-sapphire': 3, 'emerald': 3, 'firered-leafgreen': 3, 'colosseum': 3, 'xd': 3,
    'diamond-pearl': 4, 'platinum': 4, 'heartgold-soulsilver': 4,
    'black-white': 5, 'black-2-white-2': 5,
    'x-y': 6, 'omega-ruby-alpha-sapphire': 6,
    'sun-moon': 7, 'ultra-sun-ultra-moon': 7, 'lets-go-pikachu-lets-go-eevee': 7,
    'sword-shield': 8, 'brilliant-diamond-shining-pearl': 8, 'legends-arceus': 8,
    'scarlet-violet': 9,
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

/** Run tasks over a list with a small concurrency pool. */
async function pool<T, R>(list: T[], worker: (t: T) => Promise<R>, label: string): Promise<R[]> {
    const results: R[] = new Array(list.length)
    let next = 0
    let done = 0
    async function lane() {
        while (next < list.length) {
            const i = next++
            results[i] = await worker(list[i])
            if (++done % 100 === 0) console.log(`  ${label}: ${done}/${list.length}`)
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, lane))
    return results
}

// ─── Moves ───────────────────────────────────────────────────────────────

interface PastChange {
    through_gen: number
    power?: number
    accuracy?: number
    pp?: number
    type?: string
}
interface MoveMeta {
    gen: number
    effect_chance?: number
    past?: PastChange[]
}

async function buildMovesMeta(): Promise<Record<string, MoveMeta>> {
    const slugs = Object.entries(movesData as Record<string, { type: string }>)
        .filter(([, m]) => m.type !== 'shadow')
        .map(([slug]) => slug)
    console.log(`Moves: ${slugs.length} (shadow moves excluded)`)

    const meta: Record<string, MoveMeta> = {}
    await pool(slugs, async (slug) => {
        const d = await fetchJson(`${API}/move/${slug}`)
        if (!d) return
        const entry: MoveMeta = { gen: GEN_NUM[d.generation?.name] ?? 1 }
        if (d.effect_chance != null) entry.effect_chance = d.effect_chance

        const past: PastChange[] = []
        for (const pv of d.past_values ?? []) {
            const vg = pv.version_group?.name
            const newGen = VG_GEN[vg]
            if (!newGen || newGen <= 1) continue
            const change: PastChange = { through_gen: newGen - 1 }
            if (pv.power != null) change.power = pv.power
            if (pv.accuracy != null) change.accuracy = pv.accuracy
            if (pv.pp != null) change.pp = pv.pp
            if (pv.type?.name) change.type = pv.type.name
            if (Object.keys(change).length > 1) past.push(change)
        }
        if (past.length) {
            past.sort((a, b) => a.through_gen - b.through_gen)
            entry.past = past
        }
        meta[slug] = entry
    }, 'moves')
    return meta
}

// ─── Items ───────────────────────────────────────────────────────────────

interface CatalogItem {
    name: string
    slug: string
    category: string
    pocket: string
    gen: number | null
    cost: number
    effect: string
}

// PokeAPI's item game_indices start at Gen 3, so Gen 1/2 items get misreported
// and Gen 8/9 items often have no index at all. These overrides were curated by
// a Pokémon domain expert (introduction generation per item slug) and take
// precedence over game_indices.
const GEN1 = 'antidote awakening bicycle bike-voucher burn-heal calcium carbos card-key coin-case dire-hit dome-fossil dowsing-machine elixir escape-rope ether fire-stone fresh-water full-heal full-restore gold-teeth good-rod great-ball guard-spec helix-fossil hm01 hm02 hm03 hm04 hm05 hp-up hyper-potion ice-heal iron leaf-stone lemonade lift-key master-ball max-elixir max-ether max-potion max-repel max-revive moon-stone nugget oaks-parcel old-amber old-rod paralyze-heal poke-ball poke-doll poke-flute potion pp-up protein rare-candy repel revive safari-ball secret-key silph-scope soda-pop ss-ticket super-potion super-repel super-rod thunder-stone tm01 tm02 tm03 tm04 tm05 tm06 tm07 tm08 tm09 tm10 tm11 tm12 tm13 tm14 tm15 tm16 tm17 tm18 tm19 tm20 tm21 tm22 tm23 tm24 tm25 tm26 tm27 tm28 tm29 tm30 tm31 tm32 tm33 tm34 tm35 tm36 tm37 tm38 tm39 tm40 tm41 tm42 tm43 tm44 tm45 tm46 tm47 tm48 tm49 tm50 town-map ultra-ball water-stone x-accuracy x-attack x-defense x-sp-atk x-speed zinc'
const GEN2 = 'amulet-coin berry-juice big-mushroom big-pearl black-belt black-glasses bright-powder charcoal cleanse-tag dragon-fang dragon-scale energy-powder energy-root everstone exp-share fast-ball focus-band friend-ball hard-stone heal-powder heavy-ball hm06 hm07 kings-rock leftovers level-ball light-ball love-ball lucky-egg lucky-punch lure-ball magnet metal-coat metal-powder miracle-seed moomoo-milk moon-ball mystic-water never-melt-ice pearl poison-barb quick-claw rage-candy-bar revival-herb sacred-ash scope-lens sharp-beak silver-powder smoke-ball soft-sand spell-tag sport-ball star-piece stardust stick sun-stone thick-club tiny-mushroom twisted-spoon up-grade'
const GEN8 = 'adamant-crystal big-bamboo-shoot black-augurite blank-plate lafeather-ball lagigaton-ball lagreat-ball laheavy-ball lajet-ball laleaden-ball laorigin-ball lapoke-ball lastrange-ball laultra-ball lawing-ball legend-plate linking-cord lustrous-globe peat-block roto-stick scroll-of-darkness scroll-of-waters tiny-bamboo-shoot'
const GEN9 = 'ability-shield booster-energy clear-amulet clever-mochi cornerstone-mask covert-cloak fairy-feather fresh-start-mochi genius-mochi glimmering-charm griseous-core health-mochi hearthflame-mask loaded-dice malicious-armor masterpiece-teacup metal-alloy mirror-herb muscle-mochi punching-glove resist-mochi swift-mochi syrupy-apple teal-style-card unremarkable-teacup wellspring-mask'

const GEN_OVERRIDES: Record<string, number> = {}
for (const [gen, list] of [[1, GEN1], [2, GEN2], [8, GEN8], [9, GEN9]] as const) {
    for (const slug of list.split(' ')) GEN_OVERRIDES[slug] = gen
}

// Fallback for items with neither an override nor game_indices — these
// categories map cleanly to one generation.
const CATEGORY_GEN_DEFAULT: Record<string, number> = {
    'mega-stones': 6,
    'tera-shard': 9,
    'tm-materials': 9,
    'picnic': 9,
    'sandwich-ingredients': 9,
    'all-machines': 9, // only TM101+ (SV) lack game_indices; TM01–100/TRs resolve via indices/overrides
}

const pocketCache = new Map<string, Promise<string>>()
function categoryPocket(category: string): Promise<string> {
    let p = pocketCache.get(category)
    if (!p) {
        p = fetchJson(`${API}/item-category/${category}`).then((d) => d?.pocket?.name ?? 'misc')
        pocketCache.set(category, p)
    }
    return p
}

function englishEffect(d: any): string {
    const short = d.effect_entries?.find((e: any) => e.language?.name === 'en')?.short_effect
    if (short) return short.replace(/\s+/g, ' ').trim()
    const flavors = (d.flavor_text_entries ?? []).filter((e: any) => e.language?.name === 'en')
    const flavor = flavors.length ? flavors[flavors.length - 1].text : ''
    return flavor.replace(/\s+/g, ' ').trim()
}

async function buildItemsCatalog(): Promise<CatalogItem[]> {
    const list = await fetchJson(`${API}/item?limit=2500`)
    const slugs: string[] = (list?.results ?? []).map((r: { name: string }) => r.name)
    console.log(`Items: ${slugs.length} in PokeAPI index`)

    const rows = await pool(slugs, async (slug): Promise<CatalogItem | null> => {
        const d = await fetchJson(`${API}/item/${slug}`)
        if (!d?.category?.name) return null
        // Junk categories: ★-named SwSh event Dynamax Crystals and cut content
        if (d.category.name === 'dynamax-crystals' || d.category.name === 'unused') return null
        const name =
            d.names?.find((n: any) => n.language?.name === 'en')?.name ??
            slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        const gens = (d.game_indices ?? [])
            .map((g: any) => GEN_NUM[g.generation?.name])
            .filter((n: number | undefined): n is number => !!n)
        const gen = GEN_OVERRIDES[slug]
            ?? (gens.length ? Math.min(...gens) : CATEGORY_GEN_DEFAULT[d.category.name] ?? null)
        return {
            name,
            slug,
            category: d.category.name,
            pocket: await categoryPocket(d.category.name),
            gen,
            cost: d.cost ?? 0,
            effect: englishEffect(d),
        }
    }, 'items')

    return rows
        .filter((r): r is CatalogItem => r !== null)
        .sort((a, b) => (a.gen ?? 99) - (b.gen ?? 99) || a.name.localeCompare(b.name))
}

// ─── Main ────────────────────────────────────────────────────────────────

const movesMeta = await buildMovesMeta()
writeFileSync(join(OUT_DIR, 'moves-meta.json'), JSON.stringify(movesMeta))
console.log(`\n✓ moves-meta.json: ${Object.keys(movesMeta).length} moves`)
console.log('  thunderbolt:', JSON.stringify(movesMeta['thunderbolt']))
console.log('  tackle:', JSON.stringify(movesMeta['tackle']))
console.log('  bite:', JSON.stringify(movesMeta['bite']))

const catalog = await buildItemsCatalog()
writeFileSync(join(OUT_DIR, 'items-catalog.json'), JSON.stringify(catalog))
console.log(`\n✓ items-catalog.json: ${catalog.length} items`)
console.log('  leftovers:', JSON.stringify(catalog.find((i) => i.slug === 'leftovers')))
console.log('  pockets:', JSON.stringify([...new Set(catalog.map((i) => i.pocket))]))
