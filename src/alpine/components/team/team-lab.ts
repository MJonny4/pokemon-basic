import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { fetchPokemon, fetchPokemonList } from '../../../lib/api/pokeapi'
import { TYPE_COLORS } from '../../../lib/data/constants'
import { typeCardStyle } from '../../../ui/badges'
import { validateTeamForBattle } from '../../../lib/logic/battle-engine'

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

        async init() {
            ;(Alpine.store('team') as any).loadFromLocal()
            fetchPokemonList().then((list) => {
                this.allPokemon = list
            })
            // Handle ?add=pokemon-name URL param (from Pokédex "Add to Team Lab" button)
            const params = new URLSearchParams(window.location.search)
            const addName = params.get('add')
            if (addName) {
                history.replaceState({}, '', window.location.pathname)
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
            const LABELS: Record<string, string> = {
                hp: 'HP', attack: 'Atk', defense: 'Def',
                'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
            }
            const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
            const cap = (s: string) => s.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
            const slots = (Alpine.store('team') as any).slots as any[]
            return slots
                .filter((s: any) => s && s.pokemonName)
                .map((s: any) => {
                    const lines: string[] = []
                    lines.push(s.item ? `${cap(s.pokemonName)} @ ${s.item}` : cap(s.pokemonName))
                    // Keep parity with the per-mon exportShowdown() in set-editor.ts
                    if (s.ability) lines.push(`Ability: ${(s.ability as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`)
                    if (s.teraType) lines.push(`Tera Type: ${(s.teraType as string).charAt(0).toUpperCase() + (s.teraType as string).slice(1)}`)
                    lines.push(`Level: ${s.level ?? 50}`)
                    const evParts = STAT_KEYS.filter(k => (s.evs?.[k] ?? 0) > 0).map(k => `${s.evs[k]} ${LABELS[k]}`)
                    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`)
                    if (s.nature) lines.push(`${s.nature} Nature`)
                    const ivParts = STAT_KEYS.filter(k => (s.ivs?.[k] ?? 31) < 31).map(k => `${s.ivs[k]} ${LABELS[k]}`)
                    if (ivParts.length) lines.push(`IVs: ${ivParts.join(' / ')}`)
                    ;(s.moves as (string | null)[]).filter(Boolean).forEach(m => lines.push(`- ${cap(m!)}`))
                    return lines.join('\n')
                })
                .join('\n\n')
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
