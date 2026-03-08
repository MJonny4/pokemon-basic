import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { fetchPokemon, fetchPokemonList } from '../../api/pokeapi'

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

        validateForBattle(): boolean {
            const slots = (Alpine.store('team') as any).slots as any[]
            const emptySlots = slots.map((s: any, i: number) => s ? null : i + 1).filter((n: number | null) => n !== null)
            if (emptySlots.length > 0) {
                const slotWord = emptySlots.length === 1 ? 'Slot' : 'Slots'
                const isWord = emptySlots.length === 1 ? 'is' : 'are'
                this.showToast(`${slotWord} ${emptySlots.join(', ')} ${isWord} empty — you need a full team of 6 to battle!`)
                return false
            }
            const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
            for (const s of slots) {
                const missing: string[] = []
                if (!s.nature) missing.push('a nature')
                if (!s.item) missing.push('a held item')
                const emptyMoves = (s.moves as (string | null)[]).filter(m => !m).length
                if (emptyMoves > 0) missing.push(`${emptyMoves} move${emptyMoves > 1 ? 's' : ''}`)
                if (missing.length > 0) {
                    this.showToast(`${cap(s.pokemonName)} is missing: ${missing.join(', ')}`)
                    return false
                }
            }
            return true
        },

        capitalize: (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),

        typeIcon(type: string): string {
            return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`
        },

        typeColor(type: string): string {
            const MAP: Record<string, string> = {
                normal: '#9CA3AF', fire: '#F97316', water: '#3B82F6', electric: '#EAB308',
                grass: '#22C55E', ice: '#06B6D4', fighting: '#DC2626', poison: '#A855F7',
                ground: '#CA8A04', flying: '#818CF8', psychic: '#EC4899', bug: '#84CC16',
                rock: '#78716C', ghost: '#6D28D9', dragon: '#7C3AED', dark: '#374151',
                steel: '#94A3B8', fairy: '#F472B6',
            }
            return MAP[type.toLowerCase()] ?? '#9CA3AF'
        },
    }))
}
