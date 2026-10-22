import { calculate, Field, Generations, Move, Pokemon, toID } from '@smogon/calc'
import type { TeamSlot } from '../../alpine/stores/team'
import { getTypeEffectiveness } from './damage-calc'

const gen = Generations.get(9)

export interface Gen9Defender {
    name: string
    level: number
    defenseEv: number
    specialDefenseEv: number
    defenseIv: number
}

export interface Gen9Field {
    weather: 'sun' | 'rain' | 'sand' | 'snow' | null
    reflect: boolean
    lightScreen: boolean
    critical: boolean
}

export interface Gen9PanelResult {
    min: number
    max: number
    minPct: number
    maxPct: number
    effectiveness: number
    koChance: string
}

export type Gen9DamageOutcome = { ok: true; result: Gen9PanelResult } | { ok: false; reason: string }

const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const
const calcStatKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const

function statValues(values: Record<string, number>, min: number, max: number): Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number> | null {
    const output = {} as Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>
    for (let i = 0; i < statKeys.length; i++) {
        const value = values[statKeys[i]]
        if (!Number.isInteger(value) || value < min || value > max) return null
        output[calcStatKeys[i]] = value
    }
    return output
}

const validLevel = (level: number) => Number.isInteger(level) && level >= 1 && level <= 100

/** Gen 9 singles, one selected attack, full HP, neutral inactive defender ability. */
export function calculateGen9PanelDamage(slot: TeamSlot, defender: Gen9Defender, moveName: string, field: Gen9Field): Gen9DamageOutcome {
    if (!validLevel(slot.level) || !validLevel(defender.level)) return { ok: false, reason: 'Check both levels (1–100).' }
    const evs = statValues(slot.evs, 0, 252)
    const ivs = statValues(slot.ivs, 0, 31)
    if (!evs || !ivs || Object.values(evs).reduce((sum, value) => sum + value, 0) > 508 ||
        !Number.isInteger(defender.defenseEv) || defender.defenseEv < 0 || defender.defenseEv > 252 ||
        !Number.isInteger(defender.specialDefenseEv) || defender.specialDefenseEv < 0 || defender.specialDefenseEv > 252 ||
        !Number.isInteger(defender.defenseIv) || defender.defenseIv < 0 || defender.defenseIv > 31) {
        return { ok: false, reason: 'Check EVs and IVs.' }
    }

    const attackerSpecies = gen.species.get(toID(slot.pokemonName))
    const defenderSpecies = gen.species.get(toID(defender.name))
    if (!attackerSpecies || !defenderSpecies) return { ok: false, reason: 'Species unavailable in Gen 9.' }
    const moveData = gen.moves.get(toID(moveName))
    if (!moveData) return { ok: false, reason: 'Move unavailable in Gen 9.' }
    if (moveData.category === 'Status' || !moveData.basePower) return { ok: false, reason: 'No ordinary damage range for this move.' }
    if (slot.ability && !gen.abilities.get(toID(slot.ability))) return { ok: false, reason: 'Ability unavailable in Gen 9.' }
    if (slot.item && !gen.items.get(toID(slot.item))) return { ok: false, reason: 'Item unavailable in Gen 9.' }
    if (slot.nature && !gen.natures.get(toID(slot.nature))) return { ok: false, reason: 'Nature unavailable in Gen 9.' }

    try {
        const attacker = new Pokemon(gen, slot.pokemonName, {
            level: slot.level, ability: slot.ability ?? 'No Ability', item: slot.item ?? undefined,
            nature: slot.nature ?? 'Serious', evs, ivs,
        })
        const target = new Pokemon(gen, defender.name, {
            level: defender.level, ability: 'No Ability', nature: 'Serious',
            evs: { hp: 0, def: defender.defenseEv, spd: defender.specialDefenseEv },
            ivs: { hp: 31, def: defender.defenseIv, spd: defender.defenseIv },
        })
        const move = new Move(gen, moveName, { isCrit: field.critical })
        const weather = { sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow' } as const
        const calcField = new Field({
            gameType: 'Singles', weather: field.weather ? weather[field.weather] : undefined,
            defenderSide: { isReflect: field.reflect, isLightScreen: field.lightScreen },
        })
        const result = calculate(gen, attacker, target, move, calcField)
        const [min, max] = result.range()
        const maxHp = result.defender.maxHP()
        const effectiveness = getTypeEffectiveness(result.move.type, result.defender.types)
        return { ok: true, result: {
            min, max,
            minPct: Math.round(min / maxHp * 1000) / 10,
            maxPct: Math.round(max / maxHp * 1000) / 10,
            effectiveness,
            koChance: result.kochance().text || '—',
        } }
    } catch {
        return { ok: false, reason: 'This set or move cannot be calculated in Gen 9.' }
    }
}
