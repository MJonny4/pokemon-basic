import { calcStat } from './stat-calc'
import { calcDamageRange } from './damage-calc'
import type { AttackerState, DefenderState, FieldState, MoveInfo } from './damage-calc'
import { MOVE_EFFECTS, getMovePriority } from './move-effects'
import type { StatusCondition } from './move-effects'
import type { TeamSlot } from '../../alpine/stores/team'
import type { MoveDetail } from '../api/pokeapi'

export type { StatusCondition }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CpuSlot {
    pokemonName: string
    pokemonId: number
    types: string[]
    stats: Record<string, number>
    nature: string | null
    ability: string | null
    item: string | null
    moves: [string | null, string | null, string | null, string | null]
    role: string | null
    evs: Record<string, number>
    ivs: Record<string, number>
    level: number
}

export interface BattlePokemon {
    slot: TeamSlot | CpuSlot
    name: string                    // display name (capitalized)
    pokemonId: number
    types: string[]                 // lowercase
    maxHp: number
    currentHp: number
    status: StatusCondition | null
    toxicCounter: number            // stacking toxic damage counter
    sleepCounter: number            // turns remaining asleep (0 = not asleep)
    statStages: Record<string, number>  // atk/def/spa/spd/spe: -6..+6
    fainted: boolean
}

export interface BattleField {
    weather: 'sun' | 'rain' | 'sand' | 'snow' | null
    weatherTurns: number
    playerReflect: boolean
    playerLightScreen: boolean
    cpuReflect: boolean
    cpuLightScreen: boolean
}

export type BattleAction =
    | { type: 'move'; moveIndex: number }
    | { type: 'switch'; toIndex: number }
    | { type: 'struggle' }

export interface BattleState {
    playerTeam: BattlePokemon[]
    cpuTeam: BattlePokemon[]
    playerActive: number
    cpuActive: number
    field: BattleField
    turnLog: string[]
    phase: 'setup' | 'selecting' | 'animating' | 'switching' | 'battle-end'
    winner: 'player' | 'cpu' | null
    turn: number
    playerAction: BattleAction | null
    cpuAction: BattleAction | null
    // Available moves for each side (loaded once at start)
    playerMoves: MoveDetail[][]    // [slotIndex][moveIndex]
    cpuMoves: MoveDetail[][]
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function makeBattlePokemon(slot: TeamSlot | CpuSlot): BattlePokemon {
    const maxHp = calcStat(
        'hp',
        slot.stats.hp ?? 45,
        slot.ivs?.hp ?? 31,
        slot.evs?.hp ?? 0,
        slot.level ?? 50,
        slot.nature,
    )
    return {
        slot,
        name: slot.pokemonName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-'),
        pokemonId: slot.pokemonId,
        types: slot.types,
        maxHp,
        currentHp: maxHp,
        status: null,
        toxicCounter: 0,
        sleepCounter: 0,
        statStages: { attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        fainted: false,
    }
}

// ── Stat stage multiplier (Gen 5+ table) ──────────────────────────────────────

export function stageMultiplier(stage: number): [number, number] {
    const table: Record<number, [number, number]> = {
        '-6': [2, 8], '-5': [2, 7], '-4': [2, 6], '-3': [2, 5], '-2': [2, 4], '-1': [2, 3],
        '0': [2, 2],
        '1': [3, 2], '2': [4, 2], '3': [5, 2], '4': [6, 2], '5': [7, 2], '6': [8, 2],
    }
    return (table as Record<string, [number, number]>)[String(stage)] ?? [2, 2]
}

// ── Speed (with status/item modifier) ────────────────────────────────────────

function effectiveSpeed(bp: BattlePokemon): number {
    const slot = bp.slot
    const base = calcStat('speed', slot.stats.speed ?? 50, slot.ivs?.speed ?? 31, slot.evs?.speed ?? 0, slot.level ?? 50, slot.nature)
    const [num, den] = stageMultiplier(bp.statStages.speed ?? 0)
    let spd = Math.floor(base * num / den)
    if (bp.status === 'paralysis') spd = Math.floor(spd / 2)
    if (slot.item === 'Choice Scarf') spd = Math.floor(spd * 3 / 2)
    return spd
}

// ── Build MoveInfo from MoveDetail ────────────────────────────────────────────

function toMoveInfo(m: MoveDetail): MoveInfo {
    return {
        name: m.name,
        type: m.type?.name ?? 'normal',
        category: (m.damage_class?.name ?? 'status') as MoveInfo['category'],
        power: m.power ?? null,
    }
}

// ── Apply a single move action ────────────────────────────────────────────────

function applyMoveAction(
    attacker: BattlePokemon,
    defender: BattlePokemon,
    moveDetail: MoveDetail | null,
    field: BattleField,
    attackerSide: 'player' | 'cpu',
    events: string[],
): { attacker: BattlePokemon; defender: BattlePokemon } {
    let atk = { ...attacker, statStages: { ...attacker.statStages } }
    let def = { ...defender, statStages: { ...defender.statStages } }

    // Struggle (no PP)
    if (!moveDetail) {
        const dmg = Math.max(1, Math.floor(atk.maxHp / 4))
        def = { ...def, currentHp: Math.max(0, def.currentHp - dmg) }
        atk = { ...atk, currentHp: Math.max(0, atk.currentHp - dmg) }
        events.push(`${atk.name} used Struggle! (${dmg} damage, recoil ${dmg})`)
        if (def.currentHp <= 0) { def = { ...def, fainted: true }; events.push(`${def.name} fainted!`) }
        if (atk.currentHp <= 0) { atk = { ...atk, fainted: true }; events.push(`${atk.name} fainted from recoil!`) }
        return { attacker: atk, defender: def }
    }

    // Paralysis skip
    if (atk.status === 'paralysis' && Math.random() < 0.25) {
        events.push(`${atk.name} is paralyzed and can't move!`)
        return { attacker: atk, defender: def }
    }

    // Sleep
    if (atk.status === 'sleep') {
        if (atk.sleepCounter > 0) {
            atk = { ...atk, sleepCounter: atk.sleepCounter - 1 }
            if (atk.sleepCounter === 0) {
                atk = { ...atk, status: null }
                events.push(`${atk.name} woke up!`)
            } else {
                events.push(`${atk.name} is fast asleep!`)
                return { attacker: atk, defender: def }
            }
        }
    }

    // Freeze
    if (atk.status === 'freeze') {
        if (Math.random() < 0.2) {
            atk = { ...atk, status: null }
            events.push(`${atk.name} thawed out!`)
        } else {
            events.push(`${atk.name} is frozen solid!`)
            return { attacker: atk, defender: def }
        }
    }

    const moveName = moveDetail.name
    const effect = MOVE_EFFECTS[moveName]
    events.push(`${atk.name} used ${moveName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}!`)

    // Protect
    if (effect?.protect) {
        events.push(`${atk.name} protected itself!`)
        return { attacker: atk, defender: def }
    }

    // Damage move
    if (moveDetail.power && moveDetail.damage_class?.name !== 'status') {
        const info = toMoveInfo(moveDetail)
        const atkSlot = atk.slot
        const defSlot = def.slot

        const atkStatKey: 'attack' | 'special-attack' = info.category === 'physical' ? 'attack' : 'special-attack'
        const defStatKey: 'defense' | 'special-defense' = info.category === 'physical' ? 'defense' : 'special-defense'

        const [atkNum, atkDen] = stageMultiplier(atk.statStages[atkStatKey] ?? 0)
        const [defNum, defDen] = stageMultiplier(def.statStages[defStatKey] ?? 0)

        const baseAtk = calcStat(atkStatKey, atkSlot.stats[atkStatKey] ?? 50, atkSlot.ivs?.[atkStatKey] ?? 31, atkSlot.evs?.[atkStatKey] ?? 0, atkSlot.level ?? 50, atkSlot.nature)
        const baseDef = calcStat(defStatKey, defSlot.stats[defStatKey] ?? 50, defSlot.ivs?.[defStatKey] ?? 31, defSlot.evs?.[defStatKey] ?? 0, defSlot.level ?? 50, defSlot.nature)

        const modAtk = Math.floor(baseAtk * atkNum / atkDen)
        const modDef = Math.floor(baseDef * defNum / defDen)

        const atkAbility = (atkSlot as any).ability as string | null | undefined
        const attackerState: AttackerState = {
            level: atkSlot.level ?? 50,
            baseStat: atkSlot.stats[atkStatKey] ?? 50,
            iv: atkSlot.ivs?.[atkStatKey] ?? 31,
            ev: atkSlot.evs?.[atkStatKey] ?? 0,
            nature: atkSlot.nature,
            statKey: atkStatKey,
            types: atk.types,
            item: atkSlot.item,
            isBurned: atk.status === 'burn',
            adaptability: atkAbility === 'adaptability',
            hugepower: atkAbility === 'huge-power' || atkAbility === 'pure-power',
            hustle: atkAbility === 'hustle',
            guts: atkAbility === 'guts',
            overrideStat: modAtk,
        }

        const defenderState: DefenderState = {
            level: defSlot.level ?? 50,
            baseDef: defSlot.stats[defStatKey] ?? 50,
            iv: defSlot.ivs?.[defStatKey] ?? 31,
            ev: defSlot.evs?.[defStatKey] ?? 0,
            nature: defSlot.nature,
            defKey: defStatKey,
            types: def.types,
            item: defSlot.item,
            baseHp: defSlot.stats.hp ?? 45,
            hpIv: defSlot.ivs?.hp ?? 31,
            hpEv: defSlot.evs?.hp ?? 0,
            overrideDef: modDef,
        }

        const isCrit = Math.random() < (1 / 24)
        const fieldState: FieldState = {
            weather: field.weather,
            reflect: attackerSide === 'player' ? field.cpuReflect : field.playerReflect,
            lightScreen: attackerSide === 'player' ? field.cpuLightScreen : field.playerLightScreen,
            isCrit,
        }

        const result = calcDamageRange(info, attackerState, defenderState, fieldState)

        if (!result || result.effectiveness === 0) {
            events.push(`It doesn't affect ${def.name}!`)
        } else {
            if (isCrit) events.push('Critical hit!')
            // Pick a random roll from 16
            const dmg = result.rolls[Math.floor(Math.random() * 16)]
            const pct = Math.round(dmg / result.defenderMaxHp * 1000) / 10

            let eff = ''
            if (result.effectiveness >= 4) eff = 'It\'s super effective! '
            else if (result.effectiveness === 2) eff = 'It\'s super effective! '
            else if (result.effectiveness <= 0.5) eff = 'It\'s not very effective… '

            events.push(`${eff}${def.name} took ${dmg} damage (${pct}%)`)
            def = { ...def, currentHp: Math.max(0, def.currentHp - dmg) }

            // Life Orb recoil
            if (atkSlot.item === 'Life Orb') {
                const recoil = Math.max(1, Math.floor(atk.maxHp / 10))
                atk = { ...atk, currentHp: Math.max(0, atk.currentHp - recoil) }
                events.push(`${atk.name} is hurt by its Life Orb! (${recoil})`)
            }

            if (def.currentHp <= 0) { def = { ...def, fainted: true }; events.push(`${def.name} fainted!`) }
            if (atk.currentHp <= 0) { atk = { ...atk, fainted: true }; events.push(`${atk.name} fainted!`) }
        }
    }

    // Move effects (status / stat changes / heal) — only if defender not fainted
    if (effect && !def.fainted) {
        // Inflict status on target
        if (effect.inflictStatus && !def.status) {
            const immunity = statusImmunity(def, effect.inflictStatus)
            if (!immunity) {
                def = { ...def, status: effect.inflictStatus }
                if (effect.inflictStatus === 'sleep') def = { ...def, sleepCounter: 1 + Math.floor(Math.random() * 3) }
                events.push(`${def.name} is now ${effect.inflictStatus}!`)
            }
        }

        // Self status
        if (effect.selfStatus && !atk.status) {
            atk = { ...atk, status: effect.selfStatus }
            if (effect.selfStatus === 'sleep') {
                atk = { ...atk, sleepCounter: 2, currentHp: atk.maxHp }
                events.push(`${atk.name} fell asleep and recovered HP!`)
            }
        }

        // Stat changes
        if (effect.statChanges) {
            for (const sc of effect.statChanges) {
                if (sc.target === 'self') {
                    const cur = atk.statStages[sc.stat] ?? 0
                    const next = Math.max(-6, Math.min(6, cur + sc.stages))
                    atk = { ...atk, statStages: { ...atk.statStages, [sc.stat]: next } }
                    const label = sc.stages > 0 ? 'rose' : 'fell'
                    events.push(`${atk.name}'s ${sc.stat} ${label}!`)
                } else {
                    const cur = def.statStages[sc.stat] ?? 0
                    const next = Math.max(-6, Math.min(6, cur + sc.stages))
                    def = { ...def, statStages: { ...def.statStages, [sc.stat]: next } }
                    const label = sc.stages > 0 ? 'rose' : 'fell'
                    events.push(`${def.name}'s ${sc.stat} ${label}!`)
                }
            }
        }

        // Heal
        if (effect.heal && effect.heal > 0) {
            const healed = Math.floor(atk.maxHp * effect.heal)
            atk = { ...atk, currentHp: Math.min(atk.maxHp, atk.currentHp + healed) }
            events.push(`${atk.name} recovered ${healed} HP!`)
        }
    }

    // Self-faint moves (Explosion, Self-Destruct, Memento)
    if (effect?.selfFaint && !atk.fainted) {
        atk = { ...atk, currentHp: 0, fainted: true }
        events.push(`${atk.name} fainted!`)
    }

    return { attacker: atk, defender: def }
}

function statusImmunity(pkmn: BattlePokemon, status: StatusCondition): boolean {
    if (pkmn.status !== null) return true   // already has a status
    if (status === 'burn' && pkmn.types.includes('fire')) return true
    if (status === 'poison' && (pkmn.types.includes('poison') || pkmn.types.includes('steel'))) return true
    if (status === 'toxic' && (pkmn.types.includes('poison') || pkmn.types.includes('steel'))) return true
    if (status === 'freeze' && pkmn.types.includes('ice')) return true
    if (status === 'paralysis' && pkmn.types.includes('electric')) return true
    return false
}

// ── End-of-turn effects ───────────────────────────────────────────────────────

function applyEndOfTurn(
    pkmn: BattlePokemon,
    events: string[],
): BattlePokemon {
    if (pkmn.fainted) return pkmn
    let p = { ...pkmn }

    // Leftovers
    if (p.slot.item === 'Leftovers' && p.currentHp < p.maxHp) {
        const heal = Math.floor(p.maxHp / 16)
        p = { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) }
        events.push(`${p.name} restored ${heal} HP with Leftovers.`)
    }

    // Black Sludge (for poison types)
    if (p.slot.item === 'Black Sludge') {
        if (p.types.includes('poison')) {
            const heal = Math.floor(p.maxHp / 16)
            p = { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) }
            events.push(`${p.name} restored ${heal} HP with Black Sludge.`)
        } else {
            const dmg = Math.floor(p.maxHp / 8)
            p = { ...p, currentHp: Math.max(0, p.currentHp - dmg) }
            events.push(`${p.name} was hurt by Black Sludge! (${dmg})`)
        }
    }

    // Burn damage
    if (p.status === 'burn') {
        const dmg = Math.max(1, Math.floor(p.maxHp / 16))
        p = { ...p, currentHp: Math.max(0, p.currentHp - dmg) }
        events.push(`${p.name} was hurt by its burn! (${dmg})`)
    }

    // Poison damage
    if (p.status === 'poison') {
        const dmg = Math.max(1, Math.floor(p.maxHp / 8))
        p = { ...p, currentHp: Math.max(0, p.currentHp - dmg) }
        events.push(`${p.name} was hurt by poison! (${dmg})`)
    }

    // Toxic (stacking)
    if (p.status === 'toxic') {
        const counter = p.toxicCounter + 1
        const dmg = Math.max(1, Math.floor(p.maxHp * counter / 16))
        p = { ...p, currentHp: Math.max(0, p.currentHp - dmg), toxicCounter: counter }
        events.push(`${p.name} was badly poisoned! (${dmg})`)
    }

    if (p.currentHp <= 0 && !p.fainted) {
        p = { ...p, fainted: true }
        events.push(`${p.name} fainted!`)
    }

    return p
}

// ── Determine move details for an action ──────────────────────────────────────

function getMoveDetail(
    action: BattleAction,
    pkmn: BattlePokemon,
    movesForSlot: MoveDetail[],
): MoveDetail | null {
    if (action.type === 'struggle') return null
    if (action.type !== 'move') return null
    const moveName = pkmn.slot.moves[action.moveIndex]
    if (!moveName) return null
    return movesForSlot.find(m => m.name === moveName) ?? null
}

// ── Main turn resolution ──────────────────────────────────────────────────────

export function resolveTurn(
    state: BattleState,
): { newState: BattleState; events: string[] } {
    const events: string[] = []
    events.push(`─── Turn ${state.turn} ───`)
    let s = { ...state, playerTeam: [...state.playerTeam], cpuTeam: [...state.cpuTeam] }

    const player = { ...s.playerTeam[s.playerActive] }
    const cpu = { ...s.cpuTeam[s.cpuActive] }

    const pAction = s.playerAction!
    const cAction = s.cpuAction!

    // Determine priority
    const pMoveDetail = pAction.type === 'move'
        ? getMoveDetail(pAction, player, s.playerMoves[s.playerActive] ?? [])
        : null
    const cMoveDetail = cAction.type === 'move'
        ? getMoveDetail(cAction, cpu, s.cpuMoves[s.cpuActive] ?? [])
        : null

    const pPriority = pMoveDetail ? getMovePriority(pMoveDetail.name) : 0
    const cPriority = cMoveDetail ? getMovePriority(cMoveDetail.name) : 0

    // Determine order
    let playerGoesFirst: boolean
    if (pAction.type === 'switch') playerGoesFirst = true
    else if (cAction.type === 'switch') playerGoesFirst = false
    else if (pPriority !== cPriority) playerGoesFirst = pPriority > cPriority
    else {
        const pSpd = effectiveSpeed(player)
        const cSpd = effectiveSpeed(cpu)
        playerGoesFirst = pSpd > cSpd || (pSpd === cSpd && Math.random() < 0.5)
    }

    let playerPkmn = { ...player }
    let cpuPkmn = { ...cpu }

    // Handle switch actions
    function handleSwitch(side: 'player' | 'cpu', toIndex: number): void {
        if (side === 'player') {
            events.push(`${playerPkmn.name} was withdrawn!`)
            playerPkmn = s.playerTeam[toIndex]
            events.push(`Go, ${playerPkmn.name}!`)
        } else {
            events.push(`${cpuPkmn.name} was withdrawn!`)
            cpuPkmn = s.cpuTeam[toIndex]
            events.push(`CPU sent out ${cpuPkmn.name}!`)
        }
    }

    // Execute in order
    const executeAction = (side: 'player' | 'cpu') => {
        const isFaintedBeforeAct = side === 'player' ? playerPkmn.fainted : cpuPkmn.fainted
        if (isFaintedBeforeAct) return

        const action = side === 'player' ? pAction : cAction

        if (action.type === 'switch') {
            handleSwitch(side, action.toIndex)
            return
        }

        const attacker = side === 'player' ? playerPkmn : cpuPkmn
        const defenderBefore = side === 'player' ? cpuPkmn : playerPkmn
        const moveDetail = side === 'player' ? pMoveDetail : cMoveDetail

        const { attacker: a2, defender: d2 } = applyMoveAction(
            attacker, defenderBefore, moveDetail,
            s.field, side, events,
        )
        if (side === 'player') { playerPkmn = a2; cpuPkmn = d2 }
        else { cpuPkmn = a2; playerPkmn = d2 }
    }

    if (playerGoesFirst) {
        executeAction('player')
        executeAction('cpu')
    } else {
        executeAction('cpu')
        executeAction('player')
    }

    // End-of-turn effects
    if (!playerPkmn.fainted) playerPkmn = applyEndOfTurn(playerPkmn, events)
    if (!cpuPkmn.fainted) cpuPkmn = applyEndOfTurn(cpuPkmn, events)

    // Resolve active indices first (needed for correct write-back slot)
    let newPlayerActive = s.playerActive
    let newCpuActive = s.cpuActive
    if (pAction.type === 'switch') newPlayerActive = pAction.toIndex
    if (cAction.type === 'switch') newCpuActive = cAction.toIndex

    // Write back — when a switch happened, playerPkmn is the switched-IN pokemon;
    // write it to the new slot, leave the old slot (withdrawn pokemon) untouched.
    const newPlayerTeam = [...s.playerTeam]
    if (pAction.type === 'switch') {
        newPlayerTeam[newPlayerActive] = playerPkmn
    } else {
        newPlayerTeam[s.playerActive] = playerPkmn
    }

    const newCpuTeam = [...s.cpuTeam]
    if (cAction.type === 'switch') {
        newCpuTeam[newCpuActive] = cpuPkmn
    } else {
        newCpuTeam[s.cpuActive] = cpuPkmn
    }

    // Check battle end
    const playerAllFainted = newPlayerTeam.every(p => p.fainted)
    const cpuAllFainted = newCpuTeam.every(p => p.fainted)
    let winner: 'player' | 'cpu' | null = null
    let phase: BattleState['phase'] = 'selecting'

    if (playerAllFainted) { winner = 'cpu'; phase = 'battle-end'; events.push('You lost the battle!') }
    else if (cpuAllFainted) { winner = 'player'; phase = 'battle-end'; events.push('You won the battle!') }
    else if (newPlayerTeam[newPlayerActive].fainted) phase = 'switching'
    else if (newCpuTeam[newCpuActive].fainted) {
        // Auto-switch CPU to first alive
        const nextCpu = newCpuTeam.findIndex(p => !p.fainted)
        if (nextCpu >= 0) {
            newCpuActive = nextCpu
            events.push(`CPU sent out ${newCpuTeam[nextCpu].name}!`)
        }
    }

    const newState: BattleState = {
        ...s,
        playerTeam: newPlayerTeam,
        cpuTeam: newCpuTeam,
        playerActive: newPlayerActive,
        cpuActive: newCpuActive,
        turnLog: [...s.turnLog, ...events],
        phase,
        winner,
        turn: s.turn + 1,
        playerAction: null,
        cpuAction: null,
    }

    return { newState, events }
}
