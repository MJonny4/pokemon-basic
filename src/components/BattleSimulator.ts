import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { fetchPokemon, fetchMoves, fetchPokemonList } from '../api/pokeapi'
import type { Pokemon, MoveDetail } from '../api/pokeapi'
import { TYPES, EFFECTIVENESS, TYPE_COLORS } from '../data/constants'

// ── helpers ──────────────────────────────────────────────────────────────────
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function effectiveness(moveType: string, defenderTypes: string[]): number {
    const row = EFFECTIVENESS[cap(moveType)]
    if (!row) return 1
    return defenderTypes.reduce((mult, dt) => {
        const idx = TYPES.indexOf(cap(dt))
        return idx >= 0 ? mult * (row[idx] ?? 1) : mult
    }, 1)
}

// ── Gen 9 damage formula (level 100, no EVs/IVs) ────────────────────────────
function calcDamage(
    mv: MoveDetail,
    attacker: Pokemon,
    defender: Pokemon,
    attackerTypes: string[],
): { pct: number; crit: boolean } {
    const power = mv.power ?? 60
    const isPhysical = mv.damage_class.name === 'physical'
    const atkBase = isPhysical
        ? (attacker.stats.find(s => s.stat.name === 'attack')?.base_stat ?? 90)
        : (attacker.stats.find(s => s.stat.name === 'special-attack')?.base_stat ?? 90)
    const defBase = isPhysical
        ? (defender.stats.find(s => s.stat.name === 'defense')?.base_stat ?? 90)
        : (defender.stats.find(s => s.stat.name === 'special-defense')?.base_stat ?? 90)
    const hpBase = defender.stats.find(s => s.stat.name === 'hp')?.base_stat ?? 100
    // base damage at level 100
    const baseDmg = (((2 * 100 / 5 + 2) * power * atkBase / defBase) / 50 + 2)
    const stab = attackerTypes.includes(mv.type.name) ? 1.5 : 1
    const typeEff = effectiveness(mv.type.name, defender.types.map(t => t.type.name))
    const random = 0.85 + Math.random() * 0.15
    const crit = Math.random() < 0.0625
    const rawDmg = Math.floor(baseDmg * stab * typeEff * random * (crit ? 1.5 : 1))
    // scale to HP percentage using estimated total HP at level 100 (31 IVs, 0 EVs)
    const totalHp = 2 * hpBase + 141
    return { pct: Math.min(100, Math.round((rawDmg / totalHp) * 100)), crit }
}

function typeColor(name: string): string {
    return TYPE_COLORS[name.toLowerCase()] ?? '#7c3aed'
}

// ── slot types ────────────────────────────────────────────────────────────────
interface BattleSlot {
    query: string
    acResults: Array<{ name: string; id: number }>
    acOpen: boolean
    pokemon: Pokemon | null
    moves: MoveDetail[]
    selectedMoves: (MoveDetail | null)[]
    loading: boolean
}

function emptySlot(): BattleSlot {
    return {
        query: '',
        acResults: [],
        acOpen: false,
        pokemon: null,
        moves: [],
        selectedMoves: [null, null, null, null],
        loading: false,
    }
}

// ── cache pokemon list ────────────────────────────────────────────────────────
let _pokemonListCache: Array<{ name: string; id: number }> | null = null
async function getPokemonList() {
    if (!_pokemonListCache) _pokemonListCache = await fetchPokemonList()
    return _pokemonListCache
}

// ── score moves for auto-select ───────────────────────────────────────────────
function scoreMoves(moves: MoveDetail[], myTypes: string[], enemyTypes: string[]): MoveDetail[] {
    const scored = moves
        .filter((m) => m.power)
        .map((m) => {
            const eff = enemyTypes.length ? effectiveness(m.type.name, enemyTypes) : 1
            const stab = myTypes.includes(m.type.name) ? 1.5 : 1
            return { move: m, score: (m.power ?? 0) * eff * stab }
        })
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 4).map((s) => s.move)
}

// ── Alpine component ──────────────────────────────────────────────────────────
export function registerBattleSimulator() {
    Alpine.data('battleSimulator', () => ({
        mode: '1v1' as '1v1' | '2v2' | '6v6',
        mySlots: Array.from({ length: 6 }, emptySlot) as BattleSlot[],
        enemySlots: Array.from({ length: 6 }, emptySlot) as BattleSlot[],

        // last move result
        lastMove: null as MoveDetail | null,
        effLabel: '',
        effBarWidth: 0,
        effBarClass: 'bg-slate-300',
        effLabelClass: 'text-slate-500',

        // win bar
        winPct: 50,

        // switch suggestion
        switchSuggestion: '' as string,

        // drag state
        _dragIdx: -1 as number,
        _dragOver: -1 as number,

        // battle state
        battleLog: [] as string[],
        turnCount: 0,
        hpEnemy: 100,
        hpMy: 100,

        // debounce timers
        _searchTimers: {} as Record<string, ReturnType<typeof setTimeout>>,

        // ── computed ──────────────────────────────────────────────────────────
        get slotCount() {
            return ({ '1v1': 1, '2v2': 2, '6v6': 6 } as const)[this.mode as '1v1' | '2v2' | '6v6']
        },

        // ── init ──────────────────────────────────────────────────────────────
        init() {
            this.loadFromStorage()
            this.$watch('mode', () => {
                this.loadFromStorage()
                this.$nextTick(() => this.animateSlots())
            })
            // persist on any slot change
            this.$watch('mySlots', () => this.saveToStorage())
        },

        // ── mode switch ───────────────────────────────────────────────────────
        setMode(m: string) {
            this.mode = m as '1v1' | '2v2' | '6v6'
        },

        // ── animations ───────────────────────────────────────────────────────
        animateSlots() {
            const els = document.querySelectorAll<HTMLElement>('[x-ref="mySlotCard"]')
            if (els.length) {
                gsap.from(els, { x: -30, opacity: 0, stagger: 0.08, duration: 0.35, ease: 'power2.out' })
            }
        },

        // ── helpers exposed to template ───────────────────────────────────────
        cap,
        typeColor,
        effectiveness,

        effChipClass(eff: number): string {
            if (eff >= 2) return 'super-effective'
            if (eff === 0) return 'no-effect'
            if (eff < 1) return 'not-very-effective'
            return 'normal-damage'
        },

        effChipLabel(eff: number): string {
            if (eff >= 4) return '4×'
            if (eff === 2) return '2×'
            if (eff === 0) return '0×'
            if (eff === 0.5) return '½×'
            if (eff === 0.25) return '¼×'
            return '1×'
        },

        hpColor(pct: number): string {
            if (pct > 50) return 'bg-emerald-500'
            if (pct > 20) return 'bg-amber-500'
            return 'bg-rose-500'
        },

        // ── search ───────────────────────────────────────────────────────────
        async searchPokemon(side: 'my' | 'enemy', idx: number) {
            const slot = side === 'my' ? this.mySlots[idx] : this.enemySlots[idx]
            const q = slot.query.toLowerCase().trim()
            if (!q) { slot.acOpen = false; return }

            const key = `${side}-${idx}`
            clearTimeout(this._searchTimers[key])
            this._searchTimers[key] = setTimeout(async () => {
                const list = await getPokemonList()
                slot.acResults = list.filter((p) => p.name.startsWith(q)).slice(0, 7)
                slot.acOpen = slot.acResults.length > 0
            }, 250)
        },

        async selectPokemon(side: 'my' | 'enemy', idx: number, name: string) {
            const slot = side === 'my' ? this.mySlots[idx] : this.enemySlots[idx]
            slot.acOpen = false
            slot.query = name
            slot.loading = true
            try {
                const pokemon = await fetchPokemon(name)
                const moves = await fetchMoves(pokemon.moves)
                slot.pokemon = pokemon
                slot.moves = moves
                slot.selectedMoves = [null, null, null, null]
                if (idx === 0) {
                    if (side === 'enemy') this.hpEnemy = 100
                    else this.hpMy = 100
                }

                // animate slot card
                const slotEl = document.querySelectorAll<HTMLElement>('[x-ref="mySlotCard"]')[idx]
                if (slotEl) gsap.from(slotEl, { scale: 0.85, opacity: 0, duration: 0.3, ease: 'power2.out' })

                // auto-fill best moves for enemy
                if (side === 'enemy') {
                    const myTypes = this.mySlots[0].pokemon?.types.map((t: any) => t.type.name) ?? []
                    const enemyTypes = pokemon.types.map((t: any) => t.type.name)
                    slot.selectedMoves = scoreMoves(moves, enemyTypes, myTypes) as any
                }

                this.recomputeAnalysis()
            } finally {
                slot.loading = false
            }
        },

        // ── move actions ─────────────────────────────────────────────────────
        bestMoves(side: 'my' | 'enemy', idx: number) {
            const slot = side === 'my' ? this.mySlots[idx] : this.enemySlots[idx]
            const myTypes = slot.pokemon?.types.map((t: any) => t.type.name) ?? []
            const enemy = this.enemySlots[0].pokemon
            const enemyTypes = enemy ? enemy.types.map((t: any) => t.type.name) : []
            const best = scoreMoves(slot.moves, myTypes, enemyTypes)
            slot.selectedMoves = [...best, ...Array(4).fill(null)].slice(0, 4) as any
            this.recomputeAnalysis()
        },

        randomMoves(side: 'my' | 'enemy', idx: number) {
            const slot = side === 'my' ? this.mySlots[idx] : this.enemySlots[idx]
            const shuffled = [...slot.moves].sort(() => Math.random() - 0.5).slice(0, 4)
            slot.selectedMoves = shuffled as any
            this.recomputeAnalysis()
        },

        selectMove(side: 'my' | 'enemy', slotIdx: number, moveIdx: number, moveName: string) {
            const slot = side === 'my' ? this.mySlots[slotIdx] : this.enemySlots[slotIdx]
            const found = slot.moves.find((m) => m.name === moveName) ?? null
            slot.selectedMoves = slot.selectedMoves.map((m, i) => i === moveIdx ? found : m)
            this.recomputeAnalysis()
        },

        // ── use move (battle arena) ───────────────────────────────────────────
        useMove(mv: MoveDetail) {
            const enemy = this.enemySlots[0].pokemon
            if (!enemy) return
            if (this.hpEnemy <= 0) return

            this.lastMove = mv
            this.turnCount++
            const myP = this.mySlots[0].pokemon
            const myName = cap((myP?.name ?? 'Mine').replace(/-/g, ' '))
            const moveName = cap(mv.name.replace(/-/g, ' '))

            // status move — no damage
            if (mv.damage_class.name === 'status') {
                this.effLabel = '— Status'
                this.effLabelClass = 'text-slate-400'
                this.battleLog.push(`T${this.turnCount} ${myName} → ${moveName} [Status]`)
                return
            }

            const eff = effectiveness(mv.type.name, enemy.types.map((t: any) => t.type.name))
            if (eff === 0) { this.effLabel = 'Immune!'; this.effLabelClass = 'text-slate-500' }
            else if (eff >= 2) { this.effLabel = `${eff}× Super Effective!`; this.effLabelClass = 'text-emerald-600' }
            else if (eff < 1) { this.effLabel = `${eff}× Resisted`; this.effLabelClass = 'text-red-500' }
            else { this.effLabel = 'Neutral'; this.effLabelClass = 'text-slate-500' }

            const myTypes = myP ? myP.types.map((t: any) => t.type.name) : []
            const { pct: rawPct, crit } = myP
                ? calcDamage(mv, myP, enemy, myTypes)
                : { pct: Math.round(10 * eff), crit: false }
            const dmgPct = Math.min(this.hpEnemy, rawPct)
            this.hpEnemy = Math.max(0, this.hpEnemy - dmgPct)

            const critSuffix = crit ? ' ✨CRIT' : ''
            this.battleLog.push(
                `T${this.turnCount} ${myName} → ${moveName} [${this.effLabel}${critSuffix}] -${dmgPct}% → ${this.hpEnemy}%`
            )

            const widthMap: Record<number, number> = { 0: 0, 0.25: 20, 0.5: 40, 1: 75, 2: 100, 4: 100 }
            const finalWidth = widthMap[eff] ?? 50
            this.effBarClass = eff >= 2 ? 'bg-emerald-500' : eff === 0 || eff < 1 ? 'bg-red-500' : 'bg-slate-400'
            this.effBarWidth = 0

            this.$nextTick(() => {
                const barEl = document.getElementById('eff-bar-fill')
                if (barEl) gsap.fromTo(barEl, { width: '0%' }, { width: finalWidth + '%', duration: 0.5, ease: 'power2.out' })
                else this.effBarWidth = finalWidth

                const dmgEl = document.getElementById('dmg-label')
                if (dmgEl) {
                    gsap.fromTo(dmgEl, { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => { dmgEl.style.cssText = '' } })
                }

                if (this.hpEnemy === 0) {
                    document.querySelectorAll<HTMLElement>('.enemy-lead-sprite').forEach(el => {
                        gsap.to(el, { opacity: 0.25, rotation: 90, y: 12, duration: 0.5, ease: 'power2.out' })
                    })
                }
            })
        },

        // ── enemy uses move (reduces my HP) ──────────────────────────────────
        useEnemyMove(mv: MoveDetail) {
            const myP = this.mySlots[0].pokemon
            if (!myP) return
            if (this.hpMy <= 0) return

            const enemy = this.enemySlots[0].pokemon
            this.turnCount++
            const enName = cap((enemy?.name ?? 'Enemy').replace(/-/g, ' '))
            const moveName = cap(mv.name.replace(/-/g, ' '))

            // status move — no damage
            if (mv.damage_class.name === 'status') {
                this.battleLog.push(`T${this.turnCount} ${enName} → ${moveName} [Status]`)
                return
            }

            const eff = effectiveness(mv.type.name, myP.types.map((t: any) => t.type.name))
            const effText = eff === 0 ? 'Immune!' : eff >= 2 ? `${eff}× Super Effective!` : eff < 1 ? `${eff}× Resisted` : 'Neutral'

            const enemyTypes = enemy ? enemy.types.map((t: any) => t.type.name) : []
            const { pct: rawPct, crit } = enemy
                ? calcDamage(mv, enemy, myP, enemyTypes)
                : { pct: Math.round(10 * eff), crit: false }
            const dmgPct = Math.min(this.hpMy, rawPct)
            this.hpMy = Math.max(0, this.hpMy - dmgPct)

            const critSuffix = crit ? ' ✨CRIT' : ''
            this.battleLog.push(
                `T${this.turnCount} ${enName} → ${moveName} [${effText}${critSuffix}] -${dmgPct}% → ${this.hpMy}%`
            )

            if (this.hpMy === 0) {
                this.$nextTick(() => {
                    document.querySelectorAll<HTMLElement>('.my-lead-sprite').forEach(el => {
                        gsap.to(el, { opacity: 0.25, rotation: -90, y: 12, duration: 0.5, ease: 'power2.out' })
                    })
                })
            }
        },

        // ── drag & drop slot reordering ───────────────────────────────────────
        dragStart(idx: number) {
            this._dragIdx = idx
        },

        dragOver(idx: number) {
            this._dragOver = idx
        },

        dragEnd() {
            const from = this._dragIdx
            const to = this._dragOver
            if (from === -1 || to === -1 || from === to) {
                this._dragIdx = -1; this._dragOver = -1; return
            }
            // swap slots
            const slots = this.mySlots
            const tmp = slots[from]
            slots[from] = slots[to]
            slots[to] = tmp
            this._dragIdx = -1
            this._dragOver = -1

            // GSAP bounce on the moved card
            this.$nextTick(() => {
                const cards = document.querySelectorAll<HTMLElement>('.battle-slot-card')
                const target = cards[to]
                if (target) gsap.from(target, { scale: 0.9, duration: 0.25, ease: 'back.out(1.7)' })
            })
            this.recomputeAnalysis()
            this.saveToStorage()
        },

        // ── swap leads ────────────────────────────────────────────────────────
        swapMyLead(idx: number) {
            const tmp = this.mySlots[0]
            this.mySlots[0] = this.mySlots[idx]
            this.mySlots[idx] = tmp
            this.hpMy = 100
            this.recomputeAnalysis()
        },

        swapEnemyLead(idx: number) {
            const tmp = this.enemySlots[0]
            this.enemySlots[0] = this.enemySlots[idx]
            this.enemySlots[idx] = tmp
            this.hpEnemy = 100
            this.recomputeAnalysis()
        },

        // ── random enemy ──────────────────────────────────────────────────────
        async randomEnemy() {
            const list = await getPokemonList()
            const count = this.slotCount
            for (let i = 0; i < count; i++) {
                const rand = list[Math.floor(Math.random() * list.length)]
                await this.selectPokemon('enemy', i, rand.name)
            }
        },

        // ── full turn (speed-ordered auto-battle) ─────────────────────────────
        async fullTurn() {
            const myPokemon = this.mySlots[0].pokemon
            const enemyPokemon = this.enemySlots[0].pokemon
            if (!myPokemon || !enemyPokemon) return

            const myMoves = (this.mySlots[0].selectedMoves as (MoveDetail | null)[]).filter(Boolean) as MoveDetail[]
            const enMoves = (this.enemySlots[0].selectedMoves as (MoveDetail | null)[]).filter(Boolean) as MoveDetail[]
            const myMove = myMoves[0]
            const enMove = enMoves[0]
            if (!myMove || !enMove) return

            const mySpeed = myPokemon.stats.find(s => s.stat.name === 'speed')?.base_stat ?? 0
            const enSpeed = enemyPokemon.stats.find(s => s.stat.name === 'speed')?.base_stat ?? 0

            if (mySpeed >= enSpeed) {
                this.useMove(myMove)
                if (this.hpEnemy > 0) {
                    await new Promise<void>(resolve => { setTimeout(resolve, 750) })
                    this.useEnemyMove(enMove)
                }
            } else {
                this.useEnemyMove(enMove)
                if (this.hpMy > 0) {
                    await new Promise<void>(resolve => { setTimeout(resolve, 750) })
                    this.useMove(myMove)
                }
            }
        },

        // ── analysis ─────────────────────────────────────────────────────────
        recomputeAnalysis() {
            const myP = this.mySlots[0].pokemon
            const enP = this.enemySlots[0].pokemon
            if (!myP || !enP) return

            const myTypes = myP.types.map((t: any) => t.type.name)
            const enTypes = enP.types.map((t: any) => t.type.name)

            // Use selected moves when available, else fall back to best-scored moves
            const mySelected = this.mySlots[0].selectedMoves.filter(Boolean) as MoveDetail[]
            const enSelected = this.enemySlots[0].selectedMoves.filter(Boolean) as MoveDetail[]
            const myMoves = mySelected.length > 0 ? mySelected : scoreMoves(this.mySlots[0].moves, myTypes, enTypes)
            const enMoves = enSelected.length > 0 ? enSelected : scoreMoves(this.enemySlots[0].moves, enTypes, myTypes)

            // win bar — only meaningful when at least one side has actual moves
            const hasMoves = mySelected.length > 0 || enSelected.length > 0
            if (!hasMoves) { this.winPct = 50; return }
            const lScore = myMoves.reduce((s, m) => s + (m.power ?? 0) * effectiveness(m.type.name, enTypes) * (myTypes.includes(m.type.name) ? 1.5 : 1), 0)
            const rScore = enMoves.reduce((s, m) => s + (m.power ?? 0) * effectiveness(m.type.name, myTypes) * (enTypes.includes(m.type.name) ? 1.5 : 1), 0)
            this.winPct = lScore + rScore > 0 ? (lScore / (lScore + rScore)) * 100 : 50

            // switch suggestion
            const suggestions: string[] = []
            for (let i = 1; i < this.slotCount; i++) {
                const bench = this.mySlots[i]
                if (!bench.pokemon) continue
                const benchTypes = bench.pokemon.types.map((t: any) => t.type.name)
                const benchMoves = bench.selectedMoves.filter(Boolean) as MoveDetail[]
                const benchScore = benchMoves.reduce((s, m) => s + (m.power ?? 60) * effectiveness(m.type.name, enTypes) * (benchTypes.includes(m.type.name) ? 1.5 : 1), 0)
                if (benchScore > lScore * 1.2) {
                    const best = benchMoves.sort((a, b) => effectiveness(b.type.name, enTypes) - effectiveness(a.type.name, enTypes))[0]
                    if (best) suggestions.push(`Switch to ${cap(bench.pokemon.name)} — ${cap(best.name.replace(/-/g, ' '))} is ${effectiveness(best.type.name, enTypes)}× vs ${cap(enP.name)}`)
                }
            }
            const newSuggestion = suggestions[0] ?? ''
            if (newSuggestion !== this.switchSuggestion) {
                this.switchSuggestion = newSuggestion
                if (newSuggestion) {
                    this.$nextTick(() => {
                        const el = this.$refs['suggestionCard'] as HTMLElement
                        if (el) gsap.from(el, { scale: 0, rotation: -10, duration: 0.45, ease: 'back.out(1.7)' })
                    })
                }
            }
        },

        // ── localStorage ─────────────────────────────────────────────────────
        saveToStorage() {
            const key = `battle_team_${this.mode}`
            const data = this.mySlots.map((s: BattleSlot) => ({
                pokemonName: s.pokemon?.name ?? null,
                moves: s.selectedMoves.map((m) => m?.name ?? null),
            }))
            localStorage.setItem(key, JSON.stringify(data))
        },

        async loadFromStorage() {
            const key = `battle_team_${this.mode}`
            const raw = localStorage.getItem(key)
            if (!raw) return
            try {
                const data: Array<{ pokemonName: string | null; moves: (string | null)[] }> = JSON.parse(raw)
                for (let i = 0; i < data.length && i < 6; i++) {
                    const entry = data[i]
                    if (!entry.pokemonName) continue
                    this.mySlots[i].loading = true
                    try {
                        const pokemon = await fetchPokemon(entry.pokemonName)
                        const allMoves = await fetchMoves(pokemon.moves)
                        this.mySlots[i].pokemon = pokemon
                        this.mySlots[i].moves = allMoves
                        this.mySlots[i].query = pokemon.name
                        this.mySlots[i].selectedMoves = entry.moves.map((mn) => allMoves.find((m) => m.name === mn) ?? null) as any
                    } finally {
                        this.mySlots[i].loading = false
                    }
                }
                this.recomputeAnalysis()
            } catch { /* ignore corrupted storage */ }
        },

        // ── reset ─────────────────────────────────────────────────────────────
        resetAll() {
            const allSlotEls = document.querySelectorAll<HTMLElement>('[x-ref="mySlotCard"]')
            const doReset = () => {
                this.mySlots = Array.from({ length: 6 }, emptySlot)
                this.enemySlots = Array.from({ length: 6 }, emptySlot)
                this.lastMove = null
                this.switchSuggestion = ''
                this.winPct = 50
                this.battleLog = []
                this.turnCount = 0
                this.hpEnemy = 100
                this.hpMy = 100
                localStorage.removeItem(`battle_team_${this.mode}`)
            }
            if (allSlotEls.length) {
                gsap.to(allSlotEls, { opacity: 0, y: 10, stagger: 0.05, duration: 0.2, onComplete: doReset })
            } else {
                doReset()
            }
        },
    }))
}