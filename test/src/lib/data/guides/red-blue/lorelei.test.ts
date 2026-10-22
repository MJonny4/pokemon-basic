import { describe, expect, test } from 'bun:test'
import { LORELEI_STORY_LOCATION as lorelei } from '../../../../../../src/lib/data/guides/red-blue/lorelei'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Lorelei story battle', () => {
    test('validates pinned evidence and preserves the published stop identities', () => {
        expect(guideLocationSchema.safeParse(lorelei).success).toBeTrue()
        expect(lorelei.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'elite-four-lorelei')!
        expect(stop).toMatchObject({ locationPilot: true, steps: lorelei.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('uses the lobby healer and shop before the locked League sequence', () => {
        const steps = lorelei.directions.map((step) => step.text).join(' ')
        expect(steps).toContain('Heal with the lobby nurse')
        expect(steps).toContain('Full Restores, Max Potions, Full Heals and Revives')
        expect(steps).toContain('cannot leave by the south exit')
        expect(steps).toContain('resets the challenge')
        expect(steps).toContain('north door opens to Bruno’s room')
        expect(lorelei.warnings.map((warning) => warning.id)).toEqual(['lorelei-no-return', 'lorelei-reset'])
    })

    test('shows Lorelei as an Elite Four battle with exact Red/Blue levels and moves', () => {
        expect(lorelei.trainers).toHaveLength(1)
        expect(lorelei.trainers[0].role).toBe('boss')
        expect(lorelei.trainers[0].party.map(({ dexId, level, moves }) => [dexId, level, moves])).toEqual([
            [87, 54, ['Growl', 'Aurora Beam', 'Rest', 'Take Down']],
            [91, 53, ['Supersonic', 'Clamp', 'Aurora Beam', 'Spike Cannon']],
            [80, 54, ['Growl', 'Water Gun', 'Withdraw', 'Amnesia']],
            [124, 56, ['DoubleSlap', 'Ice Punch', 'Body Slam', 'Thrash']],
            [131, 56, ['Body Slam', 'Confuse Ray', 'Blizzard', 'Hydro Pump']],
        ])
        expect(lorelei.advice.find((entry) => entry.id === 'lorelei-water-matchups')?.text).toContain('four are Water type')
        expect(lorelei.advice.find((entry) => entry.id === 'lorelei-jynx')?.text).toContain('rather than a Lovely Kiss sleep move')
        expect(lorelei.encounters).toEqual([])
    })
})
