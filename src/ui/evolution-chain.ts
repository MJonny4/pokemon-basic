import type { EvolutionChain, EvolutionNode, EvolutionDetail } from '../lib/api/pokeapi'
import { TYPE_COLORS, VG_GEN } from '../lib/data/constants'
import { pokemonSprite, dexNo, displayName } from './pokemon-card'

export interface EvoPokemon { id: number; name: string; type: string }

/** Flattens an evolution tree into species-name order (pre-order) — used to batch-fetch every node. */
export function flatEvoNames(node: EvolutionNode, arr: string[] = []): string[] {
    arr.push(node.species.name)
    node.evolves_to?.forEach((child) => flatEvoNames(child, arr))
    return arr
}

// Location-triggered ("near a special rock") evolutions only exist for these
// two species today — PokeAPI's `location` differs per game (Eterna Forest,
// Pinwheel Forest, ...) so the rock type itself is the only stable label.
const SPECIAL_ROCK: Record<string, string> = { leafeon: 'near Mossy Rock', glaceon: 'near Icy Rock' }

/**
 * Species with multiple valid evolution methods (e.g. Leafeon: near a Mossy
 * Rock in Gen IV-VII, OR a Leaf Stone from Gen VIII on) list one detail entry
 * per game version. `is_default` marks PokeAPI's overall "current" pick
 * (usually the newest method) — wrong for a gen-filtered view, since a method
 * introduced in Gen VIII shouldn't show when viewing Gen IV. Instead, pick the
 * earliest-introduced method that was still valid by the selected gen.
 */
function pickDetail(details: EvolutionDetail[], gen: number): EvolutionDetail {
    const byGen = (d: EvolutionDetail) => VG_GEN[d.version_group?.name] ?? 9
    const validAtGen = details.filter((d) => byGen(d) <= gen)
    const pool = validAtGen.length ? validAtGen : details
    return pool.reduce((oldest, d) => (byGen(d) < byGen(oldest) ? d : oldest), pool[0])
}

function evoLabel(details: EvolutionDetail[], targetSpecies: string, gen: number): string {
    if (!details?.length) return ''
    const d = pickDetail(details, gen)
    if (d.trigger.name === 'use-item') return (d.item?.name ?? 'item').replace(/-/g, ' ')
    if (d.trigger.name === 'trade') return d.held_item ? `trade (${d.held_item.name.replace(/-/g, ' ')})` : 'trade'
    if (d.trigger.name === 'level-up') {
        if (d.min_level) return `Lv. ${d.min_level}`
        if (d.near_special_rock) return SPECIAL_ROCK[targetSpecies] ?? 'near special rock'
        if (d.known_move_type) {
            const move = `know ${titleCase(d.known_move_type.name)} move`
            return d.min_happiness || d.min_affection ? `${move} + ♥` : move
        }
        if (d.min_happiness) return '♥ friendship'
        if (d.time_of_day === 'day') return '☀ day'
        if (d.time_of_day === 'night') return '☾ night'
        if (d.known_move) return `know ${d.known_move.name.replace(/-/g, ' ')}`
        return 'level up'
    }
    return d.trigger.name.replace(/-/g, ' ')
}

function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Evolution chain card grid — real `<a href>` links to /pokedex/[name] (this
 * page has real routes, unlike the legacy modal which dispatched a search event).
 * Renders '' when the chain has only one stage (nothing to show).
 */
export function evolutionChainHtml(chain: EvolutionChain, byName: Record<string, EvoPokemon>, base: string, gen: number): string {
    const levels: EvolutionNode[][] = []
    let current: EvolutionNode[] = [chain.chain]
    while (current.length) {
        levels.push(current)
        current = current.flatMap((n) => n.evolves_to ?? [])
    }
    if (levels.length <= 1) return ''

    const card = (name: string) => {
        const p = byName[name]
        if (!p) return ''
        const tc = TYPE_COLORS[p.type] ?? '#7c3aed'
        return `<a href="${base}/pokedex/${p.name}" class="text-center group">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-1.5 transition group-hover:scale-110 group-hover:shadow-md" style="background:${tc}22;border:2px solid ${tc}55">
            <img src="${pokemonSprite(p.id)}" alt="${p.name}" loading="lazy" class="w-16 h-16 object-contain" style="image-rendering:pixelated">
          </div>
          <p class="text-xs font-black text-text-primary">${displayName(p.name)}</p>
          <p class="text-xs text-text-tertiary">${dexNo(p.id)}</p>
        </a>`
    }

    const isLinear = levels.every((level) => level.length === 1)

    if (isLinear) {
        const parts: string[] = [card(levels[0][0].species.name)]
        for (let i = 1; i < levels.length; i++) {
            const label = evoLabel(levels[i][0].evolution_details, levels[i][0].species.name, gen)
            parts.push(`<div class="flex flex-col items-center gap-0.5 shrink-0">
              ${label ? `<span class="text-[10px] font-semibold text-text-tertiary capitalize">${label}</span>` : ''}
              <span class="text-text-tertiary font-black text-xl">→</span>
            </div>`)
            parts.push(card(levels[i][0].species.name))
        }
        return `<div class="flex flex-wrap items-center gap-3 justify-center">${parts.join('')}</div>`
    }

    const rows = levels.map((level, stageIdx) => {
        const cards = level.map((n) => {
            const label = stageIdx > 0 ? evoLabel(n.evolution_details, n.species.name, gen) : ''
            return `<div class="flex flex-col items-center gap-0.5">
              ${label ? `<span class="text-[10px] font-semibold text-text-tertiary capitalize">${label}</span>` : ''}
              ${card(n.species.name)}
            </div>`
        }).join('')
        return `<div class="flex flex-wrap gap-3 justify-center">${cards}</div>`
    }).join('<div class="text-center text-text-tertiary font-black text-lg">↓</div>')
    return `<div class="flex flex-col gap-3">${rows}</div>`
}
