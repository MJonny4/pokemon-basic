import { describe, expect, test } from 'bun:test'
import type { TeamSlot } from '../../../../src/alpine/stores/team'
import { GUIDE_REGISTRY } from '../../../../src/lib/data/guides/registry'
import { buildRedBlueOpponentManifest } from '../../../../src/lib/data/guides/red-blue/opponents'
import { compareGen1Team } from '../../../../src/lib/logic/gen1-matchup'

const data = buildRedBlueOpponentManifest(GUIDE_REGISTRY[0])
const brock = data.opponents.find((opponent) => opponent.id === 'gym-1-pewter:pewter-brock')!
function slot(id: number, name: string, moves: TeamSlot['moves']): TeamSlot {
    return {
        pokemonId: id, pokemonName: name, moves, types: ['fairy'], stats: { speed: 1 },
        nature: 'Jolly', item: 'Life Orb', ability: 'levitate', teraType: 'Fairy', level: 50,
        evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 252 },
        ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }, role: null,
    }
}

describe('pinned Red/Blue opponent projection and Gen I type matchup', () => {
    test('projects source-checked major parties and period types without source metadata', () => {
        expect(data.opponents).toHaveLength(20)
        expect(data.opponents.filter((opponent) => opponent.party)).toHaveLength(14)
        expect(data.opponents.filter((opponent) => opponent.variants)).toHaveLength(6)
        expect(brock.party?.map((member) => [member.name, member.level])).toEqual([['Geodude', 12], ['Onix', 14]])
        expect(data.species[35].types).toEqual(['normal']) // Clefairy was not Fairy in Gen I.
        expect(data.typeChart.ghost.psychic).toBe(0) // Original Red/Blue bug.
        expect(data.typeChart.electric.ground).toBe(0)
        expect(JSON.stringify(data)).not.toContain('sourceIds')
    })

    test('uses selected Gen I moves against actual opponent types and excludes modern entries', () => {
        const bulbasaur = slot(1, 'bulbasaur', ['vine-whip', null, null, null])
        const pikachu = slot(25, 'pikachu', ['thunder-shock', 'volt-tackle', null, null])
        const modern = slot(445, 'garchomp', ['earthquake', null, null, null])
        const rows = compareGen1Team([bulbasaur, pikachu, modern], brock.party!, data)
        expect(rows.map((row) => row.types)).toEqual([['rock', 'ground'], ['rock', 'ground']])
        for (const row of rows) {
            expect(row.choices[0]).toMatchObject({ moveName: 'Vine Whip', multiplier: 4 })
            expect(row.choices[1]).toMatchObject({ moveName: 'Thunder Shock', multiplier: 0, ignoredMoves: 1 })
            expect(row.choices[2]).toMatchObject({ moveName: null, multiplier: null, reason: 'Species unavailable in Red/Blue.' })
        }
        const abra = { id: 'slot-1', name: 'Abra', dexId: 63, level: 15 }
        expect(compareGen1Team([slot(92, 'gastly', ['lick', null, null, null])], [abra], data)[0].choices[0].multiplier).toBe(0)
    })
})
