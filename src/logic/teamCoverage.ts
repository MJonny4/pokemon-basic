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

    // INFORMATIONAL: Speed tiers — no penalty.
    // Having no slow Pokémon is fine in standard competitive play.
    const speedSummary: string[] = []
    if (speedTiers.blazing.length > 0) speedSummary.push(`${speedTiers.blazing.length} blazing`)
    if (speedTiers.fast.length > 0) speedSummary.push(`${speedTiers.fast.length} fast`)
    if (speedTiers.slow.length > 0) speedSummary.push(`${speedTiers.slow.length} slow`)
    if (speedSummary.length > 0) breakdown.push(`Speed tiers: ${speedSummary.join(', ')}`)

    // BONUS: +4 per immune type (capped at +12).
    // Kept small so immunities help but can't paper over many weaknesses.
    const immunityBonus = Math.min(12, immunities.length * 4)
    if (immunityBonus > 0) {
        synergyScore += immunityBonus
        const sample = immunities.slice(0, 4).join(', ')
        breakdown.push(`+${immunityBonus} Immunities: ${sample}`)
    }

    // BONUS: +3 if ≥13 types covered offensively via STAB, +2 if ≥10.
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

    if (synergyScore >= 95 && weaknessPenalty === 0) {
        breakdown.unshift('Excellent balance!')
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