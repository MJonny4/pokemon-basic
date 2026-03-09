import Alpine from 'alpinejs'
import { recommendNatures } from '../../logic/natures'
import { recommendItems } from '../../logic/items'
import { NATURES } from '../../data/natures'
import { ITEMS } from '../../data/items'
import { fetchPokemon, fetchMoves, fetchPokemonList, type MoveDetail } from '../../api/pokeapi'
import { calcStat } from '../../logic/statCalc'
import { calcDamageRange } from '../../logic/damageCalc'
import type { AttackerState, DefenderState, FieldState, DamageResult } from '../../logic/damageCalc'
import itemsFullRaw from '../../data/items-full.json'

interface FullItem { name: string; slug: string; desc: string }
const ITEMS_FULL: FullItem[] = itemsFullRaw as FullItem[]
// Keyed lookup for the custom picker selected card
const ITEMS_FULL_MAP: Record<string, FullItem> = Object.fromEntries(ITEMS_FULL.map((i) => [i.name, i]))

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

        // ── item picker state ─────────────────────────────────────
        itemQuery: '',
        itemDropdownOpen: false,

        // ── move selector state ──────────────────────────────────
        availableMoves: [] as MoveDetail[],
        movesLoading: false,
        openMoveSlot: null as number | null,
        moveQuery: '',

        // ── ability + tera ────────────────────────────────────────
        slotAbilities: [] as string[],
        allTypes: ['normal','fire','water','electric','grass','ice','fighting','poison',
                   'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'] as string[],

        // ── copy feedback ────────────────────────────────────────
        copied: false,

        // ── damage calculator state ───────────────────────────────
        calcOpen: false,
        calcDefenderQuery: '',
        calcDefenderSuggestions: [] as Array<{ name: string; id: number }>,
        calcDefenderPokemon: null as any,
        calcDefenderAcOpen: false,
        calcWeather: null as 'sun' | 'rain' | 'sand' | 'snow' | null,
        calcReflect: false,
        calcLightScreen: false,
        calcCrit: false,
        calcDefenderLevel: 50,
        calcDefenderEvDef: 0,
        calcDefenderEvSpd: 0,
        calcDefenderIv: 31,
        calcDefenderNature: null as string | null,
        calcResults: [] as Array<{ move: MoveDetail | null; moveName: string; result: DamageResult | null }>,
        allPokemonList: [] as Array<{ name: string; id: number }>,

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
            if (!this.slot) return ITEMS.slice(0, 5)
            const s = this.slot as any
            return recommendItems(s.role ?? 'physical_sweeper', s.types, false)
        },

        // Returns items from items-full.json matching the search query,
        // excluding those already in the recommended list (no duplicates in dropdown).
        get filteredAllItems(): FullItem[] {
            const q = (this.itemQuery as string).toLowerCase().trim()
            if (q.length < 2) return []
            const recNames = new Set((this.recommendedItems as any[]).map((i: any) => i.name))
            return ITEMS_FULL
                .filter((i) => i.name.toLowerCase().includes(q) && !recNames.has(i.name))
                .slice(0, 20)
        },

        // True when slot has an item that is NOT in the recommended list.
        get isCustomItemSelected(): boolean {
            const item = (this.slot as any)?.item as string | null
            if (!item) return false
            return !(this.recommendedItems as any[]).find((i: any) => i.name === item)
        },

        // The items-full entry for the currently selected custom item (for the card display).
        get customItemData(): FullItem | null {
            const item = (this.slot as any)?.item as string | null
            if (!item) return null
            return ITEMS_FULL_MAP[item] ?? null
        },

        get filteredMoves(): MoveDetail[] {
            if (!this.slot) return []
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
                this.calcResults = []
                if (val !== null) await this.loadMoves()
                else this.availableMoves = []
            })
            if ((Alpine.store('team') as any).activeSlot !== null) await this.loadMoves()
            // Load pokemon list for defender autocomplete (background)
            fetchPokemonList().then(list => { this.allPokemonList = list }).catch(() => {})
            // Rerun damage calc when field options change
            this.$watch('calcDefenderPokemon', () => this.runDamageCalc())
            this.$watch('calcWeather', () => this.runDamageCalc())
            this.$watch('calcReflect', () => this.runDamageCalc())
            this.$watch('calcLightScreen', () => this.runDamageCalc())
            this.$watch('calcCrit', () => this.runDamageCalc())
            this.$watch('calcDefenderLevel', () => this.runDamageCalc())
            this.$watch('calcDefenderEvDef', () => this.runDamageCalc())
            this.$watch('calcDefenderEvSpd', () => this.runDamageCalc())
            this.$watch('calcDefenderIv', () => this.runDamageCalc())
            this.$watch('calcDefenderNature', () => this.runDamageCalc())
        },

        async loadMoves() {
            const s = this.slot as any
            if (!s) return
            this.movesLoading = true
            try {
                const pokemon = await fetchPokemon(s.pokemonName)
                this.availableMoves = await fetchMoves(pokemon.moves, 200)
                this.slotAbilities = (pokemon.abilities as any[]).map((a: any) => a.ability.name as string)
            } finally {
                this.movesLoading = false
            }
        },

        // ── damage calculator ─────────────────────────────────────
        get calcDefenderSuggestionsList(): Array<{ name: string; id: number }> {
            const q = (this.calcDefenderQuery as string).toLowerCase().trim()
            if (q.length < 2) return []
            return (this.allPokemonList as Array<{ name: string; id: number }>)
                .filter(p => p.name.includes(q))
                .slice(0, 6)
        },

        selectCalcDefender(entry: { name: string; id: number }) {
            this.calcDefenderQuery = entry.name
            this.calcDefenderAcOpen = false
            fetchPokemon(entry.name)
                .then(p => { this.calcDefenderPokemon = p })
                .catch(() => { this.calcDefenderPokemon = null })
        },

        runDamageCalc() {
            const s = this.slot as any
            if (!s || !this.calcDefenderPokemon) { this.calcResults = []; return }

            const def = this.calcDefenderPokemon as any
            const defStats = Object.fromEntries((def.stats as any[]).map((st: any) => [st.stat.name, st.base_stat])) as Record<string, number>
            const defTypes = (def.types as any[]).map((t: any) => t.type.name as string)

            const field: FieldState = {
                weather: this.calcWeather as FieldState['weather'],
                reflect: this.calcReflect as boolean,
                lightScreen: this.calcLightScreen as boolean,
                isCrit: this.calcCrit as boolean,
            }

            const results: Array<{ move: MoveDetail | null; moveName: string; result: DamageResult | null }> = []

            for (let mi = 0; mi < 4; mi++) {
                const moveName = (s.moves as (string | null)[])[mi]
                if (!moveName) { results.push({ move: null, moveName: '—', result: null }); continue }

                const moveDetail = (this.availableMoves as MoveDetail[]).find(m => m.name === moveName)
                if (!moveDetail) { results.push({ move: null, moveName, result: null }); continue }

                if (!moveDetail.power || moveDetail.damage_class?.name === 'status') {
                    results.push({ move: moveDetail, moveName, result: null })
                    continue
                }

                const category = moveDetail.damage_class.name as 'physical' | 'special'
                const atkStatKey: 'attack' | 'special-attack' = category === 'physical' ? 'attack' : 'special-attack'
                const defStatKey: 'defense' | 'special-defense' = category === 'physical' ? 'defense' : 'special-defense'

                const attackerState: AttackerState = {
                    level: s.level ?? 50,
                    baseStat: s.stats[atkStatKey] ?? 50,
                    iv: s.ivs?.[atkStatKey] ?? 31,
                    ev: s.evs?.[atkStatKey] ?? 0,
                    nature: s.nature,
                    statKey: atkStatKey,
                    types: s.types as string[],
                    item: s.item,
                    isBurned: false,
                }

                const defEvValue = defStatKey === 'defense'
                    ? (this.calcDefenderEvDef as number)
                    : (this.calcDefenderEvSpd as number)

                const defenderState: DefenderState = {
                    level: this.calcDefenderLevel as number,
                    baseDef: defStats[defStatKey] ?? 50,
                    iv: this.calcDefenderIv as number,
                    ev: defEvValue,
                    nature: this.calcDefenderNature as string | null,
                    defKey: defStatKey,
                    types: defTypes,
                    item: null,
                    baseHp: defStats.hp ?? 45,
                    hpIv: 31,
                    hpEv: 0,
                }

                const moveInfo = {
                    name: moveDetail.name,
                    type: moveDetail.type?.name ?? 'normal',
                    category,
                    power: moveDetail.power,
                }

                const result = calcDamageRange(moveInfo, attackerState, defenderState, field)
                results.push({ move: moveDetail, moveName, result })
            }

            this.calcResults = results
        },

        effectivenessLabel(eff: number): string {
            if (eff === 0) return 'Immune'
            if (eff >= 4) return '4×'
            if (eff === 2) return '2×'
            if (eff === 1) return '1×'
            if (eff === 0.5) return '½×'
            return '¼×'
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

        selectCustomItem(name: string) {
            this.setItem(name)
            this.itemDropdownOpen = false
            this.itemQuery = ''
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

        setAbility(name: string) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            const current = (this.slot as any)?.ability
            ;(Alpine.store('team') as any).updateSlot(i, { ability: current === name ? null : name })
        },

        setTeraType(type: string) {
            const i = (Alpine.store('team') as any).activeSlot as number | null
            if (i === null) return
            const current = (this.slot as any)?.teraType
            ;(Alpine.store('team') as any).updateSlot(i, { teraType: current === type ? null : type })
        },

        typeColor(type: string): string {
            return TYPE_COLORS[type] ?? '#9CA3AF'
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
            if (s.ability) lines.push(`Ability: ${(s.ability as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`)
            if (s.teraType) lines.push(`Tera Type: ${(s.teraType as string).charAt(0).toUpperCase() + (s.teraType as string).slice(1)}`)
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
