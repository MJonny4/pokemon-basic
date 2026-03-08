import Alpine from 'alpinejs'
import gsap from 'gsap'
import { fetchPokemon, fetchMoves } from '../../api/pokeapi'
import type { MoveDetail } from '../../api/pokeapi'
import { makeBattlePokemon, resolveTurn } from '../../logic/battleEngine'
import type { BattleState, BattlePokemon, BattleAction, CpuSlot } from '../../logic/battleEngine'
import { selectCpuAction } from '../../logic/battleAI'
import { detectRole } from '../../logic/roleDetect'
import { CPU_POOL, CPU_EVS, CPU_EVS_DEFAULT } from '../../data/cpu-pool'
import { MOVE_EFFECTS } from '../../logic/moveEffects'
import type { TeamSlot } from '../../store/team'

const DEFAULT_IVS = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }

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

async function buildCpuTeam(excludeNames: string[] = []): Promise<{
    slots: CpuSlot[]
    moveSets: MoveDetail[][]
}> {
    const shuffled = shuffle(CPU_POOL)
    const slots: CpuSlot[] = []
    const moveSets: MoveDetail[][] = []

    for (const name of shuffled) {
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

            slots.push({
                pokemonName: name,
                pokemonId: pokemon.id,
                types,
                stats,
                nature: null,
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

        // ── open / close ─────────────────────────────────────────────────────
        async openBattle() {
            const team = (Alpine.store('team') as any)
            const playerSlots: (TeamSlot | null)[] = team.slots
            const filledSlots = playerSlots.filter(Boolean) as TeamSlot[]
            if (filledSlots.length === 0) return

            this.open = true
            this.loading = true
            this.showSwitch = false

            try {
                const playerNames = playerSlots.filter(Boolean).map(s => s!.pokemonName.toLowerCase())
                const { slots: cpuSlots, moveSets: cpuMoveSets } = await buildCpuTeam(playerNames)

                // Build player move sets
                const playerMoveSets: MoveDetail[][] = []
                for (let i = 0; i < 6; i++) {
                    const slot = playerSlots[i]
                    if (!slot) { playerMoveSets.push([]); continue }
                    try {
                        const pokemon = await fetchPokemon(slot.pokemonName)
                        const moves = await fetchMoves(pokemon.moves, 80)
                        playerMoveSets.push(moves)
                    } catch {
                        playerMoveSets.push([])
                    }
                }

                const playerTeam = playerSlots.map(s => s ? makeBattlePokemon(s) : null).filter(Boolean) as BattlePokemon[]
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
            const TYPE_COLORS: Record<string, string> = {
                normal: '#9CA3AF', fire: '#F97316', water: '#3B82F6', electric: '#EAB308',
                grass: '#22C55E', ice: '#06B6D4', fighting: '#DC2626', poison: '#A855F7',
                ground: '#CA8A04', flying: '#818CF8', psychic: '#EC4899', bug: '#84CC16',
                rock: '#92400E', ghost: '#6D28D9', dragon: '#7C3AED', dark: '#374151',
                steel: '#94A3B8', fairy: '#F472B6',
            }
            return TYPE_COLORS[m?.type?.name ?? 'normal'] ?? '#9CA3AF'
        },

        allLogLines(): string[] {
            return this.state?.turnLog ?? []
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
