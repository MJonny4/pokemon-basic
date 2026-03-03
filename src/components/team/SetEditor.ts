import Alpine from 'alpinejs'
import { recommendNatures } from '../../logic/natures'
import { recommendItems } from '../../logic/items'
import { NATURES } from '../../data/natures'
import { ITEMS } from '../../data/items'
import { fetchPokemon, fetchMoves, type MoveDetail } from '../../api/pokeapi'
import { calcStat } from '../../logic/statCalc'

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']

const STAT_LABELS: Record<string, string> = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spd',
}

// Showdown uses "Spe" for speed in export strings
const SHOWDOWN_LABELS: Record<string, string> = {
    hp: 'HP', attack: 'Atk', defense: 'Def',
    'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
}

const STAT_COLORS: Record<string, string> = {
    hp: '#ef4444',
    attack: '#f97316',
    defense: '#eab308',
    'special-attack': '#8b5cf6',
    'special-defense': '#06b6d4',
    speed: '#10b981',
}

// Inline type→color map used for move type badges
const TYPE_COLORS: Record<string, string> = {
    normal: '#9CA3AF', fire: '#F97316', water: '#3B82F6', electric: '#EAB308',
    grass: '#22C55E', ice: '#06B6D4', fighting: '#DC2626', poison: '#A855F7',
    ground: '#CA8A04', flying: '#818CF8', psychic: '#EC4899', bug: '#84CC16',
    rock: '#92400E', ghost: '#6D28D9', dragon: '#7C3AED', dark: '#374151',
    steel: '#94A3B8', fairy: '#F472B6',
}


export function registerSetEditor(): void {
    Alpine.data('setEditor', () => ({
        statKeys: STAT_KEYS,
        STAT_LABELS,
        STAT_COLORS,
        allNatures: Object.keys(NATURES),
        allItems: ITEMS,

        // ── move selector state ──────────────────────────────────
        availableMoves: [] as MoveDetail[],
        movesLoading: false,
        openMoveSlot: null as number | null,
        moveQuery: '',

        // ── copy feedback ────────────────────────────────────────
        copied: false,

        // ── reactive slot getter ─────────────────────────────────
        get slot(): any {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return null
            return (Alpine.store('team') as any).slots[i] ?? null
        },

        // ── derived getters ──────────────────────────────────────
        get totalEvs(): number {
            if (!this.slot) return 0
            return Object.values((this.slot as any).evs as Record<string, number>).reduce(
                (a: number, b: unknown) => a + (b as number), 0,
            )
        },

        get recommendedNatureNames(): string[] {
            if (!this.slot) return []
            const s = this.slot as any
            return recommendNatures(s.role ?? 'physical_sweeper', s.stats).slice(0, 5).map((n) => n.name)
        },

        get recommendedItems() {
            if (!this.slot) return ITEMS.slice(0, 6)
            const s = this.slot as any
            return recommendItems(s.role ?? 'physical_sweeper', s.types, false)
        },

        get allItemsWithFlag() {
            const recSet = new Set((this.recommendedItems as any[]).map((i: any) => i.name))
            return (ITEMS as any[]).map(item => ({ ...item, recommended: recSet.has(item.name) }))
        },

        get filteredMoves(): MoveDetail[] {
            const query = (this.moveQuery as string).toLowerCase().trim()
            const selected = new Set(((this.slot as any)?.moves as (string | null)[]).filter(Boolean))
            // exclude the slot currently being edited so it can still be re-selected
            if (this.openMoveSlot !== null) selected.delete((this.slot as any)?.moves[this.openMoveSlot as number] ?? null)
            const moves = (this.availableMoves as MoveDetail[]).filter((m) => !selected.has(m.name))
            if (!query) return moves.slice(0, 24)
            return moves.filter((m) => m.name.replace(/-/g, ' ').includes(query)).slice(0, 20)
        },

        // ── lifecycle ────────────────────────────────────────────
        async init() {
            this.$watch('$store.team.activeSlot', async (val: number | null) => {
                this.openMoveSlot = null
                this.moveQuery = ''
                if (val !== null) await this.loadMoves()
                else this.availableMoves = []
            })
            if ((Alpine.store('team') as any).activeSlot !== null) await this.loadMoves()
        },

        async loadMoves() {
            const s = this.slot as any
            if (!s) return
            this.movesLoading = true
            try {
                const pokemon = await fetchPokemon(s.pokemonName)
                this.availableMoves = await fetchMoves(pokemon.moves, 200)
            } finally {
                this.movesLoading = false
            }
        },

        // ── stat calculator ──────────────────────────────────────
        statValue(key: string): number {
            const s = this.slot as any
            if (!s) return 0
            return calcStat(
                key,
                s.stats[key] ?? 0,
                s.ivs?.[key] ?? 31,
                s.evs?.[key] ?? 0,
                s.level ?? 50,
                s.nature ?? null,
            )
        },

        // nature effect on a stat: 1 = boost, -1 = reduce, 0 = neutral
        natureEffect(key: string): number {
            const s = this.slot as any
            if (!s?.nature) return 0
            const entry = NATURES[s.nature as string]
            if (!entry) return 0
            if (entry[0] === key) return 1
            if (entry[1] === key) return -1
            return 0
        },

        // ── setters ──────────────────────────────────────────────
        closeEditor() {
            ;(Alpine.store('team') as any).activeSlot = null
            this.openMoveSlot = null
            this.moveQuery = ''
        },

        setNature(name: string) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            ;(Alpine.store('team') as any).updateSlot(i, { nature: name })
        },

        setItem(name: string) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            const current = (this.slot as any)?.item
            ;(Alpine.store('team') as any).updateSlot(i, { item: current === name ? null : name })
        },

        setEv(stat: string, value: number) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null || !this.slot) return
            const current = { ...(this.slot as any).evs } as Record<string, number>
            const others = Object.entries(current).filter(([k]) => k !== stat).reduce((acc, [, v]) => acc + (v as number), 0)
            current[stat] = Math.max(0, Math.min(Math.min(252, 508 - others), Number(value)))
            ;(Alpine.store('team') as any).updateSlot(i, { evs: current })
        },

        resetEvs() {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            ;(Alpine.store('team') as any).updateSlot(i, {
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
            })
        },

        setIv(stat: string, value: number) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null || !this.slot) return
            const current = { ...(this.slot as any).ivs } as Record<string, number>
            current[stat] = Math.max(0, Math.min(31, Number(value)))
            ;(Alpine.store('team') as any).updateSlot(i, { ivs: current })
        },

        resetIvs() {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            ;(Alpine.store('team') as any).updateSlot(i, {
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
            })
        },

        setLevel(val: number) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            ;(Alpine.store('team') as any).updateSlot(i, { level: Math.max(1, Math.min(100, val)) })
        },

        // ── move selector ─────────────────────────────────────────
        toggleMoveSearch(slotIdx: number) {
            if (this.openMoveSlot === slotIdx) {
                this.openMoveSlot = null
                this.moveQuery = ''
            } else {
                this.openMoveSlot = slotIdx
                this.moveQuery = ''
                this.$nextTick(() => {
                    const el = document.getElementById(`move-input-${slotIdx}`) as HTMLInputElement | null
                    el?.focus()
                })
            }
        },

        selectMove(slotIdx: number, moveName: string) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null || !this.slot) return
            const moves = [...(this.slot as any).moves] as (string | null)[]
            moves[slotIdx] = moveName
            ;(Alpine.store('team') as any).updateSlot(i, { moves })
            this.openMoveSlot = null
            this.moveQuery = ''
        },

        isStab(moveName: string | null): boolean {
            if (!moveName || !this.slot) return false
            const move = (this.availableMoves as MoveDetail[]).find(m => m.name === moveName)
            if (!move) return false
            return (this.slot as any).types.includes(move.type?.name?.toLowerCase() ?? '')
        },

        clearMove(slotIdx: number) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null || !this.slot) return
            const moves = [...(this.slot as any).moves] as (string | null)[]
            moves[slotIdx] = null
            ;(Alpine.store('team') as any).updateSlot(i, { moves })
        },

        moveColor(type: string): string {
            return TYPE_COLORS[type] ?? '#9CA3AF'
        },

        moveCategoryIcon(cat: string): string {
            if (cat === 'physical') return '⚔️'
            if (cat === 'special') return '🔮'
            return '✨'
        },

        // ── Showdown export ───────────────────────────────────────
        exportShowdown(): string {
            const s = this.slot as any
            if (!s) return ''
            const name = (s.pokemonName as string)
                .split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
            const lines: string[] = []
            lines.push(s.item ? `${name} @ ${s.item}` : name)
            lines.push(`Level: ${s.level ?? 50}`)

            const evParts = STAT_KEYS.filter((k) => (s.evs[k] ?? 0) > 0).map((k) => `${s.evs[k]} ${SHOWDOWN_LABELS[k]}`)
            if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`)

            if (s.nature) lines.push(`${s.nature} Nature`)

            const ivParts = STAT_KEYS.filter((k) => (s.ivs?.[k] ?? 31) !== 31).map((k) => `${s.ivs[k]} ${SHOWDOWN_LABELS[k]}`)
            if (ivParts.length) lines.push(`IVs: ${ivParts.join(' / ')}`)

            for (const m of s.moves as (string | null)[]) {
                if (m) {
                    const moveName = m.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
                    lines.push(`- ${moveName}`)
                }
            }
            return lines.join('\n')
        },

        async copyShowdown() {
            const text = this.exportShowdown()
            if (!text) return
            try {
                await navigator.clipboard.writeText(text)
                this.copied = true
                setTimeout(() => { this.copied = false }, 2000)
            } catch {}
        },

        // ── nature helpers ────────────────────────────────────────
        naturePlus(name: string): string | null {
            return NATURES[name]?.[0] ?? null
        },

        natureMinus(name: string): string | null {
            return NATURES[name]?.[1] ?? null
        },

        isRecommendedNature(name: string): boolean {
            return (this.recommendedNatureNames as string[]).includes(name)
        },

        natureLabel(name: string): string {
            const plus = NATURES[name]?.[0]
            const minus = NATURES[name]?.[1]
            if (!plus) return name
            return `${name} +${STAT_LABELS[plus] ?? plus} −${STAT_LABELS[minus ?? ''] ?? minus}`
        },
    }))
}
