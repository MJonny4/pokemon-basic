import Alpine from 'alpinejs'
import { TYPE_COLORS } from '../../../lib/data/constants'
import { getTypeIcon } from '../../../ui/badges'
import { moveCard, type MoveListEntry } from '../../../ui/move-card'

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GEN_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const PAGE_SIZE = 48

// No "Gen" sort — the Generation filter already covers gen-based browsing
const SORT_OPTIONS = [
    { key: 'name', label: 'Name' },
    { key: 'power', label: 'Power' },
    { key: 'acc', label: 'Acc' },
    { key: 'pp', label: 'PP' },
] as const
type SortKey = (typeof SORT_OPTIONS)[number]['key']

// Filters survive navigating into a move and back (sessionStorage = per tab)
const FILTERS_KEY = 'pb_moves_filters'

export function registerMovesIndex(): void {
    Alpine.data('movesIndex', () => ({
        all: [] as MoveListEntry[],
        selectedType: 'all',
        selectedCls: 'all',
        selectedGens: [...ALL_GENS] as number[],
        searchQuery: '',
        sortKey: 'name' as SortKey,
        page: 0,

        typeList: Object.keys(TYPE_COLORS),
        clsList: ['physical', 'special', 'status'],
        sortOptions: SORT_OPTIONS,
        genLabels: GEN_LABEL,
        gens: ALL_GENS,

        init() {
            const raw = (this.$el as HTMLElement).dataset.moves
            if (raw) this.all = JSON.parse(raw)
            this.restoreFilters()
            for (const prop of ['selectedType', 'selectedCls', 'selectedGens', 'searchQuery', 'sortKey', 'page']) {
                this.$watch(prop, () => this.persistFilters())
            }
        },

        restoreFilters() {
            try {
                const saved = JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? 'null')
                if (!saved) return
                if (['all', ...this.typeList].includes(saved.selectedType)) this.selectedType = saved.selectedType
                if (['all', ...this.clsList].includes(saved.selectedCls)) this.selectedCls = saved.selectedCls
                if (Array.isArray(saved.selectedGens) && saved.selectedGens.length) {
                    this.selectedGens = saved.selectedGens.filter((g: number) => ALL_GENS.includes(g))
                }
                if (typeof saved.searchQuery === 'string') this.searchQuery = saved.searchQuery
                if (SORT_OPTIONS.some((o) => o.key === saved.sortKey)) this.sortKey = saved.sortKey
                if (typeof saved.page === 'number' && saved.page >= 0) this.page = Math.min(saved.page, this.totalPages - 1)
            } catch {
                // corrupt state — start clean
            }
        },

        persistFilters() {
            sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
                selectedType: this.selectedType,
                selectedCls: this.selectedCls,
                selectedGens: this.selectedGens,
                searchQuery: this.searchQuery,
                sortKey: this.sortKey,
                page: this.page,
            }))
        },

        get filtered(): MoveListEntry[] {
            const q = this.searchQuery.trim().toLowerCase().replace(/\s+/g, '-')
            const gens = this.selectedGens as number[]
            const allGens = gens.length === ALL_GENS.length
            return (this.all as MoveListEntry[]).filter((m) => {
                if (this.selectedType !== 'all' && m.type !== this.selectedType) return false
                if (this.selectedCls !== 'all' && m.cls !== this.selectedCls) return false
                if (!allGens && !gens.includes(m.gen)) return false
                if (q && !m.slug.includes(q)) return false
                return true
            })
        },

        get sorted(): MoveListEntry[] {
            const key = this.sortKey as SortKey
            const list = [...this.filtered]
            if (key === 'name') return list.sort((a, b) => a.slug.localeCompare(b.slug))
            // Numeric sorts descend; null power/accuracy sinks to the bottom
            return list.sort((a, b) => ((b[key] as number | null) ?? -1) - ((a[key] as number | null) ?? -1))
        },

        get totalPages(): number {
            return Math.max(1, Math.ceil(this.sorted.length / PAGE_SIZE))
        },

        get pageItems(): MoveListEntry[] {
            return this.sorted.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE)
        },

        selectType(t: string) { this.selectedType = t; this.page = 0 },
        selectCls(c: string) { this.selectedCls = c; this.page = 0 },
        setSort(k: SortKey) { this.sortKey = k; this.page = 0 },
        prevPage() { if (this.page > 0) { this.page--; window.scrollTo({ top: 0 }) } },
        nextPage() { if (this.page < this.totalPages - 1) { this.page++; window.scrollTo({ top: 0 }) } },

        toggleGen(gen: number) {
            const gens = this.selectedGens as number[]
            if (gens.includes(gen)) {
                if (gens.length > 1) this.selectedGens = gens.filter((g) => g !== gen)
            } else {
                this.selectedGens = [...gens, gen].sort((a, b) => a - b)
            }
            this.page = 0
        },
        resetGens() { this.selectedGens = [...ALL_GENS]; this.page = 0 },
        isGenActive(gen: number): boolean { return (this.selectedGens as number[]).includes(gen) },
        allGensActive(): boolean { return (this.selectedGens as number[]).length === ALL_GENS.length },

        typeColor(t: string): string { return TYPE_COLORS[t] ?? '#999' },
        typeIconUrl(t: string): string { return getTypeIcon(t) },
        moveCardHtml(m: MoveListEntry): string { return moveCard(m, import.meta.env.BASE_URL) },
        capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
    }))
}
