import Alpine from 'alpinejs'
import './style.css'
import { fetchPokemonList, fetchPokemon, fetchPokemonsByType } from './api/pokeapi'
import type { Pokemon } from './api/pokeapi'
import { TYPE_COLORS, TYPES, STAT_COLORS, STAT_LABELS, GEN_RANGES } from './data/constants'
import { typeBadge, getTypeIcon } from './ui/components'
import { registerStatsPokemonModal } from './components/stats/StatsPokemonModal'

declare global {
    interface Window {
        Alpine: typeof Alpine
    }
}

type SortKey = 'bst' | 'speed' | 'hp' | 'attack' | 'special-attack' | 'defense' | 'special-defense'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'bst',             label: '⭐ BST'   },
    { key: 'hp',              label: '❤️ HP'    },
    { key: 'attack',          label: '⚔️ Atk'   },
    { key: 'defense',         label: '🛡️ Def'   },
    { key: 'special-attack',  label: '✨ SpA'   },
    { key: 'special-defense', label: '💠 SpDef' },
    { key: 'speed',           label: '⚡ Spd'   },
]

const TYPE_LIST = TYPES.map((t) => t.toLowerCase())
const PAGE_SIZE = 30
const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GEN_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

function getStat(p: Pokemon, key: SortKey): number {
    if (key === 'bst') return p.stats.reduce((s, x) => s + x.base_stat, 0)
    return p.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
}

function speedTier(spd: number): { label: string; color: string } {
    if (spd >= 120) return { label: '⚡ Blazing', color: '#8b5cf6' }
    if (spd >= 100) return { label: '🏃 Fast', color: '#3b82f6' }
    if (spd >= 80) return { label: '🟡 Above Avg', color: '#f59e0b' }
    if (spd >= 60) return { label: '⚪ Average', color: '#64748b' }
    return { label: '🐢 Slow', color: '#ef4444' }
}

Alpine.data('statsRanking', () => ({
    selectedType: '' as string,
    sortKey: 'bst' as SortKey,
    loaded: [] as Pokemon[],
    loading: false,
    loadingProgress: 0,
    loadingText: '',
    searchQuery: '',
    page: 0,
    selectedGens: [...ALL_GENS] as number[],
    genLabels: GEN_LABEL,
    gens: ALL_GENS,

    sortOptions: SORT_OPTIONS,
    typeList: TYPE_LIST,

    init() {
        try {
            const storedGens = localStorage.getItem('pr_gen_filter')
            if (storedGens) this.selectedGens = JSON.parse(storedGens)
        } catch {}
    },

    get sortedFiltered(): Pokemon[] {
        let list = [...(this.loaded as Pokemon[])]
        const q = (this.searchQuery as string).toLowerCase().trim()
        if (q) list = list.filter((p) => p.name.includes(q))
        const gens = this.selectedGens as number[]
        if (gens.length < ALL_GENS.length) {
            list = list.filter((p) => gens.some((g: number) => p.id >= GEN_RANGES[g][0] && p.id <= GEN_RANGES[g][1]))
        }
        const key = this.sortKey as SortKey
        return list.sort((a, b) => getStat(b, key) - getStat(a, key))
    },

    get totalPages(): number {
        return Math.max(1, Math.ceil((this.sortedFiltered as Pokemon[]).length / PAGE_SIZE))
    },

    get pageItems(): Pokemon[] {
        const sf = this.sortedFiltered as Pokemon[]
        const start = (this.page as number) * PAGE_SIZE
        return sf.slice(start, start + PAGE_SIZE)
    },

    get startRank(): number {
        return (this.page as number) * PAGE_SIZE + 1
    },

    typeColor(type: string): string {
        return TYPE_COLORS[type.toLowerCase()] ?? '#64748b'
    },

    typeIconUrl(type: string): string {
        return getTypeIcon(type.charAt(0).toUpperCase() + type.slice(1))
    },

    speedTier,
    STAT_COLORS,
    STAT_LABELS,

    getStatVal(p: Pokemon, key: string): number {
        if (key === 'bst') return p.stats.reduce((s, x) => s + x.base_stat, 0)
        return p.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
    },

    getStatBar(value: number, max: number, color: string): string {
        const pct = Math.min(100, Math.round((value / max) * 100))
        return `<div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${color}"></div></div>`
    },

    getPokemonTypes(p: Pokemon): string[] {
        return p.types.map((t) => t.type.name)
    },

    typeBadgeHtml(t: string): string {
        return typeBadge(t, 'sm')
    },

    capitalize(s: string): string {
        return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    },

    async selectType(type: string) {
        this.selectedType = type
        this.page = 0
        this.loaded = []
        this.loading = true
        this.loadingProgress = 0
        this.loadingText = ''
        try {
            if (type === 'all') {
                await (this as any).loadAll()
            } else {
                await (this as any).loadByType(type)
            }
        } finally {
            this.loading = false
        }
    },

    async loadByType(type: string) {
        this.loadingText = `Loading ${type.charAt(0).toUpperCase() + type.slice(1)} Pokémon…`
        const list = await fetchPokemonsByType(type)
        const results = await Promise.allSettled(list.map((p) => fetchPokemon(p.name)))
        this.loaded = results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => (r as PromiseFulfilledResult<Pokemon>).value)
    },

    async loadAll() {
        this.loadingText = 'Loading all Pokémon…'
        const list = await fetchPokemonList()
        const filtered = list.filter((p) => p.id <= 1025)
        const total = filtered.length
        const batchSize = 25
        const all: Pokemon[] = []

        for (let i = 0; i < total; i += batchSize) {
            const batch = filtered.slice(i, i + batchSize)
            const results = await Promise.allSettled(batch.map((p) => fetchPokemon(p.name)))
            results.forEach((r) => {
                if (r.status === 'fulfilled') all.push(r.value)
            })
            const done = Math.min(i + batchSize, total)
            this.loadingProgress = Math.round((done / total) * 100)
            this.loadingText = `Loading… ${done} / ${total} Pokémon`
        }
        this.loaded = all
    },

    toggleGen(gen: number) {
        const gens = this.selectedGens as number[]
        if (gens.includes(gen)) {
            if (gens.length > 1) this.selectedGens = gens.filter((g) => g !== gen)
        } else {
            this.selectedGens = [...gens, gen].sort((a, b) => a - b)
        }
        try { localStorage.setItem('pr_gen_filter', JSON.stringify(this.selectedGens)) } catch {}
        this.page = 0
    },

    resetGens() {
        this.selectedGens = [...ALL_GENS]
        try { localStorage.setItem('pr_gen_filter', JSON.stringify(this.selectedGens)) } catch {}
        this.page = 0
    },

    isGenActive(gen: number): boolean {
        return (this.selectedGens as number[]).includes(gen)
    },

    allGensActive(): boolean {
        return (this.selectedGens as number[]).length === ALL_GENS.length
    },

    setSort(key: SortKey) {
        this.sortKey = key
        this.page = 0
    },

    prevPage() {
        if ((this.page as number) > 0) this.page = (this.page as number) - 1
    },

    nextPage() {
        if ((this.page as number) < (this.totalPages as number) - 1)
            this.page = (this.page as number) + 1
    },
}))

registerStatsPokemonModal()
window.Alpine = Alpine
Alpine.start()
