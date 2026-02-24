import type { Pokemon, Species } from '../../api/pokeapi'
import { TYPE_COLORS, STAT_LABELS } from '../../data/constants'
import type { RoleResult } from '../../logic/roleDetect'
import { recommendNatures } from '../../logic/natures'
import { recommendItems } from '../../logic/items'

export function buildTrainer(pokemon: Pokemon, role: RoleResult, species: Species | null): void {
    const el = document.getElementById('trainerContent')
    if (!el) return

    const statMap = Object.fromEntries(pokemon.stats.map((s) => [s.stat.name, s.base_stat]))
    const pokemonTypes = pokemon.types.map((t) => t.type.name)
    const bst = pokemon.stats.reduce((s, x) => s + x.base_stat, 0)
    const canEvolve = !!(species && !species.is_baby && species.evolution_chain?.url && bst < 480)

    const bannerColor = TYPE_COLORS[pokemonTypes[0]] ?? '#7c3aed'

    // Natures
    const scoredNatures = recommendNatures(role.key, statMap)
    const topNatures = scoredNatures.filter((n) => !n.isNeutral).slice(0, 6)
    const neutralNatures = scoredNatures.filter((n) => n.isNeutral)

    const statLabel = (s: string | null) => (s ? (STAT_LABELS[s] ?? s) : '')

    const natureCards = topNatures
        .map((n, i) => {
            const isTop = i < 3
            return `<div class="nature-card ${isTop ? 'recommended' : ''}">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="font-black text-sm text-slate-800">${n.name}</span>
          ${isTop ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-200 text-violet-700 font-black uppercase tracking-wide">${i === 0 ? 'Best pick' : 'Recommended'}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-3 text-xs mb-1.5">
        ${n.plus ? `<span class="stat-plus">▲ +10% ${statLabel(n.plus)}</span>` : ''}
        ${n.minus ? `<span class="stat-minus">▼ −10% ${statLabel(n.minus)}</span>` : ''}
      </div>
      ${n.flavor ? `<p class="text-xs text-slate-500 leading-relaxed">${n.flavor}</p>` : ''}
    </div>`
        })
        .join('')

    const neutralHTML = `<p class="text-xs text-slate-500 mt-2">Neutral natures (no effect): ${neutralNatures.map((n) => n.name).join(', ')}</p>`

    // Items
    const matchedItems = recommendItems(role.key, pokemonTypes, canEvolve)

    const itemCards = matchedItems
        .map(
            (item, i) => `
    <div class="item-card" style="border-color:${item.border}; background:${item.color || '#fff'}">
      <div class="item-icon" style="background:${item.border}33">
        <img src="${item.emoji}" alt="${item.name}" class="w-6 h-6 object-contain" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-black text-sm ${item.textLight ? 'text-white' : 'text-slate-800'}">${item.name}</span>
          ${i === 0 ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-200 text-violet-700 font-black uppercase tracking-wide">Top pick</span>` : ''}
        </div>
        <p class="text-xs ${item.textLight ? 'text-slate-300' : 'text-slate-500'} leading-relaxed">${item.desc}</p>
      </div>
    </div>`,
        )
        .join('')

    el.innerHTML = `
    <!-- Role card -->
    <div class="bg-linear-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 mb-5">
      <div class="flex items-center gap-3 mb-3">
        <h3 class="font-black text-slate-800 text-sm">🧠 Role Analysis</h3>
        <span class="role-badge text-white font-black text-xs px-3 py-1 rounded-full" style="background:${bannerColor}">${role.label}</span>
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">${role.description}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Natures -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 class="font-black text-slate-800 text-sm mb-1">🌿 Recommended Natures</h3>
        <p class="text-xs text-slate-400 mb-4">Based on this Pokémon's role and stat distribution</p>
        <div class="space-y-2.5">${natureCards}</div>
        ${neutralHTML}
      </div>

      <!-- Items -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 class="font-black text-slate-800 text-sm mb-1">🎒 Best Held Items</h3>
        <p class="text-xs text-slate-400 mb-4">Recommended for the <strong>${role.label}</strong> role</p>
        <div class="space-y-3">${itemCards}</div>
      </div>
    </div>`
}
