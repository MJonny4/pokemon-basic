import type { Pokemon, Species } from '../lib/api/pokeapi'
import { TYPE_COLORS, STAT_LABELS, STAT_COLORS } from '../lib/data/constants'
import type { RoleResult } from '../lib/logic/role-detect'
import { recommendNatures } from '../lib/logic/natures'
import { recommendItems } from '../lib/logic/items'
import { calcStat } from '../lib/logic/stat-calc'

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']

const ROLE_SPREADS: Record<string, Record<string, number>> = {
    physical_sweeper:  { hp: 4,   attack: 252, defense: 0,   'special-attack': 0,   'special-defense': 0,   speed: 252 },
    special_sweeper:   { hp: 4,   attack: 0,   defense: 0,   'special-attack': 252, 'special-defense': 0,   speed: 252 },
    physical_attacker: { hp: 252, attack: 252, defense: 4,   'special-attack': 0,   'special-defense': 0,   speed: 0   },
    special_attacker:  { hp: 252, attack: 0,   defense: 0,   'special-attack': 252, 'special-defense': 4,   speed: 0   },
    physical_wall:     { hp: 252, attack: 0,   defense: 252, 'special-attack': 0,   'special-defense': 4,   speed: 0   },
    special_wall:      { hp: 252, attack: 0,   defense: 4,   'special-attack': 0,   'special-defense': 252, speed: 0   },
    tank:              { hp: 252, attack: 0,   defense: 128, 'special-attack': 0,   'special-defense': 128, speed: 0   },
    fast_attacker:     { hp: 4,   attack: 252, defense: 0,   'special-attack': 0,   'special-defense': 0,   speed: 252 },
    mixed_attacker:    { hp: 4,   attack: 252, defense: 0,   'special-attack': 252, 'special-defense': 0,   speed: 0   },
}

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

    // Stat calculator
    const topNature = scoredNatures.find((n) => !n.isNeutral) ?? null
    const spread = ROLE_SPREADS[role.key] ?? ROLE_SPREADS['physical_sweeper']

    const statRows = STAT_KEYS.map((key) => {
        const base = statMap[key] ?? 0
        const ev = spread[key] ?? 0
        const final = calcStat(key, base, 31, ev, 50, topNature?.name ?? null)
        const col = STAT_COLORS[key] ?? '#8b5cf6'
        const label = STAT_LABELS[key] ?? key
        const isPlus = topNature?.plus === key
        const isMinus = topNature?.minus === key
        const arrow = isPlus
            ? `<span class="text-[9px] font-black text-blue-400">▲</span>`
            : isMinus
              ? `<span class="text-[9px] font-black text-rose-400">▼</span>`
              : `<span class="w-3 inline-block"></span>`
        const barPct = Math.min(100, Math.round((final / 255) * 100))
        return `<div class="flex items-center gap-2 text-xs">
      <span class="w-8 text-right font-black shrink-0" style="color:${col}">${label}</span>
      <span class="w-7 text-right text-slate-300 font-semibold shrink-0">${base}</span>
      <span class="w-7 text-right font-bold shrink-0 ${ev > 0 ? 'text-violet-500' : 'text-slate-200'}">${ev > 0 ? ev : '—'}</span>
      <div class="flex-1 h-1.5 rounded-full bg-slate-100">
        <div class="h-1.5 rounded-full" style="background:${col};width:${barPct}%"></div>
      </div>
      <span class="w-3 shrink-0 text-center">${arrow}</span>
      <span class="w-7 text-right font-black shrink-0 text-slate-700">${final}</span>
    </div>`
    }).join('')

    const evEntries = Object.entries(spread)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${STAT_LABELS[k] ?? k}`)
        .join(' / ')
    const spreadLabel = topNature ? `${topNature.name} · ${evEntries}` : evEntries

    const statCalcHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
      <h3 class="font-black text-slate-800 text-sm mb-1">📊 Stat Calculator (Lv 50)</h3>
      <p class="text-xs text-slate-400 mb-4">${spreadLabel} · 31 IVs</p>
      <div class="space-y-2">${statRows}</div>
    </div>`

    el.innerHTML = `
    <!-- Role card -->
    <div class="bg-linear-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 mb-5">
      <div class="flex items-center gap-3 mb-3">
        <h3 class="font-black text-slate-800 text-sm">🧠 Role Analysis</h3>
        <span class="role-badge text-white font-black text-xs px-3 py-1 rounded-full" style="background:${bannerColor}">${role.label}</span>
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">${role.description}</p>
    </div>

    ${statCalcHTML}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      <!-- Natures -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 class="font-black text-slate-800 text-sm mb-1">🌿 Recommended Natures</h3>
        <p class="text-xs text-slate-400 mb-4">Based on this Pokémon's role and stat distribution</p>
        <div class="space-y-2.5">${natureCards}</div>
        ${neutralHTML}
      </div>

      <!-- Items -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 class="font-black text-slate-800 text-sm mb-1">🎒 Best Held Items (Basic Logic)</h3>
        <p class="text-xs text-slate-400 mb-4">Recommended for the <strong>${role.label}</strong> role</p>
        <div class="space-y-3">${itemCards}</div>
      </div>
    </div>

    `
}
