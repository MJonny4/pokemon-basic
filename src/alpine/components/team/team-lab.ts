import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { fetchPokemon, fetchPokemonList } from '../../../lib/api/pokeapi'
import { TYPE_COLORS } from '../../../lib/data/constants'
import { typeCardStyle } from '../../../ui/badges'
import { validateTeamForBattle } from '../../../lib/logic/battle-engine'
import { compareGen1Team } from '../../../lib/logic/gen1-matchup'
import { exportShowdownTeam } from '../../../lib/logic/team-portability'
import type { RedBlueOpponent, RedBlueOpponentManifest, RedBlueOpponentMember } from '../../../lib/data/guides/red-blue/opponents'

export function registerTeamLab(): void {
    Alpine.data('teamLab', () => ({
        searchSlot: null as number | null,
        query: '',
        results: [] as Array<{ name: string; id: number }>,
        allPokemon: [] as Array<{ name: string; id: number }>,
        timer: 0,
        addingSlot: null as number | null,
        teamCopied: false,
        dragSource: null as number | null,
        toast: { show: false, message: '' } as { show: boolean; message: string },
        opponentManifest: null as RedBlueOpponentManifest | null,
        opponentId: '',
        opponentStarterId: 1 as 1 | 4 | 7,
        opponentMessage: '',

        get currentOpponent(): RedBlueOpponent | null {
            return this.opponentManifest?.opponents.find((opponent) => opponent.id === this.opponentId) ?? null
        },

        get opponentParty(): RedBlueOpponentMember[] {
            const opponent = this.currentOpponent
            return opponent?.party ?? opponent?.variants?.find((variant) => variant.playerStarterDexId === this.opponentStarterId)?.party ?? []
        },

        get opponentRows() {
            if (!this.opponentManifest) return []
            return compareGen1Team((Alpine.store('team') as any).slots, this.opponentParty, this.opponentManifest)
        },

        async loadOpponent(id: string, starter: string | null) {
            if (!/^[a-z0-9-]+:[a-z0-9-]+$/.test(id)) { this.opponentMessage = 'This opponent link is invalid.'; return }
            const chosen = Number(starter)
            this.opponentStarterId = chosen === 4 || chosen === 7 ? chosen : 1
            this.opponentId = id
            this.opponentMessage = 'Loading source-checked Red/Blue opponent…'
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}/data/red-blue-opponents.json`)
                if (!response.ok) throw new Error('Opponent data unavailable')
                const data: RedBlueOpponentManifest = await response.json()
                if (data.schemaVersion !== 1 || data.guideId !== 'red-blue' || data.generation !== 1 || !Array.isArray(data.opponents) ||
                    !data.species || !data.moves || !data.typeChart) throw new Error('Opponent data invalid')
                this.opponentManifest = data
                this.opponentMessage = this.currentOpponent ? '' : 'This opponent is not in the reviewed Red/Blue guide.'
            } catch { this.opponentMessage = 'Opponent data could not be loaded. Try again when the page is online.' }
        },

        chooseOpponentStarter(id: 1 | 4 | 7) {
            if (![1, 4, 7].includes(id)) return
            this.opponentStarterId = id
            const url = new URL(window.location.href)
            url.searchParams.set('starter', String(id))
            history.replaceState({}, '', url)
        },

        async init() {
            ;(Alpine.store('team') as any).loadFromLocal()
            fetchPokemonList().then((list) => {
                this.allPokemon = list
            })
            // Handle ?add=pokemon-name URL param (from Pokédex "Add to Team Lab" button)
            const params = new URLSearchParams(window.location.search)
            const opponentId = params.get('opponent')
            if (opponentId) void this.loadOpponent(opponentId, params.get('starter'))
            const addName = params.get('add')
            if (addName) {
                params.delete('add')
                history.replaceState({}, '', window.location.pathname + (params.size ? `?${params}` : ''))
                await this.addByName(addName.toLowerCase())
            }
        },

        openSearch(i: number) {
            this.searchSlot = i
            this.query = ''
            this.results = []
            this.$nextTick(() => {
                ;(document.getElementById(`slot-input-${i}`) as HTMLInputElement | null)?.focus()
            })
        },

        closeSearch() {
            this.searchSlot = null
            this.query = ''
            this.results = []
        },

        handleInput() {
            clearTimeout(this.timer)
            if (!this.query || this.query.length < 2) {
                this.results = []
                return
            }
            this.timer = window.setTimeout(() => {
                const q = (this.query as string).toLowerCase()
                this.results = (this.allPokemon as Array<{ name: string; id: number }>)
                    .filter((p) => p.name.includes(q))
                    .slice(0, 6)
            }, 150)
        },

        async selectResult(name: string, slotIndex: number) {
            this.closeSearch()
            this.addingSlot = slotIndex
            try {
                const pokemon = await fetchPokemon(name)
                ;(Alpine.store('team') as any).addToSlot(slotIndex, pokemon)
                this.$nextTick(() => {
                    const card = document.getElementById(`slot-card-${slotIndex}`)
                    if (card) {
                        gsap.fromTo(
                            card,
                            { scale: 0.6, opacity: 0 },
                            { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform,opacity' },
                        )
                    }
                })
            } finally {
                this.addingSlot = null
            }
        },

        showToast(message: string) {
            this.toast = { show: true, message }
            setTimeout(() => { this.toast.show = false }, 3000)
        },

        startDrag(i: number) {
            this.dragSource = i
        },

        onDrop(i: number) {
            if (this.dragSource === null || this.dragSource === i) { this.dragSource = null; return }
            ;(Alpine.store('team') as any).swapSlots(this.dragSource, i)
            this.dragSource = null
        },

        async addByName(name: string) {
            const store = Alpine.store('team') as any
            const firstEmpty = (store.slots as any[]).findIndex((s: any) => s === null)
            if (firstEmpty === -1) {
                this.showToast('Team is full — remove a Pokémon to add more')
                return
            }
            this.addingSlot = firstEmpty
            try {
                const pokemon = await fetchPokemon(name)
                store.addToSlot(firstEmpty, pokemon)
                this.$nextTick(() => {
                    const card = document.getElementById(`slot-card-${firstEmpty}`)
                    if (card) {
                        gsap.fromTo(
                            card,
                            { scale: 0.6, opacity: 0 },
                            { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform,opacity' },
                        )
                    }
                })
            } catch {
                // ignore — invalid name from URL param
            } finally {
                this.addingSlot = null
            }
        },

        exportTeam(): string {
            return exportShowdownTeam((Alpine.store('team') as any).slots)
        },

        async copyTeam() {
            const text = this.exportTeam()
            if (!text) return
            try {
                await navigator.clipboard.writeText(text)
                this.teamCopied = true
                setTimeout(() => { this.teamCopied = false }, 2000)
            } catch {}
        },

        openSetEditor(i: number) {
            ;(Alpine.store('team') as any).activeSlot = i
            this.$nextTick(() => {
                const panel = document.getElementById('set-editor-panel')
                if (panel) {
                    gsap.fromTo(
                        panel,
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'transform,opacity' },
                    )
                }
            })
        },

        removeSlot(i: number) {
            ;(Alpine.store('team') as any).removeFromSlot(i)
            if ((Alpine.store('team') as any).activeSlot === i) {
                ;(Alpine.store('team') as any).activeSlot = null
            }
        },

        // Same rules the sim itself enforces (partial teams OK, items optional) —
        // previously this button demanded a full 6 while the sim accepted 1-5.
        validateForBattle(): boolean {
            const slots = (Alpine.store('team') as any).slots
            const errors = validateTeamForBattle(slots)
            if (errors.length > 0) {
                this.showToast(errors[0])
                return false
            }
            return true
        },

        capitalize: (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),

        typeIcon(type: string): string {
            return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`
        },

        typeColor(type: string): string {
            return TYPE_COLORS[type.toLowerCase()] ?? '#9CA3AF'
        },

        /** Colored-border card skin for a filled team slot, keyed to the mon's first type. */
        slotCardStyle(slot: { types?: string[] } | null): string {
            return typeCardStyle(slot?.types?.[0] ?? '')
        },
    }))
}
