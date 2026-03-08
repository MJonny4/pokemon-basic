import { calcStat } from './statCalc'
import { TYPES, EFFECTIVENESS } from '../data/constants'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AttackerState {
    level: number
    baseStat: number            // base Attack or Sp.Atk
    iv: number                  // 0–31
    ev: number                  // 0–252
    nature: string | null
    statKey: 'attack' | 'special-attack'
    types: string[]             // lowercase
    item: string | null
    isBurned: boolean
    adaptability?: boolean      // Adaptability ability → STAB ×2 instead of ×1.5
    overrideStat?: number       // if set, skip calcStat and use this value directly
}

export interface DefenderState {
    level: number
    baseDef: number             // base Defense or Sp.Defense
    iv: number
    ev: number
    nature: string | null
    defKey: 'defense' | 'special-defense'
    types: string[]             // lowercase
    item: string | null
    baseHp: number              // base HP stat (used to compute max HP for KO%)
    hpIv?: number               // defaults to 31
    hpEv?: number               // defaults to 0
    overrideDef?: number        // if set, skip calcStat and use this value directly
}

export interface MoveInfo {
    name: string
    type: string                // lowercase
    category: 'physical' | 'special' | 'status'
    power: number | null
}

export interface FieldState {
    weather: 'sun' | 'rain' | 'sand' | 'snow' | null
    reflect: boolean            // physical screen
    lightScreen: boolean        // special screen
    isCrit: boolean
}

export interface DamageResult {
    rolls: number[]             // 16 values (85%–100% modifier)
    min: number
    max: number
    defenderMaxHp: number
    minPct: number
    maxPct: number
    koChance: string            // "guaranteed OHKO" | "X/16 chance OHKO" | "guaranteed 2HKO" | …
    effectiveness: number       // 0 | 0.25 | 0.5 | 1 | 2 | 4
}

// ── Type boost items (item name → move type it boosts) ────────────────────────

const TYPE_BOOST_ITEMS: Record<string, string> = {
    'Charcoal': 'fire',
    'Mystic Water': 'water',
    'Magnet': 'electric',
    'Miracle Seed': 'grass',
    'Never-Melt Ice': 'ice',
    'Black Belt': 'fighting',
    'Poison Barb': 'poison',
    'Soft Sand': 'ground',
    'Sharp Beak': 'flying',
    'Twisted Spoon': 'psychic',
    'Silver Powder': 'bug',
    'Hard Stone': 'rock',
    'Spell Tag': 'ghost',
    'Dragon Fang': 'dragon',
    'Black Glasses': 'dark',
    'Metal Coat': 'steel',
    'Fairy Feather': 'fairy',
    'Sea Incense': 'water',
    'Lax Incense': 'normal',
    'Odd Incense': 'psychic',
    'Rock Incense': 'rock',
    'Rose Incense': 'grass',
    'Wave Incense': 'water',
    'Silk Scarf': 'normal',
    'Draco Plate': 'dragon',
    'Dread Plate': 'dark',
    'Earth Plate': 'ground',
    'Fist Plate': 'fighting',
    'Flame Plate': 'fire',
    'Icicle Plate': 'ice',
    'Insect Plate': 'bug',
    'Iron Plate': 'steel',
    'Meadow Plate': 'grass',
    'Mind Plate': 'psychic',
    'Pixie Plate': 'fairy',
    'Sky Plate': 'flying',
    'Splash Plate': 'water',
    'Spooky Plate': 'ghost',
    'Stone Plate': 'rock',
    'Toxic Plate': 'poison',
    'Zap Plate': 'electric',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capitalize first letter (to match EFFECTIVENESS keys). */
function cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Look up multiplied type effectiveness for a move type vs defender types. */
export function getTypeEffectiveness(moveType: string, defTypes: string[]): number {
    const attackerCap = cap(moveType)
    const row = EFFECTIVENESS[attackerCap]
    if (!row) return 1

    let mult = 1
    for (const dt of defTypes) {
        const idx = TYPES.indexOf(cap(dt))
        if (idx >= 0) mult *= row[idx]
    }
    return mult
}

/** Compute the attacker's effective Attack/SpAtk including item modifiers. */
export function getAttackerStat(atk: AttackerState, moveType: string): number {
    const base = atk.overrideStat ?? calcStat(atk.statKey, atk.baseStat, atk.iv, atk.ev, atk.level, atk.nature)

    // Choice Band (physical) or Choice Specs (special) → ×3/2
    let stat = base
    if (atk.item === 'Choice Band' && atk.statKey === 'attack') {
        stat = Math.floor(stat * 3 / 2)
    } else if (atk.item === 'Choice Specs' && atk.statKey === 'special-attack') {
        stat = Math.floor(stat * 3 / 2)
    }

    // Type-boost item → ×6/5
    const boostType = atk.item ? TYPE_BOOST_ITEMS[atk.item] : null
    if (boostType && boostType === moveType.toLowerCase()) {
        stat = Math.floor(stat * 6 / 5)
    }

    return stat
}

/** Compute the defender's effective Def/SpDef including item modifiers. */
export function getDefenderStat(def: DefenderState): number {
    const base = def.overrideDef ?? calcStat(def.defKey, def.baseDef, def.iv, def.ev, def.level, def.nature)

    let stat = base
    // Eviolite → ×3/2 on Def and SpD
    if (def.item === 'Eviolite') stat = Math.floor(stat * 3 / 2)
    // Assault Vest → ×3/2 on SpD only
    if (def.item === 'Assault Vest' && def.defKey === 'special-defense') {
        stat = Math.floor(stat * 3 / 2)
    }

    return stat
}

/** Format KO chance string from rolls vs defender max HP. */
export function formatKoChance(rolls: number[], maxHp: number): string {
    const ohko = rolls.filter(r => r >= maxHp).length
    if (ohko === 16) return 'guaranteed OHKO'
    if (ohko > 0) return `${ohko}/16 chance OHKO`

    const twoHko = rolls.filter(r => r * 2 >= maxHp).length
    if (twoHko === 16) return 'guaranteed 2HKO'
    if (twoHko > 0) return `${twoHko}/16 chance 2HKO`

    const threeHko = rolls.filter(r => r * 3 >= maxHp).length
    if (threeHko === 16) return 'guaranteed 3HKO'
    if (threeHko > 0) return `${threeHko}/16 chance 3HKO`

    const fourHko = rolls.filter(r => r * 4 >= maxHp).length
    if (fourHko === 16) return 'guaranteed 4HKO'

    return 'low damage'
}

// ── Main damage function ───────────────────────────────────────────────────────

/**
 * Calculate damage range (16 rolls) using the Gen 9 formula.
 * Returns null if the move is a status move (power === null or 0).
 */
export function calcDamageRange(
    move: MoveInfo,
    attacker: AttackerState,
    defender: DefenderState,
    field: FieldState,
): DamageResult | null {
    if (!move.power) return null

    const category = move.category
    if (category === 'status') return null

    const A = getAttackerStat(attacker, move.type)
    const D = getDefenderStat(defender)

    // Base damage: ⌊(⌊(2×Lv/5+2) × BP × A/D⌋ / 50) + 2⌋
    const lvFactor = Math.floor(2 * attacker.level / 5 + 2)
    let dmg = Math.floor(Math.floor(lvFactor * move.power * A / D) / 50) + 2

    // 1. Weather modifier
    const mt = move.type.toLowerCase()
    if (field.weather === 'sun') {
        if (mt === 'fire') dmg = Math.floor(dmg * 3 / 2)
        else if (mt === 'water') dmg = Math.floor(dmg * 1 / 2)
    } else if (field.weather === 'rain') {
        if (mt === 'water') dmg = Math.floor(dmg * 3 / 2)
        else if (mt === 'fire') dmg = Math.floor(dmg * 1 / 2)
    }

    // 2. Crit: ×3/2
    if (field.isCrit) dmg = Math.floor(dmg * 3 / 2)

    // 3. Random rolls: 85..100 → 16 values
    const rolls: number[] = []
    for (let r = 85; r <= 100; r++) {
        rolls.push(Math.floor(dmg * r / 100))
    }

    // 4. STAB
    const stabMult = attacker.types.map(t => t.toLowerCase()).includes(mt)
        ? (attacker.adaptability ? 2 : 1.5)
        : 1
    if (stabMult !== 1) {
        for (let i = 0; i < rolls.length; i++) {
            rolls[i] = Math.floor(rolls[i] * (attacker.adaptability ? 2 : 3) / (attacker.adaptability ? 1 : 2))
        }
    }

    // 5. Type effectiveness
    const effectiveness = getTypeEffectiveness(move.type, defender.types)
    if (effectiveness === 0) {
        // immune — return zeroed result
        const defMaxHp = calcStat('hp', defender.baseHp, defender.hpIv ?? 31, defender.hpEv ?? 0, defender.level, defender.nature)
        return {
            rolls: Array(16).fill(0), min: 0, max: 0,
            defenderMaxHp: defMaxHp, minPct: 0, maxPct: 0,
            koChance: 'no effect (immune)', effectiveness: 0,
        }
    }
    // Apply as numerator/denominator pairs to stay integer-ish
    // effectiveness is always a power of 2 (0.25, 0.5, 1, 2, 4)
    if (effectiveness !== 1) {
        // Multiply by effectiveness using fraction to avoid float drift
        const [num, den] = effectiveness > 1
            ? [effectiveness, 1]
            : [1, Math.round(1 / effectiveness)]
        for (let i = 0; i < rolls.length; i++) {
            rolls[i] = Math.floor(rolls[i] * num / den)
        }
    }

    // 6. Burn (physical only, no Guts)
    if (attacker.isBurned && category === 'physical') {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] / 2)
    }

    // 7. Screens
    if (field.reflect && category === 'physical') {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] / 2)
    }
    if (field.lightScreen && category === 'special') {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] / 2)
    }

    // 8. Item damage mods
    if (attacker.item === 'Life Orb') {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] * 13 / 10)
    } else if (attacker.item === 'Expert Belt' && effectiveness > 1) {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] * 6 / 5)
    } else if (
        (attacker.item === 'Muscle Band' && category === 'physical') ||
        (attacker.item === 'Wise Glasses' && category === 'special')
    ) {
        for (let i = 0; i < rolls.length; i++) rolls[i] = Math.floor(rolls[i] * 11 / 10)
    }

    const min = rolls[0]
    const max = rolls[rolls.length - 1]
    const defMaxHp = calcStat('hp', defender.baseHp, defender.hpIv ?? 31, defender.hpEv ?? 0, defender.level, defender.nature)
    const minPct = Math.round(min / defMaxHp * 1000) / 10
    const maxPct = Math.round(max / defMaxHp * 1000) / 10

    return {
        rolls,
        min,
        max,
        defenderMaxHp: defMaxHp,
        minPct,
        maxPct,
        koChance: formatKoChance(rolls, defMaxHp),
        effectiveness,
    }
}
