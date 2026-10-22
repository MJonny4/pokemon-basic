import { describe, expect, test } from 'bun:test'
import { BRUNO_STORY_LOCATION as bruno } from '../../../../../../src/lib/data/guides/red-blue/bruno'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Bruno story battle', () => {
    test('validates pinned evidence and preserves published stop identities', () => {
        expect(guideLocationSchema.safeParse(bruno).success).toBeTrue()
        expect(bruno.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'elite-four-bruno')!
        expect(stop).toMatchObject({ locationPilot: true, steps: bruno.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('keeps Bruno’s locked room and Agatha handoff in order', () => {
        const steps = bruno.directions.map((step) => step.text).join(' ')
        expect(steps).toContain('After Lorelei, heal with the items you carried')
        expect(steps).toContain('cannot return through its south exit')
        expect(steps).toContain('Machamp Lv. 58')
        expect(steps).toContain('north door opens into Agatha’s room')
        expect(bruno.warnings.map((warning) => warning.id)).toEqual(['bruno-no-return', 'bruno-fissure'])
    })

    test('shows both Onix and the exact special-move override on Machamp', () => {
        expect(bruno.trainers).toHaveLength(1)
        expect(bruno.trainers[0].role).toBe('boss')
        expect(bruno.trainers[0].party.map(({ dexId, level, moves }) => [dexId, level, moves])).toEqual([
            [95, 53, ['Rock Throw', 'Rage', 'Slam', 'Harden']],
            [107, 55, ['Ice Punch', 'ThunderPunch', 'Mega Punch', 'Counter']],
            [106, 55, ['Jump Kick', 'Focus Energy', 'Hi Jump Kick', 'Mega Kick']],
            [95, 56, ['Rock Throw', 'Rage', 'Slam', 'Harden']],
            [68, 58, ['Leer', 'Focus Energy', 'Fissure', 'Submission']],
        ])
        expect(bruno.advice.find((entry) => entry.id === 'bruno-onix-matchups')?.text).toContain('4× effective')
        expect(bruno.advice.find((entry) => entry.id === 'bruno-fighting-matchups')?.text).toContain('three pure Fighting Pokémon')
        expect(bruno.encounters).toEqual([])
    })
})
