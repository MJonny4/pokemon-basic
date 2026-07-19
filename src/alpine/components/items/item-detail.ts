import Alpine from 'alpinejs'
import { fetchItemInfo } from '../../../lib/api/pokeapi'

export function registerItemDetail(): void {
    Alpine.data('itemDetail', () => ({
        holders: [] as Array<{ name: string; id: number }>,
        loading: true,
        failed: false,

        async init() {
            const item = (this.$el as HTMLElement).dataset.item
            if (!item) { this.loading = false; return }
            try {
                this.holders = (await fetchItemInfo(item)).holders
            } catch {
                this.failed = true
            }
            this.loading = false
        },

        openPokemon(name: string) {
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name } }))
        },

        capitalize: (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
}
