import { genChip } from './move-card'

/** Compact item shape used by the /items listing payload and card renderer. */
export interface ItemListEntry {
    name: string
    slug: string
    category: string
    pocket: string
    gen: number | null
    cost: number
}

/** Junk categories hidden everywhere: SwSh event Dynamax Crystals (★-star names) and cut content. */
export const EXCLUDED_ITEM_CATEGORIES = new Set(['dynamax-crystals', 'unused'])

// Apple-system accents per pocket (same palette family as pokedex-games)
export const POCKET_COLORS: Record<string, string> = {
    pokeballs: '#FF3B30',
    medicine: '#30B0C7',
    berries: '#34C759',
    machines: '#AF52DE',
    battle: '#FF9500',
    key: '#FFCC00',
    mail: '#32ADE6',
    misc: '#8E8E93',
}

/** Card skin like moveCardStyle: pocket-colored left border + tint fading out over the theme surface. */
export function itemCardStyle(pocket: string): string {
    const c = POCKET_COLORS[pocket] ?? POCKET_COLORS.misc
    return `border-left:4px solid ${c};background:linear-gradient(90deg,${c}26,transparent 70%),var(--bg-surface)`
}

/** Solid pocket pill (white text on the pocket accent). */
export function pocketPill(pocket: string): string {
    const c = POCKET_COLORS[pocket] ?? POCKET_COLORS.misc
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow-sm" style="background:${c}">${pocketLabel(pocket)}</span>`
}

export function itemSprite(slug: string): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
}

const POKESPRITE = 'https://raw.githubusercontent.com/msikma/pokesprite/master/items'

// Mints are stored by the stat they raise (mint/attack.png), not by nature
const NATURE_STAT: Record<string, string> = {
    adamant: 'attack', lonely: 'attack', brave: 'attack', naughty: 'attack',
    bold: 'defense', impish: 'defense', lax: 'defense', relaxed: 'defense',
    modest: 'special-attack', mild: 'special-attack', quiet: 'special-attack', rash: 'special-attack',
    calm: 'special-defense', careful: 'special-defense', gentle: 'special-defense', sassy: 'special-defense',
    timid: 'speed', hasty: 'speed', jolly: 'speed', naive: 'speed',
    serious: 'neutral',
}

// Let's Go partner-play gifts live in their own pokesprite folder
const PARTNER_GIFTS = new Set([
    'beach-glass', 'chalky-stone', 'gold-leaf', 'lone-earring', 'marble', 'polished-mud-ball',
    'silver-leaf', 'small-bouquet', 'stretchy-spring', 'tropical-shell',
])

// Slugs whose pokesprite home doesn't follow any pocket/category rule
const ONE_OFF_SPRITES: Record<string, string> = {
    'strange-ball': 'ball/strange',
    'leaf-letter--pikachu': 'partner-gift/leaf-letter-pikachu',
    'leaf-letter--eevee': 'partner-gift/leaf-letter-eevee',
    'galarica-cuff': 'evo-item/galarica-cuff',
    'galarica-wreath': 'evo-item/galarica-wreath',
    'rusted-sword': 'hold-item/rusted-sword',
    'rusted-shield': 'hold-item/rusted-shield',
    'old-amber': 'fossil/old-amber',
    'ability-patch': 'other-item/ability-patch',
    'dynamax-candy': 'other-item/dynamax-candy',
}

/**
 * Best-effort pokesprite URL for when the PokeAPI sprite 404s; bad guesses hit
 * the 🎒 fallback. Verified against the pokesprite file tree: most folders keep
 * the full dashed slug; ball/berry/gem/fossil/flute/shard drop their suffix.
 */
export function itemSpriteFallback(i: Pick<ItemListEntry, 'slug' | 'pocket' | 'category'>): string {
    const hit = ONE_OFF_SPRITES[i.slug]
    if (hit) return `${POKESPRITE}/${hit}.png`
    // Variant suffixes like card-key--letsgo / fishing-rod--galar share the base sprite
    const s = i.slug.replace(/--.*$/, '')
    const c = i.category
    if (s.startsWith('fossilized-')) return `${POKESPRITE}/fossil/${s.slice('fossilized-'.length)}.png`
    if (s.endsWith('-fossil')) return `${POKESPRITE}/fossil/${s.replace(/-fossil$/, '')}.png`
    if (i.pocket === 'pokeballs') return `${POKESPRITE}/ball/${s.replace(/-ball$/, '')}.png`
    if (i.pocket === 'berries') return `${POKESPRITE}/berry/${s.replace(/-berry$/, '')}.png`
    if (i.pocket === 'machines') return `${POKESPRITE}/tm/normal.png`
    if (i.pocket === 'key') return `${POKESPRITE}/key-item/${s}.png`
    if (i.pocket === 'battle') {
        return c === 'flutes'
            ? `${POKESPRITE}/flute/${s.replace(/-flute$/, '')}.png`
            : `${POKESPRITE}/battle-item/${s}.png`
    }
    if (i.pocket === 'medicine') {
        if (c === 'nature-mints') return `${POKESPRITE}/mint/${NATURE_STAT[s.replace(/-mint$/, '')] ?? 'neutral'}.png`
        if (s.startsWith('exp-candy-')) return `${POKESPRITE}/exp-candy/${s.slice('exp-candy-'.length)}.png`
        if (c === 'vitamins' && s.includes('-candy')) return `${POKESPRITE}/av-candy/${s.replace('-candy', '')}.png`
        return `${POKESPRITE}/medicine/${s}.png`
    }
    if (c === 'jewels') return `${POKESPRITE}/gem/${s.replace(/-gem$/, '')}.png`
    if (c === 'z-crystals') return `${POKESPRITE}/z-crystals/${s}--bag.png`
    if (c === 'loot') {
        if (PARTNER_GIFTS.has(s)) return `${POKESPRITE}/partner-gift/${s}.png`
        if (s.endsWith('-shard')) return `${POKESPRITE}/shard/${s.replace(/-shard$/, '')}.png`
        return `${POKESPRITE}/valuable-item/${s}.png`
    }
    const byCategory: Record<string, string> = {
        'mega-stones': 'mega-stone',
        'plates': 'plate',
        'memories': 'memory',
        'evolution': 'evo-item',
        'scarves': 'scarf',
        'curry-ingredients': 'curry-ingredient',
        'held-items': 'hold-item',
        'bad-held-items': 'hold-item',
        'choice': 'hold-item',
        'type-enhancement': 'hold-item',
        'species-specific': 'hold-item',
        'effort-training': 'ev-item',
    }
    return `${POKESPRITE}/${byCategory[c] ?? 'other-item'}/${s}.png`
}

/**
 * Sprite <img> with a three-stage fallback: PokeAPI → locally-downloaded
 * Bulbagarden Archives sprite (public/items/{slug}.png, filled in for items
 * neither PokeAPI nor pokesprite illustrate — see scripts/fetch-missing-item-sprites.py)
 * → pokesprite best-effort guess → hide (parent shows 🎒).
 */
export function itemSpriteImg(i: Pick<ItemListEntry, 'slug' | 'pocket' | 'category' | 'name'>, cls: string, base = ''): string {
    const chain = [`${base}/items/${i.slug}.png`, itemSpriteFallback(i)]
    return `<img src="${itemSprite(i.slug)}" alt="${i.name}" loading="lazy" class="${cls}"
        style="image-rendering:pixelated" data-fb="${chain.join(',')}"
        onerror="const fb=this.dataset.fb.split(',');const n=fb.shift();this.dataset.fb=fb.join(',');if(n){this.src=n}else{this.style.display='none';this.parentElement.textContent='🎒'}">`
}

export function pocketLabel(pocket: string): string {
    const labels: Record<string, string> = {
        misc: 'Items', medicine: 'Medicine', pokeballs: 'Poké Balls',
        machines: 'TMs & HMs', berries: 'Berries', mail: 'Mail',
        battle: 'Battle Items', key: 'Key Items',
    }
    return labels[pocket] ?? pocket
}

export function categoryLabel(category: string): string {
    return category.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function formatCost(cost: number): string {
    return cost > 0 ? `₽${cost.toLocaleString()}` : '—'
}

/** Listing card — pocket pill + gen chip, icon + name, divider, category ↔ cost. */
export function itemCard(i: ItemListEntry, base: string): string {
    return `<a href="${base}/items/${i.slug}"
    class="item-card-link block rounded-xl border border-border-subtle p-3.5 hover:border-action hover:shadow-md transition"
    style="${itemCardStyle(i.pocket)}">
    <div class="flex items-center justify-between gap-2">
        ${pocketPill(i.pocket)}
        ${i.gen != null ? genChip(i.gen) : ''}
    </div>
    <div class="flex items-center gap-2.5 mt-2">
        <div class="item-icon bg-bg-elevated shrink-0">${itemSpriteImg(i, 'w-8 h-8 object-contain', base)}</div>
        <span class="font-black text-sm text-text-primary min-w-0 truncate">${i.name}</span>
    </div>
    <hr class="border-border-subtle my-2.5">
    <div class="flex items-center justify-between text-xs font-semibold text-text-secondary">
        <span class="truncate">${categoryLabel(i.category)}</span>
        <span class="shrink-0"><span class="text-text-tertiary font-bold">Cost</span> ${formatCost(i.cost)}</span>
    </div>
</a>`
}
