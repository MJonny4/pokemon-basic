import Alpine from 'alpinejs'
import { fetchPokemonList } from '../api/pokeapi'

export function registerSearchBar(): void {
    Alpine.data('searchBar', () => ({
        query: '',
        acResults: [] as Array<{ name: string; id: number }>,
        acOpen: false,
        history: [] as Array<{ name: string; id: number }>,
        allPokemon: [] as Array<{ name: string; id: number }>,
        acTimer: 0,

        async init() {
            try {
                const stored = localStorage.getItem('pr_history')
                if (stored) this.history = JSON.parse(stored)
            } catch {}
            this.allPokemon = await fetchPokemonList()
        },

        handleInput() {
            clearTimeout(this.acTimer)
            if (!this.query || this.query.length < 2) {
                this.acOpen = false
                return
            }
            this.acTimer = window.setTimeout(() => {
                const q = this.query.toLowerCase()
                this.acResults = this.allPokemon.filter((p: { name: string }) => p.name.includes(q)).slice(0, 8)
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
            try {
                localStorage.setItem('pr_history', JSON.stringify(this.history))
            } catch {}
        },

        clearHistory() {
            this.history = []
            try {
                localStorage.removeItem('pr_history')
            } catch {}
        },

        capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
    }))
}
