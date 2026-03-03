import type { TeamSlot } from '../store/team'
import { EFFECTIVENESS, TYPES } from '../data/constants'
import { calcDefenseProfile } from './defense'

export interface TeamCoverage {
    offensiveCoverage: string[]              // lowercase types hit super-effectively via STAB
    teamWeaknesses: Record<string, number>   // capitalized type → count of members 2x+ weak
    teamResistances: Record<string, number>  // capitalized type → count of members resisting
    commonWeaknesses: string[]               // capitalized types ≥2 members are weak to
    immunities: string[]                     // capitalized types at least one member is immune to
    coverageScore: number                    // 0–100 (% of 18 types covered offensively)
    synergyScore: number                     // 0–100 composite score
    synergyBreakdown: string[]               // human-readable lines explaining the score
    speedTiers: {
        blazing: TeamSlot[]   // base speed ≥ 110 (assumes neutral nature)
        fast: TeamSlot[]      // base speed 80–109
        slow: TeamSlot[]      // base speed < 80
    }
}

export function analyzeTeam(slots: (TeamSlot | null)[]): TeamCoverage {
    const filled = slots.filter(Boolean) as TeamSlot[]

    if (filled.length === 0) {
        return {
            offensiveCoverage: [],
            teamWeaknesses: {},
            teamResistances: {},
            commonWeaknesses: [],
            immunities: [],
            coverageScore: 0,
            synergyScore: 0,
            synergyBreakdown: [],
            speedTiers: { blazing: [], fast: [], slow: [] },
        }
    }

    // Defensive analysis — count how many members are weak/resistant to each attacking type
    const teamWeaknesses: Record<string, number> = {}
    const teamResistances: Record<string, number> = {}
    const immunitiesSet = new Set<string>()

    for (const slot of filled) {
        const profile = calcDefenseProfile(slot.types)
        // quad-weak counts double (2 members' worth of weakness)
        for (const t of profile.quad) teamWeaknesses[t] = (teamWeaknesses[t] ?? 0) + 2
        for (const t of profile.double) teamWeaknesses[t] = (teamWeaknesses[t] ?? 0) + 1
        for (const t of profile.half) teamResistances[t] = (teamResistances[t] ?? 0) + 1
        for (const t of profile.quarter) teamResistances[t] = (teamResistances[t] ?? 0) + 2
        for (const t of profile.immune) immunitiesSet.add(t)
    }

    const immunities = [...immunitiesSet]

    // Common weaknesses: types with a total weakness count ≥ 2
    const commonWeaknesses = Object.entries(teamWeaknesses)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type)

    // Offensive coverage — types the team can hit super-effectively via STAB (proxy)
    // Note: includes STAB effectiveness >1×; neutral-STAB types (1× effectiveness with STAB)
    // are intentionally excluded since row[defIdx] > 1 filters to strictly super-effective.
    const offensiveCoverage = new Set<string>()
    for (const slot of filled) {
        for (const attackerType of slot.types) {
            const attackerCap = attackerType.charAt(0).toUpperCase() + attackerType.slice(1)
            const row = EFFECTIVENESS[attackerCap]
            if (!row) continue
            TYPES.forEach((defType, defIdx) => {
                if (row[defIdx] > 1) offensiveCoverage.add(defType.toLowerCase())
            })
        }
    }

    const coverageScore = Math.round((offensiveCoverage.size / 18) * 100)

    // Speed tiers — based on base speed stat (assumes neutral nature, no EV/IV adjustment)
    const speedTiers = {
        blazing: filled.filter((s) => (s.stats.speed ?? 0) >= 110),
        fast: filled.filter((s) => (s.stats.speed ?? 0) >= 80 && (s.stats.speed ?? 0) < 110),
        slow: filled.filter((s) => (s.stats.speed ?? 0) < 80),
    }

    // Synergy score: start at 100, apply penalties and bonuses
    let synergyScore = 100
    const breakdown: string[] = []

    // -15 per common weakness (industry-standard weight; weaknesses are more critical than bonuses)
    const weaknessPenalty = commonWeaknesses.length * 15
    if (weaknessPenalty > 0) {
        synergyScore -= weaknessPenalty
        const sample = commonWeaknesses.slice(0, 3).join(', ')
        const more = commonWeaknesses.length > 3 ? `… (+${commonWeaknesses.length - 3} more)` : ''
        breakdown.push(`-${weaknessPenalty} Common weaknesses: ${sample}${more}`)
    }

    // -5 per missing speed tier (all 3 covered = full speed diversity)
    const missingTiers: string[] = []
    if (speedTiers.blazing.length === 0) missingTiers.push('blazing')
    if (speedTiers.fast.length === 0) missingTiers.push('fast')
    if (speedTiers.slow.length === 0) missingTiers.push('slow')
    const tierPenalty = missingTiers.length * 5
    if (tierPenalty > 0) {
        synergyScore -= tierPenalty
        breakdown.push(`-${tierPenalty} Missing speed tier${missingTiers.length > 1 ? 's' : ''}: ${missingTiers.join(', ')}`)
    }

    // +5 per immune type on team (capped at +15)
    const immunityBonus = Math.min(15, immunities.length * 5)
    if (immunityBonus > 0) {
        synergyScore += immunityBonus
        const sample = immunities.slice(0, 3).join(', ')
        breakdown.push(`+${immunityBonus} Immunities: ${sample}`)
    }

    synergyScore = Math.max(0, Math.min(100, synergyScore))

    // Coverage line always shown
    const uncovered = 18 - offensiveCoverage.size
    if (uncovered === 0) {
        breakdown.push(`Coverage: 100% — all 18 types covered ✓`)
    } else {
        breakdown.push(`Coverage: ${coverageScore}% — ${uncovered} type${uncovered > 1 ? 's' : ''} uncovered`)
    }

    if (breakdown.length === 1 && synergyScore === 100) {
        breakdown.unshift('Perfect balance!')
    }

    return {
        offensiveCoverage: [...offensiveCoverage],
        teamWeaknesses,
        teamResistances,
        commonWeaknesses,
        immunities,
        coverageScore,
        synergyScore,
        synergyBreakdown: breakdown,
        speedTiers,
    }
}
