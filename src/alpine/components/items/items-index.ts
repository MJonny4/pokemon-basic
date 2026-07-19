import Alpine from 'alpinejs'
import { itemCard, pocketLabel, type ItemListEntry } from '../../../ui/item-card'

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GEN_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const PAGE_SIZE = 48
const POCKETS = ['misc', 'medicine', 'pokeballs', 'machines', 'berries', 'battle', 'key', 'mail']
const SORT_KEYS = ['name', 'gen', 'cost'] as const
type SortKey = (typeof SORT_KEYS)[number]

// Filters survive navigating into an item and back (sessionStorage = per tab)
const FILTERS_KEY = 'pb_items_filters'

export function registerItemsIndex(): void {
    Alpine.data('itemsIndex', () => ({
        all: [] as ItemListEntry[],
        selectedPocket: 'all',
        selectedGens: [...ALL_GENS] as number[],
        searchQuery: '',
        sortKey: 'name' as SortKey,
        page: 0,

        pockets: POCKETS,
        genLabels: GEN_LABEL,
        gens: ALL_GENS,

        init() {
            const raw = (this.$el as HTMLElement).dataset.items
            if (raw) this.all = JSON.parse(raw)
            this.restoreFilters()
            for (const prop of ['selectedPocket', 'selectedGens', 'searchQuery', 'sortKey', 'page']) {
                this.$watch(prop, () => this.persistFilters())
            }
        },

        restoreFilters() {
            try {
                const saved = JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? 'null')
                if (!saved) return
                if (['all', ...POCKETS].includes(saved.selectedPocket)) this.selectedPocket = saved.selectedPocket
                if (Array.isArray(saved.selectedGens) && saved.selectedGens.length) {
                    this.selectedGens = saved.selectedGens.filter((g: number) => ALL_GENS.includes(g))
                }
                if (typeof saved.searchQuery === 'string') this.searchQuery = saved.searchQuery
                if (SORT_KEYS.includes(saved.sortKey)) this.sortKey = saved.sortKey
                if (typeof saved.page === 'number' && saved.page >= 0) this.page = Math.min(saved.page, this.totalPages - 1)
            } catch {
                // corrupt state — start clean
            }
        },

        persistFilters() {
            sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
                selectedPocket: this.selectedPocket,
                selectedGens: this.selectedGens,
                searchQuery: this.searchQuery,
                sortKey: this.sortKey,
                page: this.page,
            }))
        },

        get filtered(): ItemListEntry[] {
            const q = this.searchQuery.trim().toLowerCase()
            const gens = this.selectedGens as number[]
            const allGens = gens.length === ALL_GENS.length
            return (this.all as ItemListEntry[]).filter((i) => {
                if (this.selectedPocket !== 'all' && i.pocket !== this.selectedPocket) return false
                // Unknown-gen items only show when no gen filter is applied
                if (!allGens && (i.gen === null || !gens.includes(i.gen))) return false
                if (q && !i.name.toLowerCase().includes(q) && !i.slug.includes(q)) return false
                return true
            })
        },

        get sorted(): ItemListEntry[] {
            const list = [...this.filtered]
            if (this.sortKey === 'gen') return list.sort((a, b) => (a.gen ?? 99) - (b.gen ?? 99) || a.name.localeCompare(b.name))
            // Cost descends — priciest first; free/priceless items sink to the bottom
            if (this.sortKey === 'cost') return list.sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name))
            return list.sort((a, b) => a.name.localeCompare(b.name))
        },

        get totalPages(): number {
            return Math.max(1, Math.ceil(this.sorted.length / PAGE_SIZE))
        },

        get pageItems(): ItemListEntry[] {
            return this.sorted.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE)
        },

        selectPocket(p: string) { this.selectedPocket = p; this.page = 0 },
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

        pocketLabel(p: string): string { return pocketLabel(p) },
        itemCardHtml(i: ItemListEntry): string { return itemCard(i, import.meta.env.BASE_URL) },
    }))
}
