// Gen-accurate typings for the per-game pokedex listings. The manifest stores
// modern (Gen 9) typings; games older than a retcon must show the typing that
// was true in that generation, and must not offer filters for types that did
// not exist yet.
import { TYPE_COLORS, TYPES, EFFECTIVENESS } from './constants'

/** Generation each type debuted in (unlisted types are Gen 1). */
const TYPE_DEBUT: Record<string, number> = { dark: 2, steel: 2, fairy: 6 }

/**
 * Every retconned typing: `until` is the last generation the old typing was
 * current. Steel additions happened in Gen 2 (Magnemite line); everything else
 * is the Gen 6 Fairy retcon.
 */
const RETCONS: Record<number, { until: number; types: string[] }> = {
    35: { until: 5, types: ['normal'] },            // Clefairy
    36: { until: 5, types: ['normal'] },            // Clefable
    39: { until: 5, types: ['normal'] },            // Jigglypuff
    40: { until: 5, types: ['normal'] },            // Wigglytuff
    81: { until: 1, types: ['electric'] },          // Magnemite
    82: { until: 1, types: ['electric'] },          // Magneton
    122: { until: 5, types: ['psychic'] },          // Mr. Mime
    173: { until: 5, types: ['normal'] },           // Cleffa
    174: { until: 5, types: ['normal'] },           // Igglybuff
    175: { until: 5, types: ['normal'] },           // Togepi
    176: { until: 5, types: ['normal', 'flying'] }, // Togetic
    183: { until: 5, types: ['water'] },            // Marill
    184: { until: 5, types: ['water'] },            // Azumarill
    209: { until: 5, types: ['normal'] },           // Snubbull
    210: { until: 5, types: ['normal'] },           // Granbull
    280: { until: 5, types: ['psychic'] },          // Ralts
    281: { until: 5, types: ['psychic'] },          // Kirlia
    282: { until: 5, types: ['psychic'] },          // Gardevoir
    298: { until: 5, types: ['normal'] },           // Azurill
    303: { until: 5, types: ['steel'] },            // Mawile
    439: { until: 5, types: ['psychic'] },          // Mime Jr.
    468: { until: 5, types: ['normal', 'flying'] }, // Togekiss
    546: { until: 5, types: ['grass'] },            // Cottonee
    547: { until: 5, types: ['grass'] },            // Whimsicott
}

/** Typing of a Pokémon as it was in `gen` (0 = modern). */
export function typesInGen(id: number, modern: string[], gen: number): string[] {
    if (gen === 0) return modern
    const retcon = RETCONS[id]
    return retcon && gen <= retcon.until ? retcon.types : modern
}

/** Types that existed in `gen` (0 = all 18), in TYPE_COLORS order. */
export function typeListForGen(gen: number): string[] {
    const all = Object.keys(TYPE_COLORS)
    return gen === 0 ? all : all.filter((t) => (TYPE_DEBUT[t] ?? 1) <= gen)
}

/**
 * Attack effectiveness `atk` → `def` (capitalized names) under `gen`'s type
 * chart (0 = modern). The chart changed twice; the diffs vs modern are:
 * Gen II–V — Steel still resisted Ghost and Dark. Gen I additionally — Bug and
 * Poison were super-effective against each other, Ghost dealt 0× to Psychic
 * (game bug), and Ice hit Fire neutrally.
 */
export function effectivenessAt(atk: string, def: string, gen: number): number {
    if (gen >= 1 && gen <= 5) {
        if ((atk === 'Ghost' || atk === 'Dark') && def === 'Steel') return 0.5
        if (gen === 1) {
            if (atk === 'Bug' && def === 'Poison') return 2
            if (atk === 'Poison' && def === 'Bug') return 2
            if (atk === 'Ghost' && def === 'Psychic') return 0
            if (atk === 'Ice' && def === 'Fire') return 1
        }
    }
    return EFFECTIVENESS[atk][TYPES.indexOf(def)]
}
