import Alpine from 'alpinejs'
import { fetchPokemonList } from '../../../lib/api/pokeapi'
import { GEN_RANGES } from '../../../lib/data/constants'

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GEN_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

export function registerSearchBar(): void {
    Alpine.data('searchBar', () => ({
        query: '',
        acResults: [] as Array<{ name: string; id: number }>,
        acOpen: false,
        history: [] as Array<{ name: string; id: number }>,
        allPokemon: [] as Array<{ name: string; id: number }>,
        acTimer: 0,
        selectedGens: [...ALL_GENS] as number[],
        genLabels: GEN_LABEL,
        gens: ALL_GENS,

        async init() {
            try {
                const stored = localStorage.getItem('pr_history')
                if (stored) this.history = JSON.parse(stored)
            } catch {}
            try {
                const storedGens = localStorage.getItem('pr_gen_filter')
                if (storedGens) this.selectedGens = JSON.parse(storedGens)
            } catch {}
            this.allPokemon = await fetchPokemonList()
        },

        handleInput() {
            clearTimeout(this.acTimer)
            if (!this.query || this.query.length < 2) { this.acOpen = false; return }
            this.acTimer = window.setTimeout(() => {
                const q = this.query.toLowerCase()
                const gens = this.selectedGens as number[]
                const allActive = gens.length === ALL_GENS.length
                this.acResults = this.allPokemon
                    .filter((p: { name: string; id: number }) => {
                        if (!p.name.includes(q)) return false
                        if (allActive) return true
                        return gens.some((g: number) => p.id >= GEN_RANGES[g][0] && p.id <= GEN_RANGES[g][1])
                    })
                    .slice(0, 8)
                this.acOpen = this.acResults.length > 0
            }, 150)
        },

        select(name: string) {
            if (!name) return
            this.query = name
            this.acOpen = false
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name } }))
        },

        addToHistory(name: string, id: number) {
            this.history = this.history.filter((h: { name: string }) => h.name !== name)
            this.history.unshift({ name, id })
            if (this.history.length > 6) this.history.pop()
            try { localStorage.setItem('pr_history', JSON.stringify(this.history)) } catch {}
        },

        clearHistory() {
            this.history = []
            try { localStorage.removeItem('pr_history') } catch {}
        },

        toggleGen(gen: number) {
            const gens = this.selectedGens as number[]
            if (gens.includes(gen)) {
                if (gens.length > 1) this.selectedGens = gens.filter((g) => g !== gen)
            } else {
                this.selectedGens = [...gens, gen].sort((a, b) => a - b)
            }
            try { localStorage.setItem('pr_gen_filter', JSON.stringify(this.selectedGens)) } catch {}
            this.handleInput()
        },

        resetGens() {
            this.selectedGens = [...ALL_GENS]
            try { localStorage.setItem('pr_gen_filter', JSON.stringify(this.selectedGens)) } catch {}
            this.handleInput()
        },

        isGenActive(gen: number): boolean {
            return (this.selectedGens as number[]).includes(gen)
        },

        allGensActive(): boolean {
            return (this.selectedGens as number[]).length === ALL_GENS.length
        },

        capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
    }))
}
