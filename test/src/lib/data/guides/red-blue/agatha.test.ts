import { describe, expect, test } from 'bun:test'
import { AGATHA_STORY_LOCATION as agatha } from '../../../../../../src/lib/data/guides/red-blue/agatha'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Agatha story battle', () => {
    test('validates pinned evidence and preserves all published stop identities', () => {
        expect(guideLocationSchema.safeParse(agatha).success).toBeTrue()
        expect(agatha.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'elite-four-agatha')!
        expect(stop).toMatchObject({ locationPilot: true, steps: agatha.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('keeps the locked room, status warning and Lance handoff in sequence', () => {
        const steps = agatha.directions.map((step) => step.text).join(' ')
        expect(steps).toContain('After Bruno, heal with the items you carried')
        expect(steps).toContain('cannot return through its south exit')
        expect(steps).toContain('Golbat Lv. 56')
        expect(steps).toContain('north door opens into Lance’s room')
        expect(agatha.warnings.map((warning) => warning.id)).toEqual(['agatha-no-return', 'agatha-status-care'])
        expect(agatha.warnings[1].text).toContain('Full Heal does not clear it')
    })

    test('shows the exact five members and Toxic on only the final Gengar', () => {
        expect(agatha.trainers).toHaveLength(1)
        expect(agatha.trainers[0].role).toBe('boss')
        expect(agatha.trainers[0].party.map(({ dexId, level, moves }) => [dexId, level, moves])).toEqual([
            [94, 56, ['Confuse Ray', 'Night Shade', 'Hypnosis', 'Dream Eater']],
            [42, 56, ['Supersonic', 'Confuse Ray', 'Wing Attack', 'Haze']],
            [93, 55, ['Confuse Ray', 'Night Shade', 'Hypnosis', 'Dream Eater']],
            [24, 58, ['Bite', 'Glare', 'Screech', 'Acid']],
            [94, 60, ['Confuse Ray', 'Night Shade', 'Toxic', 'Dream Eater']],
        ])
        expect(agatha.advice.find((entry) => entry.id === 'agatha-psychic')?.text).toContain('all five')
        expect(agatha.advice.find((entry) => entry.id === 'agatha-ground')?.text).toContain('no effect on Flying-type Golbat')
        expect(agatha.encounters).toEqual([])
    })
})
