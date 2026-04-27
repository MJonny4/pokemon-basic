import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { detectRole } from '../../../lib/logic/role-detect'
import { fetchPokemonList } from '../../../lib/api/pokeapi'

export function registerModal(): void {
    Alpine.data('modal', () => ({
        open: false,
        activeTab: 'overview' as string,
        tabs: [
            { id: 'overview', label: '📊 Overview' },
            { id: 'defense', label: '🛡️ Defense' },
            { id: 'moves', label: '⚔️ Moves' },
            { id: 'trainer', label: '🎯 Trainer Tips' },
            { id: 'compare', label: '🔄 Compare' },
        ],
        modalQuery: '',
        modalAcResults: [] as Array<{ name: string; id: number }>,
        modalAcOpen: false,
        modalAllPokemon: [] as Array<{ name: string; id: number }>,
        modalAcTimer: 0,
        moveFilter: 'all',
        moveSearch: '',
        moveFilters: [
            { id: 'all', label: 'All' },
            { id: 'damaging', label: 'Damaging' },
            { id: 'physical', label: 'Physical' },
            { id: 'special', label: 'Special' },
            { id: 'status', label: 'Status' },
            { id: 'egg', label: '🥚 Egg' },
            { id: 'tutor', label: '📚 Tutor' },
        ],

        init() {
            fetchPokemonList().then((list) => { this.modalAllPokemon = list })

            window.addEventListener('pokemon-search', () => {
                this.open = true
                this.activeTab = 'overview'
                this.moveFilter = 'all'
                this.moveSearch = ''
                this.modalQuery = ''
                this.modalAcOpen = false
            })

            this.$watch('open', (val: boolean) => {
                if (val) {
                    // Set initial state before Alpine removes display:none
                    gsap.set('#modal-overlay', { opacity: 0 })
                    gsap.set('#modal-box', { y: 40, scale: 0.93, opacity: 0 })
                    this.$nextTick(() => {
                        gsap.killTweensOf(['#modal-overlay', '#modal-box'])
                        gsap.to('#modal-overlay', { opacity: 1, duration: 0.25, ease: 'power2.out' })
                        gsap.to('#modal-box', {
                            y: 0,
                            scale: 1,
                            opacity: 1,
                            duration: 0.38,
                            ease: 'back.out(1.6)',
                            clearProps: 'transform,opacity',
                        })
                    })
                }
            })
        },

        close() {
            gsap.killTweensOf(['#modal-overlay', '#modal-box'])
            const tl = gsap.timeline({ onComplete: () => { this.open = false } })
            tl.to('#modal-box', { y: 18, scale: 0.96, opacity: 0, duration: 0.18, ease: 'power2.in' }, 0)
            tl.to('#modal-overlay', { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
        },

        setTab(id: string) {
            this.activeTab = id
            this.$nextTick(() => {
                gsap.fromTo(
                    '#modal-panels',
                    { opacity: 0, y: 8 },
                    { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' },
                )
            })
        },

        setFilter(id: string) {
            this.moveFilter = id
            ;(window as any).rerenderMoves?.(id, this.moveSearch)
        },

        onMoveSearch() {
            ;(window as any).rerenderMoves?.(this.moveFilter, this.moveSearch)
        },

        onModalSearch() {
            clearTimeout(this.modalAcTimer)
            if (!this.modalQuery || this.modalQuery.length < 2) { this.modalAcOpen = false; return }
            this.modalAcTimer = window.setTimeout(() => {
                const q = (this.modalQuery as string).toLowerCase()
                this.modalAcResults = (this.modalAllPokemon as Array<{ name: string; id: number }>)
                    .filter((p) => p.name.includes(q))
                    .slice(0, 6)
                this.modalAcOpen = this.modalAcResults.length > 0
            }, 150)
        },

        selectModal(name: string) {
            if (!name) return
            this.modalQuery = ''
            this.modalAcOpen = false
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name } }))
        },

        selectModalFirst() {
            const first = (this.modalAcResults as Array<{ name: string; id: number }>)[0]
            if (first) this.selectModal(first.name)
        },

        addToTeam() {
            const pokemon = (Alpine.store('pokemon') as any).pokemon
            if (!pokemon) return

            // Read team from localStorage directly — no navigation needed
            let slots: (object | null)[] = Array(6).fill(null)
            try {
                const raw = localStorage.getItem('team_lab')
                if (raw) {
                    const saved = JSON.parse(raw)
                    if (Array.isArray(saved) && saved.length === 6) slots = saved
                }
            } catch {}

            const firstEmpty = slots.findIndex((s) => s === null)
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)

            const alreadyInTeam = slots.some((s) => s !== null && (s as any).pokemonId === pokemon.id)
            if (alreadyInTeam) {
                window.dispatchEvent(new CustomEvent('team-toast', {
                    detail: {
                        message: `${name} is already part of your team!`,
                        type: 'error',
                    },
                }))
                return
            }

            if (firstEmpty === -1) {
                window.dispatchEvent(new CustomEvent('team-toast', {
                    detail: {
                        message: `Team is full! <a href="${import.meta.env.BASE_URL}/team" class="underline font-bold">Open Team Lab →</a> to make room.`,
                        type: 'error',
                    },
                }))
                return
            }

            const stats = Object.fromEntries(pokemon.stats.map((s: any) => [s.stat.name, s.base_stat]))
            const role = detectRole(stats)
            slots[firstEmpty] = {
                pokemonName: pokemon.name,
                pokemonId: pokemon.id,
                types: pokemon.types.map((t: any) => t.type.name),
                stats,
                nature: null,
                item: null,
                moves: [null, null, null, null],
                role: role.key,
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
                level: 50,
            }

            try {
                localStorage.setItem('team_lab', JSON.stringify(slots))
            } catch {}

            window.dispatchEvent(new CustomEvent('team-toast', {
                detail: {
                    message: `${name} added to your team! <a href="${import.meta.env.BASE_URL}/team" class="underline font-bold">Open Team Lab →</a>`,
                    type: 'success',
                },
            }))
        },
    }))
}

// darkenColor is exposed on window so Alpine template bindings can call it
if (typeof window !== 'undefined') {
    ;(window as any).darkenColor = function(hex: string, amt: number): string {
        if (!hex) return '#7c3aed'
        const n = parseInt(hex.replace('#', ''), 16)
        const r = Math.max(0, Math.min(255, (n >> 16) + amt))
        const g = Math.max(0, Math.min(255, (n >> 8 & 255) + amt))
        const b = Math.max(0, Math.min(255, (n & 255) + amt))
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)
    }
}
