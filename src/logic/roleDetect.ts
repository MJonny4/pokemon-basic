export type RoleKey =
    | 'physical_sweeper'
    | 'special_sweeper'
    | 'physical_attacker'
    | 'special_attacker'
    | 'physical_wall'
    | 'special_wall'
    | 'tank'
    | 'fast_attacker'
    | 'mixed_attacker'

export interface RoleResult {
    key: RoleKey
    label: string
    description: string
}

const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
    physical_sweeper: 'High Attack and Speed make this a textbook physical sweeper. Hit hard before taking damage.',
    special_sweeper: 'High Sp.Atk and Speed — goes first and nukes with special moves.',
    physical_attacker: 'Powerful physical attacker. Works as a wallbreaker or in Trick Room.',
    special_attacker: 'Strong special attacker. Aims to break walls with powerful Sp.Atk moves.',
    physical_wall: 'High Defense and HP — a physical sponge. Pivot into physical threats repeatedly.',
    special_wall: 'Excellent Sp.Def — eats special hits and recovers. Strong against special sweepers.',
    tank: 'Well-rounded bulk with decent offense. Can take a hit and hit back.',
    fast_attacker: 'High Speed but moderate attack. Good lead or revenge killer.',
    mixed_attacker: 'Balanced offensive profile. Can run mixed sets to break both wall types.',
}

export function detectRole(stats: Record<string, number>): RoleResult {
    const {
        attack: atk = 0,
        'special-attack': spa = 0,
        defense: def = 0,
        'special-defense': spd_stat = 0,
        speed: spd = 0,
        hp = 0,
    } = stats
    const bulkAvg = (hp + def + spd_stat) / 3

    let key: RoleKey
    // FIXED: Lower thresholds for Charizard (100 Spe, 109 SpA) - same changes as JS version
    if (spd >= 95 && atk >= 95 && atk > spa) key = 'physical_sweeper'
    else if (spd >= 95 && spa >= 100 && spa >= atk)
        key = 'special_sweeper' // Charizard: 100>=95, 109>=100, 109>84 ✅
    else if (atk >= 100 && atk > spa && spd < 95) key = 'physical_attacker'
    else if (spa >= 100 && spa > atk && spd < 95) key = 'special_attacker'
    else if (bulkAvg >= 100 && def >= spd_stat)
        key = 'physical_wall' // Raised from 90→100
    else if (bulkAvg >= 100 && spd_stat > def)
        key = 'special_wall' // Charizard 80.3 excluded
    else if (bulkAvg >= 85 && (atk + spa) / 2 >= 85)
        key = 'tank' // Raised from 80→85
    else if (spd >= 95)
        key = 'fast_attacker' // Matches sweeper threshold
    else key = 'mixed_attacker'

    const LABELS: Record<RoleKey, string> = {
        physical_sweeper: '⚡ Physical Sweeper',
        special_sweeper: '⚡ Special Sweeper',
        physical_attacker: '💥 Physical Attacker',
        special_attacker: '✨ Special Attacker',
        physical_wall: '🧱 Physical Wall',
        special_wall: '🔮 Special Wall',
        tank: '🛡️ Tank',
        fast_attacker: '💨 Fast Attacker',
        mixed_attacker: '⚔️ All-rounder',
    }

    return { key, label: LABELS[key], description: ROLE_DESCRIPTIONS[key] }
}
