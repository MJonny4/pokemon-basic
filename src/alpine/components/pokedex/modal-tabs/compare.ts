import type { Pokemon } from '../../../../lib/api/pokeapi'
import { fetchPokemon, fetchPokemonsByType } from '../../../../lib/api/pokeapi'
import { TYPE_COLORS, STAT_COLORS, STAT_LABELS } from '../../../../lib/data/constants'
import { typeBadge } from '../../../../ui/badges'

type SortKey = 'bst' | 'speed' | 'hp' | 'attack' | 'special-attack' | 'defense' | 'special-defense'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'bst', label: 'BST' },
    { key: 'speed', label: 'Speed' },
    { key: 'hp', label: 'HP' },
    { key: 'attack', label: 'Atk' },
    { key: 'special-attack', label: 'SpA' },
    { key: 'defense', label: 'Def' },
    { key: 'special-defense', label: 'SpDef' },
]

// Module-level state
let _current: Pokemon | null = null
let _compare: Pokemon | null = null
let _peers: Pokemon[] = []
let _sort: SortKey = 'bst'
let _exactMatch = true
let _types: string[] = []
let _typeLists: Array<Array<{ name: string; id: number }>> = []
let _displayCount = 20

function getStat(p: Pokemon, key: SortKey): number {
    if (key === 'bst') return p.stats.reduce((s, x) => s + x.base_stat, 0)
    return p.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
}

function getCandidates(): Array<{ name: string; id: number }> {
    if (_types.length === 1 || !_exactMatch) {
        const seen = new Set<string>()
        return _typeLists
            .flat()
            .filter((p) => {
                if (seen.has(p.name)) return false
                seen.add(p.name)
                return true
            })
            .sort((a, b) => a.id - b.id)
    }
    // Exact dual-type intersection
    const set = new Set(_typeLists[0].map((p) => p.name))
    return (_typeLists[1] ?? _typeLists[0]).filter((p) => set.has(p.name))
}

function miniStats(p: Pokemon): string {
    const entries: { key: string; label: string; color: string }[] = [
        { key: 'hp', label: 'HP', color: STAT_COLORS['hp'] ?? '#22c55e' },
        { key: 'attack', label: 'Atk', color: STAT_COLORS['attack'] ?? '#f97316' },
        { key: 'defense', label: 'Def', color: STAT_COLORS['defense'] ?? '#eab308' },
        { key: 'special-attack', label: 'SpA', color: STAT_COLORS['special-attack'] ?? '#6366f1' },
        { key: 'special-defense', label: 'SpD', color: STAT_COLORS['special-defense'] ?? '#06b6d4' },
        { key: 'speed', label: 'Spd', color: STAT_COLORS['speed'] ?? '#3b82f6' },
    ]
    return entries
        .map(({ key, label, color }) => {
            const val = p.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
            const pct = Math.min(100, Math.round((val / 255) * 100))
            return `<div class="flex items-center gap-1">
        <span class="text-[9px] font-semibold text-slate-400 w-4 shrink-0">${label}</span>
        <div class="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="text-[10px] font-bold text-slate-600">${val}</span>
      </div>`
        })
        .join('')
}

function peerRow(p: Pokemon, rank: number, isCurrent: boolean, isSelected: boolean): string {
    const bst = p.stats.reduce((s, x) => s + x.base_stat, 0)
    const types = p.types.map((t) => t.type.name)
    const tc = TYPE_COLORS[types[0]] ?? '#7c3aed'
    const sprite = p.sprites.front_default ?? ''
    const sortVal = getStat(p, _sort)
    const maxVal = _sort === 'bst' ? 720 : 255
    const sortPct = Math.min(100, Math.round((sortVal / maxVal) * 100))
    const sortLabel = SORT_OPTIONS.find((o) => o.key === _sort)?.label ?? _sort

    let rowClass =
        'flex items-center gap-3 p-2.5 rounded-xl border transition '
    if (isCurrent) rowClass += 'border-violet-400 bg-violet-50'
    else if (isSelected) rowClass += 'border-emerald-400 bg-emerald-50 cursor-pointer hover:bg-emerald-100'
    else rowClass += 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50 cursor-pointer'

    const badge = isCurrent
        ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-700 font-black uppercase tracking-wide">YOU</span>'
        : isSelected
        ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-700 font-black uppercase tracking-wide">CMP</span>'
        : ''

    const onclick = isCurrent ? '' : `onclick="window._compareSelect('${p.name}')"`

    const searchClick = `event.stopPropagation();window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${p.name}'}}))`

    return `<div class="${rowClass}" ${onclick}>
    <span class="text-[10px] font-black text-slate-300 w-5 shrink-0 text-right">${rank}</span>
    <img src="${sprite}" class="w-10 h-10 object-contain shrink-0 cursor-pointer hover:scale-110 transition-transform" style="image-rendering:pixelated" alt="${p.name}" onclick="${searchClick}" title="Open in Pokédex">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5 flex-wrap mb-1">
        <span class="font-black text-sm text-slate-800 capitalize cursor-pointer hover:text-violet-600 transition-colors" onclick="${searchClick}">${p.name.replace(/-/g, ' ')}</span>
        ${badge}
        ${types.map((t) => typeBadge(t, 'sm')).join('')}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-black text-violet-600">BST ${bst}</span>
        <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${sortPct}%;background:${tc}"></div>
        </div>
        <span class="text-[10px] font-bold text-slate-500">${sortLabel} ${sortVal}</span>
      </div>
    </div>
    <div class="shrink-0 hidden sm:grid grid-cols-2 gap-x-3 gap-y-0.5">${miniStats(p)}</div>
  </div>`
}

function renderList(): void {
    const listEl = document.getElementById('compareList')
    const moreEl = document.getElementById('compareLoadMore')
    const countEl = document.getElementById('compareCount')
    if (!listEl || !_current) return

    const sorted = [..._peers].sort((a, b) => getStat(b, _sort) - getStat(a, _sort))
    const visible = sorted.slice(0, _displayCount)
    const remaining = sorted.length - visible.length

    listEl.innerHTML = visible
        .map((p, i) => peerRow(p, i + 1, p.name === _current!.name, p.name === _compare?.name))
        .join('')

    if (moreEl) {
        if (remaining > 0) {
            const next = Math.min(20, remaining)
            moreEl.innerHTML = `<button onclick="window._compareLoadMore()" class="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 text-xs font-bold transition">Load ${next} more · ${remaining} remaining</button>`
        } else {
            moreEl.innerHTML = ''
        }
    }

    if (countEl) {
        countEl.textContent = `${visible.length} / ${sorted.length}`
    }
}

function renderComparison(): void {
    const el = document.getElementById('comparePanel')
    if (!el || !_current || !_compare) return

    const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']

    const rows = STAT_KEYS.map((key) => {
        const aVal = _current!.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
        const bVal = _compare!.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
        const max = Math.max(aVal, bVal, 1)
        const aPct = Math.round((aVal / max) * 100)
        const bPct = Math.round((bVal / max) * 100)
        const color = STAT_COLORS[key] ?? '#8b5cf6'
        const label = STAT_LABELS[key] ?? key

        return `<div class="flex items-center gap-2">
      <div class="flex-1 flex items-center justify-end gap-1.5">
        <span class="text-xs font-bold ${aVal > bVal ? 'text-emerald-600' : aVal < bVal ? 'text-red-400' : 'text-slate-500'}">${aVal}</span>
        <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${aPct}%;background:${color};margin-left:auto;float:right"></div>
        </div>
      </div>
      <span class="text-[9px] font-black text-slate-400 w-8 text-center shrink-0">${label}</span>
      <div class="flex-1 flex items-center gap-1.5">
        <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${bPct}%;background:${color}"></div>
        </div>
        <span class="text-xs font-bold ${bVal > aVal ? 'text-emerald-600' : bVal < aVal ? 'text-red-400' : 'text-slate-500'}">${bVal}</span>
      </div>
    </div>`
    }).join('')

    const curBST = _current.stats.reduce((s, x) => s + x.base_stat, 0)
    const cmpBST = _compare.stats.reduce((s, x) => s + x.base_stat, 0)
    const curTypes = _current.types.map((t) => t.type.name)
    const cmpTypes = _compare.types.map((t) => t.type.name)
    const curSprite = _current.sprites.front_default ?? ''
    const cmpSprite = _compare.sprites.front_default ?? ''

    el.innerHTML = `
  <div class="bg-white rounded-2xl border-2 border-emerald-200 p-5 mt-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-black text-slate-800 text-sm">⚖️ Side-by-Side Comparison</h3>
      <button onclick="window._compareDismiss()" class="text-xs text-slate-400 hover:text-slate-600 transition">✕ Close</button>
    </div>
    <!-- Pokemon headers -->
    <div class="flex items-center mb-4">
      <div class="flex-1 flex items-center gap-2">
        <img src="${curSprite}" class="w-12 h-12 object-contain cursor-pointer hover:scale-110 transition-transform" style="image-rendering:pixelated" alt="${_current.name}"
             onclick="window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${_current.name}'}}))" title="Open in Pokédex">
        <div>
          <p class="font-black text-sm capitalize text-slate-800 cursor-pointer hover:text-violet-600 transition-colors"
             onclick="window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${_current.name}'}}))">
            ${_current.name.replace(/-/g, ' ')}
          </p>
          <div class="flex gap-1 flex-wrap mt-0.5">${curTypes.map((t) => typeBadge(t, 'sm')).join('')}</div>
          <p class="text-[10px] text-violet-600 font-black mt-0.5">BST ${curBST}</p>
        </div>
      </div>
      <span class="text-xl font-black text-slate-200 mx-2">vs</span>
      <div class="flex-1 flex items-center justify-end gap-2">
        <div class="text-right">
          <p class="font-black text-sm capitalize text-slate-800 cursor-pointer hover:text-violet-600 transition-colors"
             onclick="window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${_compare.name}'}}))">
            ${_compare.name.replace(/-/g, ' ')}
          </p>
          <div class="flex gap-1 flex-wrap justify-end mt-0.5">${cmpTypes.map((t) => typeBadge(t, 'sm')).join('')}</div>
          <p class="text-[10px] text-emerald-600 font-black mt-0.5">BST ${cmpBST}</p>
        </div>
        <img src="${cmpSprite}" class="w-12 h-12 object-contain cursor-pointer hover:scale-110 transition-transform" style="image-rendering:pixelated" alt="${_compare.name}"
             onclick="window.dispatchEvent(new CustomEvent('pokemon-search',{detail:{name:'${_compare.name}'}}))" title="Open in Pokédex">
      </div>
    </div>
    <!-- Stat bars -->
    <div class="space-y-2.5">${rows}</div>
  </div>`
}

function renderFull(): void {
    const el = document.getElementById('compareContent')
    if (!el || !_current) return

    const hasTypeFilter = _types.length > 1
    const typeLabel = _types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('/')

    const sortBtns = SORT_OPTIONS.map(
        (o) =>
            `<button class="fchip compare-sort-btn ${o.key === _sort ? 'fchip-active' : ''}" data-sort-key="${o.key}" onclick="window._compareSort('${o.key}')">${o.label}</button>`,
    ).join('')

    const filterBtn = hasTypeFilter
        ? `<button id="compareFilterBtn" onclick="window._compareToggleFilter()" class="fchip ${_exactMatch ? 'fchip-active' : ''}">
        ${_exactMatch ? `${typeLabel} only` : 'Any shared type'}
      </button>`
        : ''

    el.innerHTML = `
  <!-- Sort & filter bar -->
  <div class="flex flex-wrap items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Sort by</span>
    ${sortBtns}
    ${hasTypeFilter ? `<div class="ml-auto flex items-center gap-2"><span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter</span>${filterBtn}</div>` : ''}
  </div>

  <!-- Count info -->
  <p class="text-xs text-slate-400 mb-3 font-medium">
    Showing <strong id="compareCount" class="text-slate-600"></strong> ${_exactMatch && hasTypeFilter ? typeLabel : 'matching'} Pokémon
    <span class="text-slate-300 ml-1">· sorted by ${SORT_OPTIONS.find((o) => o.key === _sort)?.label}</span>
    ${!_exactMatch && hasTypeFilter ? `<button onclick="window._compareToggleFilter()" class="ml-2 text-violet-500 hover:text-violet-700 font-bold underline">Show ${typeLabel} only</button>` : ''}
  </p>

  <!-- Tip -->
  <p class="text-[10px] text-slate-300 italic mb-3">Click any Pokémon to compare side-by-side ↓</p>

  <!-- List -->
  <div id="compareList" class="space-y-1.5"></div>

  <!-- Load more -->
  <div id="compareLoadMore"></div>

  <!-- Comparison panel -->
  <div id="comparePanel"></div>

  `

    renderList()
    if (_compare) renderComparison()
}

export async function buildCompare(pokemon: Pokemon): Promise<void> {
    _current = pokemon
    _compare = null
    _peers = []
    _sort = 'bst'
    _exactMatch = true
    _displayCount = 20
    _types = pokemon.types.map((t) => t.type.name)
    _typeLists = []

    const el = document.getElementById('compareContent')
    if (!el) return

    // Show loading skeleton
    el.innerHTML = `
  <div class="text-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-3"></div>
    <p class="text-slate-400 text-sm">Loading ${_types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('/')} Pokémon…</p>
  </div>`

    try {
        _typeLists = await Promise.all(_types.map((t) => fetchPokemonsByType(t)))
        const candidates = getCandidates()

        const results = await Promise.all(candidates.map((p) => fetchPokemon(p.name).catch(() => null)))
        _peers = results.filter(Boolean) as Pokemon[]

        renderFull()

        // Register window helpers (overwrite on each buildCompare call)
        ;(window as any)._compareSort = (key: string) => {
            _sort = key as SortKey
            document.querySelectorAll<HTMLElement>('.compare-sort-btn').forEach((btn) => {
                const isActive = btn.dataset.sortKey === key
                if (isActive) btn.classList.add('fchip-active')
                else btn.classList.remove('fchip-active')
            })
            renderList()
        }

        ;(window as any)._compareSelect = async (name: string) => {
            if (_compare?.name === name) {
                _compare = null
                const panel = document.getElementById('comparePanel')
                if (panel) panel.innerHTML = ''
            } else {
                _compare = await fetchPokemon(name).catch(() => null)
                if (_compare) renderComparison()
            }
            renderList()
        }

        ;(window as any)._compareDismiss = () => {
            _compare = null
            const panel = document.getElementById('comparePanel')
            if (panel) panel.innerHTML = ''
            renderList()
        }

        ;(window as any)._compareToggleFilter = async () => {
            _exactMatch = !_exactMatch
            _compare = null
            _displayCount = 20
            const candidates2 = getCandidates()
            const results2 = await Promise.all(candidates2.map((p) => fetchPokemon(p.name).catch(() => null)))
            _peers = results2.filter(Boolean) as Pokemon[]
            renderFull()
        }

        ;(window as any)._compareLoadMore = () => {
            _displayCount += 20
            renderList()
        }
    } catch {
        el.innerHTML = '<p class="text-center text-red-400 py-10 text-sm">Failed to load type data.</p>'
    }
}
