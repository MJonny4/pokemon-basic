import manifest from '../lib/data/pokedex-manifest.json'
import { typesInGen } from '../lib/data/type-history'
import type { GuideLocation } from '../lib/data/guides/location-schema'
import { itemSprite } from './item-card'
import { TYPE_COLORS } from '../lib/data/constants'

const pokemonById = new Map(manifest.map((pokemon) => [pokemon.id, pokemon]))

/** Guide cards stay neutral; only the left edge carries the Pokémon's type. */
export function guidePokemonCardStyle(type: string): string {
    return `border-left:4px solid ${TYPE_COLORS[type.toLowerCase()] ?? '#999'};background:var(--bg-surface)`
}

/** Build-time presentation only: never fetch modern API data to decorate a guide. */
export function guidePokemonVisual(dexId: number, gen: number) {
    const pokemon = pokemonById.get(dexId)
    if (!pokemon) throw new Error(`Missing guide Pokémon visual: ${dexId}`)
    return {
        apiName: pokemon.name,
        types: [...typesInGen(dexId, pokemon.types, gen)],
        spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`,
    }
}

/** Sum repeated species slots, retaining every distinct available level. */
export function guideEncounterCards(table: GuideLocation['encounters'][number]) {
    const rows = new Map<number, { name: string; dexId: number; weight: number; levels: number[] }>()
    for (const slot of table.slots) {
        const row = rows.get(slot.dexId) ?? { name: slot.name, dexId: slot.dexId, weight: 0, levels: [] }
        row.weight += slot.weight
        row.levels.push(slot.level)
        rows.set(slot.dexId, row)
    }
    return [...rows.values()].map((row) => ({ ...row, levels: [...new Set(row.levels)].sort((a, b) => a - b) }))
}

const itemSprites: Record<string, string> = {
    Antidote: 'antidote', Potion: 'potion', 'Poké Ball': 'poke-ball',
    // Gen I TM34 is Bide. Use a generic Normal TM icon, not a modern TM34 item.
    'TM34 Bide': 'tm-normal',
    'TM12 Water Gun': 'tm-water', 'TM01 Mega Punch': 'tm-normal', 'TM04 Whirlwind': 'tm-normal',
    'Moon Stone': 'moon-stone', 'Rare Candy': 'rare-candy', 'Escape Rope': 'escape-rope',
    'HP Up': 'hp-up', Ether: 'ether', 'Great Ball': 'great-ball',
    'Dome Fossil': 'dome-fossil', 'Helix Fossil': 'helix-fossil',
    'TM11 BubbleBeam': 'tm-water', 'TM28 Dig': 'tm-ground', 'TM45 Thunder Wave': 'tm-electric',
    'TM19 Seismic Toss': 'tm-fighting', Nugget: 'nugget', Elixir: 'elixir',
    Bicycle: 'bicycle', 'S.S. Ticket': 'ss-ticket',
    'Old Rod': 'old-rod', 'Bike Voucher': 'bike-voucher', 'Full Restore': 'full-restore',
    // Generic bottle/typed-disc visuals; names/mechanics stay those of Gen I.
    'X Special': 'x-sp-atk', 'TM08 Body Slam': 'tm-normal', 'TM44 Rest': 'tm-psychic',
    'HM01 Cut': 'tm-normal', 'Max Potion': 'max-potion', 'Hyper Potion': 'hyper-potion', 'Max Ether': 'max-ether',
    'TM24 Thunderbolt': 'tm-electric',
    'HM05 Flash': 'tm-normal',
    'TM30 Teleport': 'tm-psychic', 'TM21 Mega Drain': 'tm-grass', 'TM46 Psywave': 'tm-psychic',
    'Gold Teeth': 'gold-teeth', 'HM03 Surf': 'tm-water', 'HM04 Strength': 'tm-normal', 'TM06 Toxic': 'tm-poison',
    'Secret Key': 'secret-key', 'TM38 Fire Blast': 'tm-fire',
    'TM27 Fissure': 'tm-ground',
    'Lift Key': 'lift-key', 'Silph Scope': 'silph-scope', 'Poké Flute': 'poke-flute',
    'Card Key': 'card-key', 'Master Ball': 'master-ball',
    // Cosmetic device icon only; keep the original Itemfinder name/behavior.
    Itemfinder: 'dowsing-machine',
}

export function guideItemVisual(item: GuideLocation['items'][number]) {
    const slug = itemSprites[item.name]
    return {
        spriteUrl: item.name === 'Lapras' ? guidePokemonVisual(131, 1).spriteUrl : slug ? itemSprite(slug) : undefined,
        symbol: item.name.endsWith(' Badge') ? 'badge' : item.name === 'Prize money (₽)' ? 'money' : 'bag',
    }
}
