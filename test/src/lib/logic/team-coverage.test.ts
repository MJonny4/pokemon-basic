import { describe, expect, test } from 'bun:test'
import type { TeamSlot } from '../../../../src/alpine/stores/team'
import { analyzeTeam } from '../../../../src/lib/logic/team-coverage'

function slot(name: string, types: string[], speed: number, moves: TeamSlot['moves']): TeamSlot {
    return {
        pokemonName: name, pokemonId: 1, types, stats: { speed }, nature: null, item: null,
        moves, role: null, level: 50, ability: null, teraType: null,
        evs: { speed: 0 }, ivs: { speed: 31 },
    }
}

describe('Team Lab selected-move and set-Speed analysis', () => {
    test('uses selected damaging moves, not native types or status moves, for modern type coverage', () => {
        const charizard = slot('charizard', ['fire', 'flying'], 100, ['flamethrower', 'splash', null, null])
        const first = analyzeTeam([charizard])
        expect(first.damagingMoveCount).toBe(1)
        expect(first.offensiveCoverage).toContain('grass')
        expect(first.offensiveCoverage).not.toContain('fighting')
        expect(first.offensiveCoverage).not.toContain('water')
        charizard.moves[2] = 'wing-attack'
        const second = analyzeTeam([charizard])
        expect(second.offensiveCoverage).toContain('fighting')
        expect(second.damagingMoveCount).toBe(2)
        charizard.moves[3] = 'unknown-saved-move'
        expect(analyzeTeam([charizard]).unresolvedMoves).toEqual(['unknown-saved-move'])
    })

    test('reports calculated set Speed and counts a fourfold weakness as one member', () => {
        const garchomp = slot('garchomp', ['dragon', 'ground'], 102, [null, null, null, null])
        garchomp.nature = 'Jolly'
        garchomp.evs.speed = 252
        const charizard = slot('charizard', ['fire', 'flying'], 100, [null, null, null, null])
        const result = analyzeTeam([charizard, garchomp])
        expect(result.speedRows.map((row) => [row.pokemonName, row.speed])).toEqual([
            ['garchomp', 169], ['charizard', 120],
        ])
        expect(result.teamWeaknesses.Ice).toBe(1)
        expect(result.commonWeaknesses).not.toContain('Ice')
        const rotom = slot('rotom', ['electric', 'ghost'], 91, [null, null, null, null])
        expect(analyzeTeam([rotom]).teamWeaknesses.Ground).toBe(1)
        rotom.ability = 'levitate'
        expect(analyzeTeam([rotom]).teamWeaknesses.Ground).toBeUndefined()
    })
})
