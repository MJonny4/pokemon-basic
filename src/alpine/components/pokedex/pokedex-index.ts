import Alpine from 'alpinejs'
import { TYPE_COLORS } from '../../../lib/data/constants'
import { typeListForGen } from '../../../lib/data/type-history'
import { getTypeIcon } from '../../../ui/badges'
import { pokemonCard, type PokedexEntry } from '../../../ui/pokemon-card'

const PAGE_SIZE = 60

const SORT_OPTIONS = [
    { key: 'id', label: '#' },
    { key: 'name', label: 'Name' },
    { key: 'bst', label: 'BST' },
    { key: 'h', label: 'Height' },
    { key: 'w', label: 'Weight' },
] as const
type SortKey = (typeof SORT_OPTIONS)[number]['key']

export function registerPokedexIndex(): void {
    Alpine.data('pokedexIndex', () => ({
        all: [] as PokedexEntry[],
        shiny: false,
        selectedType: 'all',
        searchQuery: '',
        sortKey: 'id' as SortKey,
        sortDesc: false,
        page: 0,

        typeList: Object.keys(TYPE_COLORS),
        sortOptions: SORT_OPTIONS,

        init() {
            const el = this.$el as HTMLElement
            if (el.dataset.pokemon) this.all = JSON.parse(el.dataset.pokemon)
            this.shiny = el.dataset.shiny === 'true'
            // Only offer types that existed in this game's generation
            this.typeList = typeListForGen(Number(el.dataset.gen ?? 0))
        },

        get filtered(): PokedexEntry[] {
            const q = this.searchQuery.trim().toLowerCase()
            return (this.all as PokedexEntry[]).filter((p) => {
                if (this.selectedType !== 'all' && !p.types.includes(this.selectedType)) return false
                if (q && !p.name.includes(q)) return false
                return true
            })
        },

        get sorted(): PokedexEntry[] {
            const key = this.sortKey as SortKey
            const list = [...this.filtered]
            list.sort((a, b) => key === 'name' ? a.name.localeCompare(b.name) : (a[key] as number) - (b[key] as number))
            if (this.sortDesc) list.reverse()
            return list
        },

        get totalPages(): number {
            return Math.max(1, Math.ceil(this.sorted.length / PAGE_SIZE))
        },

        get pageItems(): PokedexEntry[] {
            return this.sorted.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE)
        },

        selectType(t: string) { this.selectedType = t; this.page = 0 },
        setSort(k: SortKey) {
            // Second click on the same key flips direction; BST/size default to descending
            if (this.sortKey === k) this.sortDesc = !this.sortDesc
            else { this.sortKey = k; this.sortDesc = k === 'bst' || k === 'h' || k === 'w' }
            this.page = 0
        },
        prevPage() { if (this.page > 0) { this.page--; window.scrollTo({ top: 0 }) } },
        nextPage() { if (this.page < this.totalPages - 1) { this.page++; window.scrollTo({ top: 0 }) } },

        typeColor(t: string): string { return TYPE_COLORS[t] ?? '#999' },
        typeIconUrl(t: string): string { return getTypeIcon(t) },
        pokemonCardHtml(p: PokedexEntry): string { return pokemonCard(p, import.meta.env.BASE_URL, this.shiny) },
        capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
    }))
}
