import { NATURES, NATURE_FLAVOR } from '../data/natures'

export interface ScoredNature {
    name: string
    plus: string | null
    minus: string | null
    score: number
    isNeutral: boolean
    flavor: string
}

const ROLE_BOOST_MAP: Record<string, string[]> = {
    physical_sweeper: ['attack', 'speed'],
    special_sweeper: ['special-attack', 'speed'],
    physical_attacker: ['attack'],
    special_attacker: ['special-attack'],
    physical_wall: ['defense', 'special-defense'],
    special_wall: ['special-defense', 'defense'],
    tank: ['hp', 'defense'],
    fast_attacker: ['speed', 'attack'],
    mixed_attacker: ['attack', 'special-attack'],
}

export function recommendNatures(role: string, statMap: Record<string, number>): ScoredNature[] {
    const wantBoost = ROLE_BOOST_MAP[role] ?? ['attack']
    const keyStats = [...wantBoost, 'hp', 'defense', 'special-defense']

    return Object.entries(NATURES)
        .map(([name, [plus, minus]]) => {
            let score = 0
            const isNeutral = !plus
            if (!isNeutral) {
                if (wantBoost.includes(plus!)) score += 3
                if (wantBoost[0] === plus) score += 2
                if (minus && keyStats.includes(minus) && (statMap[minus] ?? 0) >= 80) score -= 3
            }
            return { name, plus, minus, score, isNeutral, flavor: NATURE_FLAVOR[name] ?? '' }
        })
        .sort((a, b) => b.score - a.score)
}
