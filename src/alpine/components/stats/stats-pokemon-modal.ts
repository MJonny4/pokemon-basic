import Alpine from 'alpinejs'
import { fetchPokemon, fetchSpecies } from '../../../lib/api/pokeapi'
import type { Pokemon } from '../../../lib/api/pokeapi'
import { TYPE_COLORS, STAT_COLORS, STAT_LABELS } from '../../../lib/data/constants'
import { typeBadge } from '../../../ui/badges'

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const

function speedTier(spd: number): { label: string; color: string } {
    if (spd >= 120) return { label: '⚡ Blazing', color: '#8b5cf6' }
    if (spd >= 100) return { label: '🏃 Fast', color: '#3b82f6' }
    if (spd >= 80) return { label: '🟡 Above Avg', color: '#f59e0b' }
    if (spd >= 60) return { label: '⚪ Average', color: '#64748b' }
    return { label: '🐢 Slow', color: '#ef4444' }
}


export function registerStatsPokemonModal(): void {
    Alpine.data('statsPokemonModal', () => ({
        open: false,
        loading: false,
        pokemon: null as Pokemon | null,
        bannerColor: '#7c3aed',
        speed: 0,
        bst: 0,
        stats: [] as Array<{ label: string; color: string; value: number; pct: number }>,
        typeBadgesHtml: '',
        generation: '',
        flavorText: '',

        init() {
            // Expose globally so any page can call window.openPokemonQuickView(name)
            ;(window as any).openPokemonQuickView = (name: string) => this.openModal(name)
        },

        speedTier,

        async openModal(name: string) {
            this.open = true
            this.loading = true
            this.pokemon = null
            try {
                const [pokemon, species] = await Promise.all([
                    fetchPokemon(name),
                    fetchSpecies(name).catch(() => null),
                ])
                const types = pokemon.types.map((t) => t.type.name)
                this.pokemon = pokemon
                this.bannerColor = TYPE_COLORS[types[0]] ?? '#7c3aed'
                this.speed = pokemon.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 0
                this.bst = pokemon.stats.reduce((s, x) => s + x.base_stat, 0)
                this.stats = STAT_KEYS.map((key) => {
                    const val = pokemon.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
                    return {
                        label: STAT_LABELS[key] ?? key.toUpperCase(),
                        color: STAT_COLORS[key] ?? '#8b5cf6',
                        value: val,
                        pct: Math.min(100, Math.round((val / 255) * 100)),
                    }
                })
                this.typeBadgesHtml = types.map((t) => typeBadge(t, 'sm')).join('')
                const genRaw = species?.generation?.name ?? ''
                this.generation = genRaw ? 'Gen ' + genRaw.split('-')[1].toUpperCase() : ''
                const ft = species?.flavor_text_entries?.find((e) => e.language.name === 'en')
                this.flavorText = ft?.flavor_text?.replace(/\f/g, ' ').replace(/\n/g, ' ') ?? ''
            } catch {
                this.open = false
            } finally {
                this.loading = false
            }
        },

        closeModal() {
            this.open = false
        },

        goToPokedex(name: string) {
            window.open(import.meta.env.BASE_URL + '?search=' + encodeURIComponent(name), '_blank')
        },
    }))

}
