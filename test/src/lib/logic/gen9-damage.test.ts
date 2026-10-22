import { describe, expect, test } from 'bun:test'
import type { TeamSlot } from '../../../../src/alpine/stores/team'
import { calculateGen9PanelDamage, type Gen9Defender, type Gen9Field } from '../../../../src/lib/logic/gen9-damage'

const slot = {
    pokemonName: 'bulbasaur', pokemonId: 1, types: ['grass', 'poison'],
    stats: { hp: 45, attack: 49, defense: 49, 'special-attack': 65, 'special-defense': 65, speed: 45 },
    nature: null, item: null, ability: null, teraType: null, role: null, level: 50,
    moves: ['tackle', null, null, null],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
} satisfies TeamSlot
const defender: Gen9Defender = { name: 'charmander', level: 50, defenseEv: 0, specialDefenseEv: 0, defenseIv: 31 }
const field: Gen9Field = { weather: null, reflect: false, lightScreen: false, critical: false }

describe('scoped Gen 9 singles damage adapter', () => {
    test('matches an independently worked neutral Tackle range and Reflect change', () => {
        // Lv50 Bulbasaur: Attack 69. Lv50 Charmander: Defense 63, HP 114.
        // Base damage floor(floor(22×40×69/63)/50)+2 = 21; 85–100% is 17–21.
        const plain = calculateGen9PanelDamage(slot, defender, 'tackle', field)
        expect(plain).toMatchObject({ ok: true, result: { min: 17, max: 21, minPct: 14.9, maxPct: 18.4, effectiveness: 1 } })
        expect(calculateGen9PanelDamage(slot, defender, 'tackle', { ...field, reflect: true }))
            .toMatchObject({ ok: true, result: { min: 8, max: 10 } })
    })

    test('does not invent a range for unknown, status or invalid inputs', () => {
        expect(calculateGen9PanelDamage(slot, defender, 'unknown-move', field)).toMatchObject({ ok: false, reason: 'Move unavailable in Gen 9.' })
        expect(calculateGen9PanelDamage(slot, defender, 'growl', field)).toMatchObject({ ok: false, reason: 'No ordinary damage range for this move.' })
        expect(calculateGen9PanelDamage(slot, { ...defender, name: 'unknown-species' }, 'tackle', field)).toMatchObject({ ok: false, reason: 'Species unavailable in Gen 9.' })
        expect(calculateGen9PanelDamage({ ...slot, evs: { ...slot.evs, attack: 260 } }, defender, 'tackle', field)).toMatchObject({ ok: false, reason: 'Check EVs and IVs.' })
    })
})
