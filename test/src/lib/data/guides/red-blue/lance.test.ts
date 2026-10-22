import { describe, expect, test } from 'bun:test'
import { LANCE_STORY_LOCATION as lance } from '../../../../../../src/lib/data/guides/red-blue/lance'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Lance story battle', () => {
    test('validates pinned evidence and preserves the published stop', () => {
        expect(guideLocationSchema.safeParse(lance).success).toBeTrue()
        expect(lance.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        const stop = projected.stops.find((entry) => entry.id === 'elite-four-lance')!
        expect(stop).toMatchObject({ locationPilot: true, steps: lance.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('keeps the entrance sequence and Champion handoff accurate', () => {
        const directions = lance.directions.map((step) => step.text).join(' ')
        expect(directions).toContain('eastern staircase')
        expect(directions).toContain('entrance closes as you approach Lance')
        expect(directions).toContain('rival beat the Elite Four first')
        expect(directions).not.toContain('north door unlocks')
        expect(lance.warnings.map((warning) => warning.id)).toEqual(['lance-no-return', 'lance-final-battle'])
    })

    test('shows the exact five members, Barrier only on Dragonite and relevant matchups', () => {
        expect(lance.trainers).toHaveLength(1)
        expect(lance.trainers[0].party.map(({ dexId, level, moves }) => [dexId, level, moves])).toEqual([
            [130, 58, ['Dragon Rage', 'Leer', 'Hydro Pump', 'Hyper Beam']],
            [148, 56, ['Agility', 'Slam', 'Dragon Rage', 'Hyper Beam']],
            [148, 56, ['Agility', 'Slam', 'Dragon Rage', 'Hyper Beam']],
            [142, 60, ['Supersonic', 'Bite', 'Take Down', 'Hyper Beam']],
            [149, 62, ['Agility', 'Slam', 'Barrier', 'Hyper Beam']],
        ])
        expect(lance.advice.find((entry) => entry.id === 'lance-ice')?.text).toContain('4× effective against Dragonite')
        expect(lance.advice.find((entry) => entry.id === 'lance-other-matchups')?.text).toContain('4× effective against Gyarados')
        expect(lance.encounters).toEqual([])
    })
})
