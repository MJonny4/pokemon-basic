import { NATURES } from '../data/natures'

// Gen 9 stat formula (verified vs Garchomp @ Lv50/252/31)
// HP:    ⌊(2×base + IV + ⌊EV/4⌋) × Lv/100⌋ + Lv + 10
// Other: ⌊(⌊(2×base + IV + ⌊EV/4⌋) × Lv/100⌋ + 5) × natureMult⌋
export function calcStat(
    key: string,
    base: number,
    iv: number,
    ev: number,
    level: number,
    nature: string | null,
): number {
    const inner = 2 * base + iv + Math.floor(ev / 4)
    if (key === 'hp') return Math.floor((inner * level) / 100) + level + 10
    const raw = Math.floor((inner * level) / 100) + 5
    let mult = 1.0
    if (nature) {
        const entry = NATURES[nature]
        if (entry?.[0] === key) mult = 1.1
        else if (entry?.[1] === key) mult = 0.9
    }
    return Math.floor(raw * mult)
}
