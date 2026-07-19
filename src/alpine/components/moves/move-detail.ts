import Alpine from 'alpinejs'
import { fetchMoveInfo } from '../../../lib/api/pokeapi'

export function registerMoveDetail(): void {
    Alpine.data('moveDetail', () => ({
        learners: [] as Array<{ name: string; id: number }>,
        longEffect: '',
        shortEffect: '',
        loading: true,
        failed: false,

        async init() {
            const el = this.$el as HTMLElement
            const move = el.dataset.move
            this.shortEffect = el.dataset.effect ?? ''
            if (!move) { this.loading = false; return }
            try {
                const info = await fetchMoveInfo(move)
                this.learners = info.learners
                this.longEffect = info.longEffect
            } catch {
                this.failed = true
            }
            this.loading = false
        },

        /** Show the technical text only when it adds something over the short effect */
        get hasTechnical(): boolean {
            return !!this.longEffect && this.longEffect !== this.shortEffect
        },

        openPokemon(name: string) {
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name } }))
        },

        capitalize: (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
}
