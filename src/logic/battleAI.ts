import type { BattleState, BattleAction, BattlePokemon } from './battleEngine'
import { calcDamageRange, getTypeEffectiveness } from './damageCalc'
import type { AttackerState, DefenderState, FieldState } from './damageCalc'
import { MOVE_EFFECTS } from './moveEffects'
import type { MoveDetail } from '../api/pokeapi'

/** Build attacker state from a BattlePokemon for damage calculation. */
function buildAttacker(atk: BattlePokemon, moveStatKey: 'attack' | 'special-attack'): AttackerState {
    const slot = atk.slot
    return {
        level: slot.level ?? 50,
        baseStat: slot.stats[moveStatKey] ?? 50,
        iv: slot.ivs?.[moveStatKey] ?? 31,
        ev: slot.evs?.[moveStatKey] ?? 0,
        nature: slot.nature,
        statKey: moveStatKey,
        types: atk.types,
        item: slot.item,
        isBurned: atk.status === 'burn',
    }
}

/** Build defender state from a BattlePokemon. */
function buildDefender(def: BattlePokemon, defStatKey: 'defense' | 'special-defense'): DefenderState {
    const slot = def.slot
    return {
        level: slot.level ?? 50,
        baseDef: slot.stats[defStatKey] ?? 50,
        iv: slot.ivs?.[defStatKey] ?? 31,
        ev: slot.evs?.[defStatKey] ?? 0,
        nature: slot.nature,
        defKey: defStatKey,
        types: def.types,
        item: slot.item,
        baseHp: slot.stats.hp ?? 45,
        hpIv: slot.ivs?.hp ?? 31,
        hpEv: slot.evs?.hp ?? 0,
    }
}

/** Expected max damage of a move from attacker vs defender. Returns 0 for status or immune. */
function expectedDamage(
    atk: BattlePokemon,
    def: BattlePokemon,
    move: MoveDetail,
    field: FieldState,
): number {
    if (!move.power || move.damage_class?.name === 'status') return 0
    const category = move.damage_class?.name as 'physical' | 'special'
    const atkStatKey: 'attack' | 'special-attack' = category === 'physical' ? 'attack' : 'special-attack'
    const defStatKey: 'defense' | 'special-defense' = category === 'physical' ? 'defense' : 'special-defense'

    const attackerState = buildAttacker(atk, atkStatKey)
    const defenderState = buildDefender(def, defStatKey)

    const moveInfo = {
        name: move.name,
        type: move.type?.name ?? 'normal',
        category,
        power: move.power,
    }

    const result = calcDamageRange(moveInfo, attackerState, defenderState, field)
    if (!result || result.effectiveness === 0) return 0
    return result.max
}

/**
 * Select the best action for the CPU this turn.
 * Priority:
 * 1. If current HP < 25% and a non-fainted team member has better type matchup → switch
 * 2. If healthy (HP > 60%) and best damage < 40% foe HP → use a setup move if available
 * 3. If healthy (HP > 50%) and best damage < 30% foe HP and foe has no status → use a status move
 * 4. Use the move with highest expected max damage (prefer STAB on ties)
 * 5. If all moves do 0 → use any status move, else Struggle
 */
export function selectCpuAction(
    state: BattleState,
): BattleAction {
    const cpu = state.cpuTeam[state.cpuActive]
    const player = state.playerTeam[state.playerActive]
    const cpuMoves = state.cpuMoves[state.cpuActive] ?? []

    const field: FieldState = {
        weather: state.field.weather,
        reflect: state.field.playerReflect,
        lightScreen: state.field.playerLightScreen,
        isCrit: false,
    }

    // 1. Low HP + bad matchup → consider switching
    if (cpu.currentHp < cpu.maxHp * 0.25) {
        const effectiveness = getTypeEffectiveness(
            player.types[0] ?? 'normal',
            cpu.types,
        )
        if (effectiveness >= 2) {
            // Find a non-fainted team member with better matchup
            const betterIdx = state.cpuTeam.findIndex((p, i) => {
                if (p.fainted || i === state.cpuActive) return false
                const defEff = getTypeEffectiveness(player.types[0] ?? 'normal', p.types)
                return defEff < effectiveness
            })
            if (betterIdx >= 0) {
                return { type: 'switch', toIndex: betterIdx }
            }
        }
    }

    // Helper: compute best damage across all moves
    const allMoveDetails = cpu.slot.moves
        .map((name, i) => name ? { i, md: cpuMoves.find(m => m.name === name) } : null)
        .filter((x): x is { i: number; md: MoveDetail } => x !== null && x.md !== undefined)
    const bestDmg = allMoveDetails.reduce((max, { md }) => Math.max(max, expectedDamage(cpu, player, md, field)), 0)

    // 2. Setup moves when healthy and foe is tanky
    if (cpu.currentHp > cpu.maxHp * 0.6 && bestDmg < player.maxHp * 0.4) {
        for (const { i, md } of allMoveDetails) {
            const effect = MOVE_EFFECTS[md.name]
            if (effect?.statChanges?.some(sc => sc.target === 'self' && sc.stages > 0)) {
                return { type: 'move', moveIndex: i }
            }
        }
    }

    // 3. Status infliction when healthy, foe has no status, and our damage is low
    if (cpu.currentHp > cpu.maxHp * 0.5 && !player.status && bestDmg < player.maxHp * 0.3) {
        for (const { i, md } of allMoveDetails) {
            if (MOVE_EFFECTS[md.name]?.inflictStatus) {
                return { type: 'move', moveIndex: i }
            }
        }
    }

    // 4. Score each move
    const moveScores: Array<{ idx: number; score: number; isStab: boolean }> = []

    for (let i = 0; i < 4; i++) {
        const moveName = cpu.slot.moves[i]
        if (!moveName) continue
        const moveDetail = cpuMoves.find(m => m.name === moveName)
        if (!moveDetail) continue

        const dmg = expectedDamage(cpu, player, moveDetail, field)
        const isStab = cpu.types.includes(moveDetail.type?.name ?? '')
        moveScores.push({ idx: i, score: dmg, isStab })
    }

    if (moveScores.length === 0) return { type: 'struggle' }

    // Sort: highest damage first, prefer STAB on tie
    moveScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (a.isStab && !b.isStab) return -1
        if (!a.isStab && b.isStab) return 1
        return 0
    })

    const best = moveScores[0]
    if (best.score === 0) {
        // All moves do 0 (immune or status) — use a status move if available, else struggle
        const statusMoveIdx = moveScores.find(m => {
            const moveName = cpu.slot.moves[m.idx]
            const md = cpuMoves.find(d => d.name === moveName)
            return md?.damage_class?.name === 'status'
        })
        if (statusMoveIdx) return { type: 'move', moveIndex: statusMoveIdx.idx }
        return { type: 'struggle' }
    }

    return { type: 'move', moveIndex: best.idx }
}
