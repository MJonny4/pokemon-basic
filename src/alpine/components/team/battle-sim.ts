import Alpine from 'alpinejs'
import gsap from 'gsap'
import { fetchPokemon, fetchMoves, fetchPokemonList } from '../../../lib/api/pokeapi'
import { TYPE_COLORS } from '../../../lib/data/type-colors'
import type { MoveDetail } from '../../../lib/api/pokeapi'
import { makeBattlePokemon, resolveTurn } from '../../../lib/logic/battle-engine'
import type { BattleState, BattlePokemon, BattleAction, CpuSlot } from '../../../lib/logic/battle-engine'
import { selectCpuAction } from '../../../lib/logic/battle-ai'
import { detectRole } from '../../../lib/logic/role-detect'
import { CPU_POOL, CPU_EVS, CPU_EVS_DEFAULT } from '../../../lib/data/cpu-pool'
import { MOVE_EFFECTS } from '../../../lib/logic/move-effects'
import type { TeamSlot } from '../../../alpine/stores/team'

const DEFAULT_IVS = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }

// Best nature to assign a CPU Pokémon based on its role
const ROLE_NATURE: Record<string, string> = {
    physical_sweeper: 'Jolly',
    special_sweeper: 'Timid',
    physical_attacker: 'Adamant',
    special_attacker: 'Modest',
    physical_wall: 'Bold',
    special_wall: 'Calm',
    tank: 'Careful',
    fast_attacker: 'Jolly',
    mixed_attacker: 'Hardy',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function hpColor(pct: number): string {
    if (pct > 50) return '#22c55e'
    if (pct > 20) return '#f59e0b'
    return '#ef4444'
}

function spriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

// ── CPU team builder ──────────────────────────────────────────────────────────

async function buildCpuTeam(excludeNames: string[] = [], nameList?: string[]): Promise<{
    slots: CpuSlot[]
    moveSets: MoveDetail[][]
}> {
    const pool = nameList ? nameList.filter(Boolean) as string[] : shuffle(CPU_POOL)
    const slots: CpuSlot[] = []
    const moveSets: MoveDetail[][] = []

    for (const name of pool) {
        if (slots.length === 6) break
        if (excludeNames.includes(name.toLowerCase())) continue
        try {
            const pokemon = await fetchPokemon(name)
            const stats = Object.fromEntries(pokemon.stats.map(s => [s.stat.name, s.base_stat]))
            const role = detectRole(stats)
            const evs = CPU_EVS[role.key] ?? CPU_EVS_DEFAULT
            const moves = await fetchMoves(pokemon.moves, 50)

            // Pick top 4 moves by power, preferring STAB
            const types = pokemon.types.map(t => t.type.name)
            const sorted = moves
                .filter(m => m.power && m.damage_class?.name !== 'status')
                .sort((a, b) => {
                    const stabA = types.includes(a.type?.name ?? '') ? 20 : 0
                    const stabB = types.includes(b.type?.name ?? '') ? 20 : 0
                    return (b.power! + stabB) - (a.power! + stabA)
                })
            const top4Names: (string | null)[] = sorted.slice(0, 4).map(m => m.name)

            // Fill remaining slots with known-useful status/utility moves
            if (top4Names.length < 4) {
                const usefulStatus = moves.filter(m =>
                    m.damage_class?.name === 'status' &&
                    MOVE_EFFECTS[m.name] !== undefined &&
                    !top4Names.includes(m.name)
                )
                for (const m of usefulStatus) {
                    if (top4Names.length >= 4) break
                    top4Names.push(m.name)
                }
            }
            while (top4Names.length < 4) top4Names.push(null)
            const top4 = top4Names as [string | null, string | null, string | null, string | null]

            const abilities: string[] = (pokemon.abilities as any[]).map((a: any) => a.ability.name as string)
            const cpuAbility = abilities.length > 0 ? abilities[Math.floor(Math.random() * abilities.length)] : null
            const cpuNature = ROLE_NATURE[role.key] ?? 'Hardy'

            slots.push({
                pokemonName: name,
                pokemonId: pokemon.id,
                types,
                stats,
                nature: cpuNature,
                ability: cpuAbility,
                item: role.key.includes('physical') ? 'Life Orb' : role.key.includes('special') ? 'Life Orb' : 'Leftovers',
                moves: top4,
                role: role.key,
                evs,
                ivs: { ...DEFAULT_IVS },
                level: 50,
            })
            moveSets.push(moves)
        } catch {
            // Skip this Pokémon and try the next one in the pool
        }
    }

    return { slots, moveSets }
}

// ── Alpine component ──────────────────────────────────────────────────────────

export function registerBattleSim(): void {
    Alpine.data('battleSim', () => ({
        open: false,
        loading: false,
        state: null as BattleState | null,
        showSwitch: false,
        logEl: null as HTMLElement | null,
        animating: false,
        selectedMoveIndex: null as number | null,
        validationErrors: [] as string[],

        // ── enemy team mode ───────────────────────────────────────────────────
        battlePhase: 'mode-select' as 'mode-select' | 'enemy-select' | 'battle',
        customEnemyNames: [null, null, null, null, null, null] as (string | null)[],
        customEnemyQueries: ['', '', '', '', '', ''] as string[],
        customEnemyAcResults: [[], [], [], [], [], []] as Array<Array<{ name: string; id: number }>>,
        customEnemyAcOpen: [false, false, false, false, false, false] as boolean[],
        allPokemonList: [] as Array<{ name: string; id: number }>,

        get customEnemyFilled(): number {
            return (this.customEnemyNames as (string | null)[]).filter(Boolean).length
        },

        onCustomEnemySearch(i: number) {
            const q = ((this.customEnemyQueries as string[])[i] ?? '').toLowerCase()
            if (q.length < 2) {
                const r = [...(this.customEnemyAcResults as any[])]
                r[i] = []
                this.customEnemyAcResults = r
                const o = [...(this.customEnemyAcOpen as boolean[])]
                o[i] = false
                this.customEnemyAcOpen = o
                return
            }
            const results = (this.allPokemonList as Array<{ name: string; id: number }>)
                .filter(p => p.name.includes(q)).slice(0, 6)
            const r = [...(this.customEnemyAcResults as any[])]
            r[i] = results
            this.customEnemyAcResults = r
            const o = [...(this.customEnemyAcOpen as boolean[])]
            o[i] = results.length > 0
            this.customEnemyAcOpen = o
        },

        selectCustomEnemy(i: number, name: string) {
            const names = [...(this.customEnemyNames as (string | null)[])]
            names[i] = name
            this.customEnemyNames = names
            const queries = [...(this.customEnemyQueries as string[])]
            queries[i] = name
            this.customEnemyQueries = queries
            const o = [...(this.customEnemyAcOpen as boolean[])]
            o[i] = false
            this.customEnemyAcOpen = o
        },

        clearCustomEnemy(i: number) {
            const names = [...(this.customEnemyNames as (string | null)[])]
            names[i] = null
            this.customEnemyNames = names
            const queries = [...(this.customEnemyQueries as string[])]
            queries[i] = ''
            this.customEnemyQueries = queries
            const o = [...(this.customEnemyAcOpen as boolean[])]
            o[i] = false
            this.customEnemyAcOpen = o
        },

        // ── open / close ─────────────────────────────────────────────────────
        async openBattle() {
            const team = (Alpine.store('team') as any)
            const playerSlots: (TeamSlot | null)[] = team.slots
            if (playerSlots.filter(Boolean).length === 0) return

            this.open = true
            this.battlePhase = 'mode-select'
            this.customEnemyNames = [null, null, null, null, null, null]
            this.customEnemyQueries = ['', '', '', '', '', '']
            this.customEnemyAcResults = [[], [], [], [], [], []]
            this.customEnemyAcOpen = [false, false, false, false, false, false]
            if ((this.allPokemonList as any[]).length === 0) {
                fetchPokemonList().then(list => { this.allPokemonList = list }).catch(() => {})
            }
        },

        async startBattle(nameList?: string[]) {
            const team = (Alpine.store('team') as any)
            const playerSlots: (TeamSlot | null)[] = team.slots

            // Pre-flight validation
            const errors: string[] = []
            for (const slot of playerSlots.filter(Boolean) as TeamSlot[]) {
                const display = slot.pokemonName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                if (!slot.moves.some(Boolean)) {
                    errors.push(`${display}: no moves selected`)
                }
                if (!slot.ability) {
                    errors.push(`${display}: no ability selected`)
                }
                if (!slot.nature) {
                    errors.push(`${display}: no nature selected`)
                }
            }
            if (errors.length > 0) {
                this.validationErrors = errors
                return
            }
            this.validationErrors = []

            this.battlePhase = 'battle'
            this.loading = true
            this.showSwitch = false

            try {
                const playerNames = playerSlots.filter(Boolean).map(s => s!.pokemonName.toLowerCase())
                const { slots: cpuSlots, moveSets: cpuMoveSets } = await buildCpuTeam(playerNames, nameList)

                // Build player team and move sets from the same filtered slot list
                // (must be parallel arrays: playerTeam[i] ↔ playerMoveSets[i])
                const filledSlots = playerSlots.filter(Boolean) as TeamSlot[]
                const playerMoveSets: MoveDetail[][] = []
                for (const slot of filledSlots) {
                    try {
                        const pokemon = await fetchPokemon(slot.pokemonName)
                        const moves = await fetchMoves(pokemon.moves, 80)
                        playerMoveSets.push(moves)
                    } catch {
                        playerMoveSets.push([])
                    }
                }

                const playerTeam = filledSlots.map(s => makeBattlePokemon(s))
                const cpuTeam = cpuSlots.map(s => makeBattlePokemon(s))

                this.state = {
                    playerTeam,
                    cpuTeam,
                    playerActive: 0,
                    cpuActive: 0,
                    field: {
                        weather: null, weatherTurns: 0,
                        playerReflect: false, playerLightScreen: false,
                        cpuReflect: false, cpuLightScreen: false,
                    },
                    turnLog: [`Battle started! Turn 1.`],
                    phase: 'selecting',
                    winner: null,
                    turn: 1,
                    playerAction: null,
                    cpuAction: null,
                    playerMoves: playerMoveSets,
                    cpuMoves: cpuMoveSets,
                } as BattleState
            } finally {
                this.loading = false
            }
        },

        closeBattle() {
            this.open = false
            this.state = null
        },

        // ── getters ──────────────────────────────────────────────────────────
        get playerActive(): BattlePokemon | null {
            if (!this.state) return null
            return this.state.playerTeam[this.state.playerActive] ?? null
        },

        get cpuActive(): BattlePokemon | null {
            if (!this.state) return null
            return this.state.cpuTeam[this.state.cpuActive] ?? null
        },

        get playerActiveMoves(): Array<MoveDetail | null> {
            if (!this.state || !this.playerActive) return Array(4).fill(null)
            const moves = this.playerActive.slot.moves
            const moveSets = this.state.playerMoves[this.state.playerActive] ?? []
            return moves.map(name => name ? (moveSets.find(m => m.name === name) ?? null) : null)
        },

        get cpuActiveMoves(): Array<MoveDetail | null> {
            if (!this.state || !this.cpuActive) return Array(4).fill(null)
            const moves = this.cpuActive.slot.moves
            const moveSets = this.state.cpuMoves[this.state.cpuActive] ?? []
            return moves.map(name => name ? (moveSets.find(m => m.name === name) ?? null) : null)
        },

        hpPct(pkmn: BattlePokemon): number {
            return Math.max(0, Math.round(pkmn.currentHp / pkmn.maxHp * 100))
        },

        hpColor(pct: number): string {
            return hpColor(pct)
        },

        spriteUrl(id: number): string {
            return spriteUrl(id)
        },

        statusLabel(s: string | null): string {
            if (!s) return ''
            return { burn: '🔥', paralysis: '⚡', sleep: '💤', poison: '☠', toxic: '💀', freeze: '🧊' }[s] ?? s
        },

        movePower(m: MoveDetail | null): string {
            if (!m) return ''
            return m.power ? String(m.power) : '—'
        },

        moveTypeColor(m: MoveDetail | null): string {
            return TYPE_COLORS[m?.type?.name ?? 'normal'] ?? '#9CA3AF'
        },

        typeColor(type: string): string {
            return TYPE_COLORS[type?.toLowerCase() ?? ''] ?? '#9CA3AF'
        },

        allLogLines(): string[] {
            return this.state?.turnLog ?? []
        },

        get lastTurnLog(): string[] {
            const log = this.state?.turnLog ?? []
            // Find the last "─── Turn X ───" separator
            let lastSep = 0
            for (let i = log.length - 1; i >= 0; i--) {
                if ((log[i] as string).startsWith('───')) { lastSep = i; break }
            }
            return log.slice(lastSep)
        },

        logLineClass(line: string): string {
            if (line.startsWith('───')) return 'text-slate-500 font-bold text-[10px] uppercase tracking-widest border-t border-slate-700 pt-1.5 mt-1 block'
            if (line.includes('fainted')) return 'text-red-400 font-bold'
            if (line.includes('Critical hit')) return 'text-yellow-300 font-bold'
            if (line.includes('super effective')) return 'text-orange-400 font-bold'
            if (line.includes('not very effective')) return 'text-slate-500 italic'
            if (line.includes("doesn't affect")) return 'text-slate-600 italic'
            if (line.includes('took') && line.includes('damage')) return 'text-red-300'
            if (line.includes('recovered') || line.includes('restored') || line.includes('woke up') || line.includes('thawed')) return 'text-green-400'
            if (line.includes('is now') || line.includes('paralyzed') || line.includes('burned') || line.includes('poisoned') || line.includes('asleep') || line.includes('frozen')) return 'text-yellow-300'
            if (line.includes("'s") && (line.includes('rose') || line.includes('fell'))) return 'text-blue-300'
            if (line.includes('used')) return 'text-white font-semibold'
            if (line.includes('Battle started')) return 'text-violet-400 font-bold'
            return 'text-slate-400'
        },

        moveTypeIcon(m: MoveDetail | null): string {
            const type = m?.type?.name ?? 'normal'
            return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type}.svg`
        },

        typeIcon(type: string): string {
            return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`
        },

        weatherIcon(): string {
            const icons: Record<string, string> = { sun: '☀️', rain: '🌧️', sand: '🌪️', snow: '❄️' }
            return icons[this.state?.field?.weather ?? ''] ?? ''
        },

        // ── player actions ───────────────────────────────────────────────────
        async selectMove(moveIndex: number) {
            if (!this.state || this.state.phase !== 'selecting' || this.animating) return
            const move = this.playerActiveMoves[moveIndex]
            if (!move && this.playerActive?.slot.moves[moveIndex] === null) return

            this.selectedMoveIndex = moveIndex
            const action: BattleAction = { type: 'move', moveIndex }
            await this.executeTurn(action)
        },

        async selectSwitch(toIndex: number) {
            if (!this.state || this.animating) return
            const target = this.state.playerTeam[toIndex]
            if (!target || target.fainted || toIndex === this.state.playerActive) return

            this.showSwitch = false
            const action: BattleAction = { type: 'switch', toIndex }

            if (this.state.phase === 'switching') {
                // Forced switch — no CPU move this turn
                this.resetSprites()
                const newPlayerTeam = [...this.state.playerTeam]
                this.state = {
                    ...this.state,
                    playerActive: toIndex,
                    playerTeam: newPlayerTeam,
                    turnLog: [...this.state.turnLog, `Go, ${target.name}!`],
                    phase: 'selecting',
                }
                this.scrollLog()
                return
            }

            await this.executeTurn(action)
        },

        forfeit() {
            if (!this.state) return
            this.state = { ...this.state, winner: 'cpu', phase: 'battle-end' }
        },

        async playAgain() {
            await this.openBattle()
        },

        // ── turn execution ────────────────────────────────────────────────────
        async executeTurn(playerAction: BattleAction) {
            if (!this.state) return
            this.animating = true

            const cpuAction = selectCpuAction(this.state)
            const stateWithActions = { ...this.state, playerAction, cpuAction }
            const { newState } = resolveTurn(stateWithActions)

            this.state = { ...newState, phase: newState.phase }

            this.scrollLog()
            await this.animateTurn()
            this.animating = false
        },

        async animateTurn() {
            if (!this.state) return
            const p = this.playerActive
            const c = this.cpuActive
            if (!p || !c) return

            // Reset any GSAP-applied faint/transform state from prior turns
            this.resetSprites()

            // 1. Attack lunge — both attackers surge toward the opponent
            gsap.to('#player-sprite', { x: 14, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 })
            gsap.to('#cpu-sprite', { x: -14, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 })

            await new Promise<void>(res => setTimeout(res, 220))

            // 2. Damage flash on both sides
            gsap.to('#cpu-sprite', { filter: 'brightness(5) saturate(0)', duration: 0.07, yoyo: true, repeat: 5, ease: 'none' })
            gsap.to('#player-sprite', { filter: 'brightness(5) saturate(0)', duration: 0.07, yoyo: true, repeat: 5, ease: 'none' })

            // 3. HP bars animate (slower, more dramatic)
            const pPct = this.hpPct(p)
            const cPct = this.hpPct(c)
            gsap.to('#player-hp-bar', { width: `${pPct}%`, backgroundColor: hpColor(pPct), duration: 1.0, ease: 'power2.out' })
            gsap.to('#cpu-hp-bar', { width: `${cPct}%`, backgroundColor: hpColor(cPct), duration: 1.0, ease: 'power2.out' })

            // 4. Faint animations (slower drop)
            if (p.fainted) gsap.to('#player-sprite', { y: 24, opacity: 0, scale: 0.7, duration: 0.7, ease: 'power2.in' })
            if (c.fainted) gsap.to('#cpu-sprite', { y: -24, opacity: 0, scale: 0.7, duration: 0.7, ease: 'power2.in' })

            await new Promise<void>(res => setTimeout(res, 750))

            // 5. Clear selected move highlight
            this.selectedMoveIndex = null
        },

        scrollLog() {
            this.$nextTick(() => {
                const el = document.getElementById('battle-log')
                if (el) el.scrollTop = el.scrollHeight
            })
        },

        // ── auto-reset sprite opacity on switch ──────────────────────────────
        resetSprites() {
            gsap.set('#player-sprite', { y: 0, opacity: 1, scale: 1, x: 0 })
            gsap.set('#cpu-sprite', { y: 0, opacity: 1, scale: 1, x: 0 })
        },
    }))
}
