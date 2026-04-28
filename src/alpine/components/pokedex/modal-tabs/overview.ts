import type { Pokemon, Species, AbilityDetail, EvolutionChain, EvolutionNode, EvolutionDetail } from '../../../../lib/api/pokeapi'
import { TYPE_COLORS } from '../../../../lib/data/constants'
import { statBar } from '../../../../ui/stat-bar'
import { gsap } from 'gsap'

export function buildOverview(pokemon: Pokemon, species: Species | null, abilityDetails: AbilityDetail[]): void {
    const grid = document.getElementById('overviewGrid')
    if (!grid) return

    // Dex entry — prefer recent games over Gen 1 text
    let dex = ''
    if (species) {
        const RECENT = ['scarlet','violet','sword','shield','sun','moon','ultra-sun','ultra-moon','x','y','omega-ruby','alpha-sapphire','black-2','white-2','black','white']
        const enEntries = species.flavor_text_entries?.filter((e) => e.language.name === 'en') ?? []
        const preferred = RECENT.reduce<typeof enEntries[0] | null>(
            (found, v) => found ?? enEntries.find((e) => e.version.name === v) ?? null, null
        ) ?? enEntries[0] ?? null
        if (preferred) dex = preferred.flavor_text.replace(/[\f\n]/g, ' ').trim()
    }

    // Genus
    const genus = species?.genera?.find((g) => g.language.name === 'en')?.genus ?? ''

    // Stats
    const bst = pokemon.stats.reduce((s, x) => s + x.base_stat, 0)
    const statsHTML = pokemon.stats.map((s) => statBar(s.stat.name, s.base_stat)).join('')

    // Abilities
    const abHTML = pokemon.abilities
        .map((a, i) => {
            const ad = abilityDetails[i]
            const desc =
                ad?.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ??
                ad?.flavor_text_entries?.find((e) => e.language.name === 'en')?.flavor_text ??
                'No description available.'
            const short = desc.length > 110 ? desc.slice(0, 110) + '…' : desc
            const fmt = (s: string) => s.replace(/-/g, ' ')
            return `<div class="p-3 rounded-xl border ${a.is_hidden ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'}">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-black text-slate-800 capitalize">${fmt(a.ability.name)}</span>
        ${a.is_hidden ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-200 text-violet-700 font-black uppercase tracking-wide">Hidden</span>' : ''}
      </div>
      <p class="text-xs text-slate-500 leading-relaxed" data-tip="${desc.replace(/"/g, '&quot;').replace(/\n/g, ' ')}">${short}</p>
    </div>`
        })
        .join('')

    grid.innerHTML = `
    <!-- Stats card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-black text-slate-800 text-sm">📊 Base Stats</h3>
          ${genus ? `<p class="text-xs text-slate-400 mt-0.5">${genus}</p>` : ''}
        </div>
        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">BST ${bst}</span>
      </div>
      <div class="space-y-2.5">${statsHTML}</div>
    </div>

    <!-- Dex + Abilities -->
    <div class="flex flex-col gap-4">
      ${
          dex
              ? `<div class="bg-linear-to-br from-slate-50 to-violet-50 border border-slate-200 rounded-2xl p-5">
        <h3 class="font-black text-slate-800 text-sm mb-2">📖 Pokédex Entry</h3>
        <p class="text-slate-600 text-sm leading-relaxed italic">"${dex}"</p>
      </div>`
              : ''
      }
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 class="font-black text-slate-800 text-sm mb-3">💡 Abilities</h3>
        <div class="space-y-2">${abHTML}</div>
      </div>
    </div>`

    // Animate grid cards + stat bars
    requestAnimationFrame(() => {
        // Cards stagger in
        gsap.fromTo(
            '#overviewGrid > div',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.08, clearProps: 'transform,opacity' },
        )
        // Stat bars stagger fill
        const fills = document.querySelectorAll<HTMLElement>('#overviewGrid .stat-bar-fill')
        gsap.fromTo(
            fills,
            { width: '0%' },
            {
                width: (_i: number, el: HTMLElement) => (el.dataset.pct ?? '0') + '%',
                duration: 0.75,
                ease: 'power2.out',
                stagger: 0.06,
                delay: 0.1,
            },
        )
    })
}

function evoLabel(details: EvolutionDetail[]): string {
    if (!details?.length) return ''
    const d = details[0]
    if (d.trigger.name === 'use-item') return (d.item?.name ?? 'item').replace(/-/g, ' ')
    if (d.trigger.name === 'trade') return d.held_item ? `trade (${d.held_item.name.replace(/-/g, ' ')})` : 'trade'
    if (d.trigger.name === 'level-up') {
        if (d.min_level) return `Lv. ${d.min_level}`
        if (d.min_happiness) return '♥ friendship'
        if (d.time_of_day === 'day') return '☀ day'
        if (d.time_of_day === 'night') return '☾ night'
        if (d.known_move) return `know ${d.known_move.name.replace(/-/g, ' ')}`
        return 'level up'
    }
    return d.trigger.name.replace(/-/g, ' ')
}

export function appendEvoChain(
    chain: EvolutionChain,
    pokemonList: Array<{
        name: string
        sprites: { front_default: string | null }
        types: Array<{ type: { name: string } }>
        id: number
    }>,
): void {
    const grid = document.getElementById('overviewGrid')
    if (!grid || pokemonList.length <= 1) return

    const byName = Object.fromEntries(pokemonList.map((p) => [p.name, p]))

    // BFS to get one row per evolution stage
    const levels: EvolutionNode[][] = []
    let current: EvolutionNode[] = [chain.chain]
    while (current.length) {
        levels.push(current)
        current = current.flatMap((n) => n.evolves_to ?? [])
    }

    const card = (name: string) => {
        const p = byName[name]
        if (!p) return ''
        const tc = TYPE_COLORS[p.types[0].type.name] ?? '#7c3aed'
        return `<div class="text-center cursor-pointer group" onclick="window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${p.name}'}}))">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-1.5 transition group-hover:scale-110 group-hover:shadow-md" style="background:${tc}22;border:2px solid ${tc}55">
            <img src="${p.sprites.front_default ?? ''}" class="w-16 h-16 object-contain" style="image-rendering:pixelated">
          </div>
          <p class="text-xs font-black text-slate-700 capitalize">${p.name}</p>
          <p class="text-xs text-slate-400">#${String(p.id).padStart(3, '0')}</p>
        </div>`
    }

    const isLinear = levels.every((level) => level.length === 1)

    let chainHTML: string
    if (isLinear) {
        // Horizontal: [base] →Lv.16→ [evo1] →Lv.32→ [evo2]
        const parts: string[] = [card(levels[0][0].species.name)]
        for (let i = 1; i < levels.length; i++) {
            const label = evoLabel(levels[i][0].evolution_details)
            parts.push(`<div class="flex flex-col items-center gap-0.5 shrink-0">
              ${label ? `<span class="text-[10px] font-semibold text-slate-400 capitalize">${label}</span>` : ''}
              <span class="text-slate-300 font-black text-xl">→</span>
            </div>`)
            parts.push(card(levels[i][0].species.name))
        }
        chainHTML = `<div class="flex flex-wrap items-center gap-3 justify-center">${parts.join('')}</div>`
    } else {
        // Branching (e.g. Eevee) — label above each non-base card
        const rows = levels.map((level, stageIdx) => {
            const cards = level.map((n) => {
                const label = stageIdx > 0 ? evoLabel(n.evolution_details) : ''
                return `<div class="flex flex-col items-center gap-0.5">
                  ${label ? `<span class="text-[10px] font-semibold text-slate-400 capitalize">${label}</span>` : ''}
                  ${card(n.species.name)}
                </div>`
            }).join('')
            return `<div class="flex flex-wrap gap-3 justify-center">${cards}</div>`
        }).join('<div class="evo-arrow text-center text-slate-400 font-black text-lg">↓</div>')
        chainHTML = `<div class="flex flex-col gap-3">${rows}</div>`
    }

    const div = document.createElement('div')
    div.className = 'md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm'
    div.innerHTML = `<h3 class="font-black text-slate-800 text-sm mb-4">🔗 Evolution Chain</h3>${chainHTML}`
    grid.appendChild(div)
    gsap.fromTo(div, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity' })
}

export function flatEvo(node: EvolutionNode, arr: string[] = []): string[] {
    arr.push(node.species.name)
    node.evolves_to?.forEach((child) => flatEvo(child, arr))
    return arr
}
