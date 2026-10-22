import Alpine from 'alpinejs'
import { recommendNatures } from '../../../lib/logic/natures'
import { recommendItems } from '../../../lib/logic/items'
import { NATURES } from '../../../lib/data/natures'
import { fetchPokemon, fetchMoves, fetchPokemonList, type MoveDetail } from '../../../lib/api/pokeapi'
import { calcStat } from '../../../lib/logic/stat-calc'
import type { Gen9PanelResult } from '../../../lib/logic/gen9-damage'
import itemsCatalogJson from '../../../lib/data/items-catalog.json'
import { itemSpriteImg, categoryLabel } from '../../../ui/item-card'
import { TYPE_COLORS } from '../../../lib/data/constants'
import { exportShowdownSet } from '../../../lib/logic/team-portability'
import type { TeamSlot } from '../../stores/team'

interface CatalogItem { name: string; slug: string; category: string; pocket: string; effect: string }

// Battle-holdable subset of the full catalog. The engine keys item effects on
// display names (slot.item stores names like "Life Orb"), which all exist
// verbatim in the catalog — so the picker keeps emitting entry.name.
const BATTLE_CATEGORIES = new Set([
    'held-items', 'choice', 'bad-held-items', 'type-enhancement', 'plates',
    'species-specific', 'memories', 'jewels', 'type-protection',
    'medicine', 'in-a-pinch', 'picky-healing', 'other', // the four all-berry categories
    'mega-stones', 'z-crystals',
])
const BATTLE_ITEMS: CatalogItem[] = (itemsCatalogJson as unknown as CatalogItem[])
    .filter((i) => BATTLE_CATEGORIES.has(i.category))
const BATTLE_ITEMS_MAP: Record<string, CatalogItem> = Object.fromEntries(BATTLE_ITEMS.map((i) => [i.name, i]))

// Catalog names use curly apostrophes (King’s Rock) — normalize both sides for search
const normApos = (s: string) => s.toLowerCase().replace(/[’']/g, '')

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']

const STAT_LABELS: Record<string, string> = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spd',
}

const STAT_COLORS: Record<string, string> = {
    hp: '#ef4444',
    attack: '#f97316',
    defense: '#eab308',
    'special-attack': '#8b5cf6',
    'special-defense': '#06b6d4',
    speed: '#10b981',
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
        calcLoading: false,
        calcMessage: '',
        calcRequestId: 0,
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
        calcResults: [] as Array<{ move: MoveDetail | null; moveName: string; result: Gen9PanelResult | null; reason: string | null }>,
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
            if (!this.slot) return [] // panel is hidden without an active slot
            const s = this.slot as any
            return recommendItems(s.role ?? 'physical_sweeper', s.types, false)
        },

        // Returns battle-holdable catalog items matching the search query,
        // excluding those already in the recommended list (no duplicates in dropdown).
        get filteredAllItems(): CatalogItem[] {
            const q = normApos((this.itemQuery as string).trim())
            if (q.length < 2) return []
            const recNames = new Set((this.recommendedItems as any[]).map((i: any) => i.name))
            return BATTLE_ITEMS
                .filter((i) => normApos(i.name).includes(q) && !recNames.has(i.name))
                .slice(0, 20)
        },

        // True when slot has an item that is NOT in the recommended list.
        get isCustomItemSelected(): boolean {
            const item = (this.slot as any)?.item as string | null
            if (!item) return false
            return !(this.recommendedItems as any[]).find((i: any) => i.name === item)
        },

        // The catalog entry for the currently selected custom item (for the card display).
        get customItemData(): CatalogItem | null {
            const item = (this.slot as any)?.item as string | null
            if (!item) return null
            return BATTLE_ITEMS_MAP[item] ?? null
        },

        /** Effect text for a catalog item, falling back to its category when PokeAPI has none. */
        itemDesc(i: CatalogItem): string {
            return i.effect || categoryLabel(i.category)
        },

        /** Item icon with the site-wide 3-tier sprite fallback (PokeAPI → local → pokesprite → 🎒). */
        itemIconHtml(i: CatalogItem): string {
            return itemSpriteImg(i, 'w-6 h-6 object-contain', import.meta.env.BASE_URL)
        },

        /** Same, resolved by item display name (recommended cards store names only). */
        itemIconHtmlByName(name: string): string {
            const entry = BATTLE_ITEMS_MAP[name]
            return entry ? this.itemIconHtml(entry) : '🎒'
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
            this.$watch('$store.team.slots', () => { if (this.calcOpen) void this.runDamageCalc() })
        },

        async loadMoves() {
            const s = this.slot as any
            if (!s) return
            this.movesLoading = true
            try {
                const pokemon = await fetchPokemon(s.pokemonName)
                this.availableMoves = await fetchMoves(pokemon.moves, 200)
                this.slotAbilities = (pokemon.abilities as any[]).map((a: any) => a.ability.name as string)
                if (this.calcOpen) void this.runDamageCalc()
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

        openDamageCalc() {
            this.calcOpen = !this.calcOpen
            if (this.calcOpen) void this.runDamageCalc()
            else { this.calcRequestId++; this.calcLoading = false }
        },

        async runDamageCalc() {
            const requestId = ++this.calcRequestId
            const s = this.slot as any
            if (!this.calcOpen || !s || !this.calcDefenderPokemon) { this.calcResults = []; this.calcLoading = false; return }
            this.calcLoading = true
            this.calcMessage = ''
            try {
                const { calculateGen9PanelDamage } = await import('../../../lib/logic/gen9-damage')
                if (requestId !== this.calcRequestId) return
                const defender = this.calcDefenderPokemon as any
                const results: typeof this.calcResults = []
                for (const moveName of s.moves as (string | null)[]) {
                    if (!moveName) { results.push({ move: null, moveName: '—', result: null, reason: null }); continue }
                    const move = (this.availableMoves as MoveDetail[]).find((entry) => entry.name === moveName) ?? null
                    const outcome = calculateGen9PanelDamage(s, {
                        name: defender.name,
                        level: this.calcDefenderLevel as number,
                        defenseEv: this.calcDefenderEvDef as number,
                        specialDefenseEv: this.calcDefenderEvSpd as number,
                        defenseIv: this.calcDefenderIv as number,
                    }, moveName, {
                        weather: this.calcWeather,
                        reflect: this.calcReflect,
                        lightScreen: this.calcLightScreen,
                        critical: this.calcCrit,
                    })
                    results.push({ move, moveName, result: outcome.ok ? outcome.result : null, reason: outcome.ok ? null : outcome.reason })
                }
                if (requestId === this.calcRequestId) this.calcResults = results
            } catch {
                if (requestId === this.calcRequestId) { this.calcResults = []; this.calcMessage = 'The Gen 9 calculator could not load. Try again when the page is online.' }
            } finally {
                if (requestId === this.calcRequestId) this.calcLoading = false
            }
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
            return TYPE_COLORS[type.toLowerCase()] ?? '#9CA3AF'
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
            return TYPE_COLORS[type.toLowerCase()] ?? '#9CA3AF'
        },

        moveCategoryIcon(cat: string): string {
            if (cat === 'physical') return '⚔️'
            if (cat === 'special') return '🔮'
            return '✨'
        },

        // ── Showdown export ───────────────────────────────────────
        exportShowdown(): string {
            return this.slot ? exportShowdownSet(this.slot as TeamSlot) : ''
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
