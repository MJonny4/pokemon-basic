import type { TeamSlot } from '../../alpine/stores/team'
import { EFFECTIVENESS, TYPES } from '../data/constants'
import { calcDefenseProfile } from './defense'
import { calcStat } from './stat-calc'
import movesData from '../data/moves-data.json'

// Abilities that grant a full type immunity (keyed by lowercase API ability name)
const ABILITY_IMMUNITIES: Record<string, string> = {
    'levitate':        'Ground',
    'flash-fire':      'Fire',
    'water-absorb':    'Water',
    'dry-skin':        'Water',
    'storm-drain':     'Water',
    'volt-absorb':     'Electric',
    'lightning-rod':   'Electric',
    'motor-drive':     'Electric',
    'sap-sipper':      'Grass',
    'earth-eater':     'Ground',
    'well-baked-body': 'Fire',
    'wind-rider':      'Flying',
}

export interface TeamCoverage {
    offensiveCoverage: string[]              // lowercase types hit super-effectively by selected damaging moves
    damagingMoveCount: number
    unresolvedMoves: string[]
    teamWeaknesses: Record<string, number>   // capitalized type → count of members 2x+ weak
    teamResistances: Record<string, number>  // capitalized type → count of members resisting
    commonWeaknesses: string[]               // capitalized types ≥2 members are weak to
    immunities: string[]                     // capitalized types at least one member is immune to
    coverageScore: number                    // 0–100 (% of 18 types covered offensively)
    synergyScore: number                     // 0–100 composite score
    synergyBreakdown: string[]               // human-readable lines explaining the score
    speedRows: { slotIndex: number; pokemonName: string; speed: number | null; level: number }[]
}

interface LocalMove { type: string; damage_class: string; power: number | null }
const MOVES = movesData as Record<string, LocalMove>

export function analyzeTeam(slots: (TeamSlot | null)[]): TeamCoverage {
    const filled = slots.filter(Boolean) as TeamSlot[]

    if (filled.length === 0) {
        return {
            offensiveCoverage: [],
            damagingMoveCount: 0,
            unresolvedMoves: [],
            teamWeaknesses: {},
            teamResistances: {},
            commonWeaknesses: [],
            immunities: [],
            coverageScore: 0,
            synergyScore: 0,
            synergyBreakdown: [],
            speedRows: [],
        }
    }

    // Defensive analysis — count how many members are weak/resistant to each attacking type
    const teamWeaknesses: Record<string, number> = {}
    const teamResistances: Record<string, number> = {}
    const immunitiesSet = new Set<string>()

    for (const slot of filled) {
        const profile = calcDefenseProfile(slot.types)
        const abilityKey = slot.ability?.toLowerCase() ?? null
        const abilityImmuneType = abilityKey ? ABILITY_IMMUNITIES[abilityKey] : null
        // Each member counts once. One 4× weakness is not two shared weaknesses.
        for (const t of [...profile.quad, ...profile.double]) {
            if (t !== abilityImmuneType) teamWeaknesses[t] = (teamWeaknesses[t] ?? 0) + 1
        }
        for (const t of [...profile.half, ...profile.quarter]) {
            if (t !== abilityImmuneType) teamResistances[t] = (teamResistances[t] ?? 0) + 1
        }
        for (const t of profile.immune) immunitiesSet.add(t)
        if (abilityImmuneType) immunitiesSet.add(abilityImmuneType)
    }

    const immunities = [...immunitiesSet]

    // Common weaknesses: types with a total weakness count ≥ 2
    const commonWeaknesses = Object.entries(teamWeaknesses)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type)

    // Offensive coverage from selected damaging moves in the local modern catalog.
    const offensiveCoverage = new Set<string>()
    const unresolvedMoves = new Set<string>()
    let damagingMoveCount = 0
    for (const slot of filled) {
        for (const moveName of slot.moves) {
            if (!moveName) continue
            const move = MOVES[moveName]
            if (!move) { unresolvedMoves.add(moveName); continue }
            if (move.damage_class === 'status' || !move.power) continue
            damagingMoveCount++
            const attackerCap = move.type.charAt(0).toUpperCase() + move.type.slice(1)
            const row = EFFECTIVENESS[attackerCap]
            if (!row) continue
            TYPES.forEach((defType, defIdx) => {
                if (row[defIdx] > 1) offensiveCoverage.add(defType.toLowerCase())
            })
        }
    }

    const coverageScore = Math.round((offensiveCoverage.size / 18) * 100)

    const speedRows = slots.flatMap((slot, slotIndex) => {
        if (!slot) return []
        const base = slot.stats?.speed
        const level = slot.level
        const iv = slot.ivs?.speed
        const ev = slot.evs?.speed
        const valid = Number.isInteger(base) && base >= 1 && Number.isInteger(level) && level >= 1 && level <= 100 &&
            Number.isInteger(iv) && iv >= 0 && iv <= 31 && Number.isInteger(ev) && ev >= 0 && ev <= 252
        return [{ slotIndex, pokemonName: slot.pokemonName, speed: valid ? calcStat('speed', base, iv, ev, level, slot.nature) : null, level }]
    }).sort((a, b) => (b.speed ?? -1) - (a.speed ?? -1))

    // ── Synergy score ──────────────────────────────────────────────────────────
    // Design targets (with typical bonuses):
    //   8 common weaknesses  → ~50–60  (amber/red — genuinely problematic)
    //   4–5 common weaknesses → ~65–80  (amber — room to improve)
    //   2–3 common weaknesses → ~80–95  (green — solid team)
    //   0–1 common weaknesses → ~95–100 (green — excellent)
    //
    // Key constraint: max bonuses (~19) must be << max realistic penalty (8×8=64)
    // so bonuses reward good building without masking severe weakness clusters.
    let synergyScore = 100
    const breakdown: string[] = []

    // PENALTY: -8 per common weakness, no cap.
    // (Capping at -40 allowed max bonuses to nearly cancel it out, e.g. 98/100 with 8 weaknesses.)
    const weaknessPenalty = commonWeaknesses.length * 8
    if (weaknessPenalty > 0) {
        synergyScore -= weaknessPenalty
        const sample = commonWeaknesses.slice(0, 3).join(', ')
        const more = commonWeaknesses.length > 3 ? ` (+${commonWeaknesses.length - 3} more)` : ''
        breakdown.push(`-${weaknessPenalty} Common weaknesses: ${sample}${more}`)
    }

    // BONUS: +4 per immune type (capped at +12).
    // Kept small so immunities help but can't paper over many weaknesses.
    const immunityBonus = Math.min(12, immunities.length * 4)
    if (immunityBonus > 0) {
        synergyScore += immunityBonus
        const sample = immunities.slice(0, 4).join(', ')
        breakdown.push(`+${immunityBonus} Immunities: ${sample}`)
    }

    // BONUS: +3 if ≥13 types covered by selected attacks, +2 if ≥10.
    const covBonus = offensiveCoverage.size >= 13 ? 3 : offensiveCoverage.size >= 10 ? 2 : 0
    if (covBonus > 0) {
        synergyScore += covBonus
        breakdown.push(`+${covBonus} Coverage: ${offensiveCoverage.size}/18 types (${coverageScore}%)`)
    } else {
        const uncovered = 18 - offensiveCoverage.size
        breakdown.push(`Coverage: ${coverageScore}% — ${uncovered} type${uncovered > 1 ? 's' : ''} uncovered`)
    }

    // BONUS: +4 if team resists ≥12 distinct types, +2 if ≥8.
    const resistTypeCount = Object.keys(teamResistances).length
    const resistBonus = resistTypeCount >= 12 ? 4 : resistTypeCount >= 8 ? 2 : 0
    if (resistBonus > 0) {
        synergyScore += resistBonus
        breakdown.push(`+${resistBonus} Defensive spread: resists ${resistTypeCount} types`)
    }

    synergyScore = Math.max(0, Math.min(100, synergyScore))

    if (filled.length >= 3 && damagingMoveCount >= filled.length && synergyScore >= 95 && weaknessPenalty === 0) {
        breakdown.unshift('Excellent balance!')
    }

    return {
        offensiveCoverage: [...offensiveCoverage],
        damagingMoveCount,
        unresolvedMoves: [...unresolvedMoves],
        teamWeaknesses,
        teamResistances,
        commonWeaknesses,
        immunities,
        coverageScore,
        synergyScore,
        synergyBreakdown: breakdown,
        speedRows,
    }
}
