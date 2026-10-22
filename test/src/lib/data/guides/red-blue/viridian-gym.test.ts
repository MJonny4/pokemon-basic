import { describe, expect, test } from 'bun:test'
import { VIRIDIAN_GYM_STORY_LOCATION as viridian } from '../../../../../../src/lib/data/guides/red-blue/viridian-gym'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue Viridian Gym story route', () => {
    test('validates pinned evidence and preserves all saved stop identities', () => {
        expect(guideLocationSchema.safeParse(viridian).success).toBeTrue()
        expect(viridian.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'gym-8-viridian')!
        expect(stop).toMatchObject({ locationPilot: true, steps: viridian.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('uses the seven-badge arrow route and exact final party and rewards', () => {
        const steps = viridian.directions.map((step) => step.text).join(' ')
        expect(steps).toContain('seven badges')
        expect(steps).toContain('no Strength-boulder switch puzzle')
        expect(steps).toContain('Hiker on the north wall from below')
        expect(steps).toContain('right/east side')
        expect(steps).toContain('upper-right corner carries you west')
        expect(steps.indexOf('all eight ordinary trainers')).toBeLessThan(steps.indexOf('Giovanni uses'))
        expect(viridian.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([[111,45,[]],[51,42,[]],[31,44,[]],[34,45,[]],[112,50,[]]])
        expect(viridian.items.map((item) => [item.name, item.kind])).toEqual([['Earth Badge', 'reward'], ['TM27 Fissure', 'reward']])
        expect(viridian.items.every((item) => Boolean(guideItemVisual(item).spriteUrl) || guideItemVisual(item).symbol === 'badge')).toBeTrue()
        expect(viridian.warnings.find((warning) => warning.id === 'viridian-missable-trainers')?.text).toContain('eight ordinary trainers')
        expect(viridian.directions.find((step) => step.id === 'viridian-rewards')?.text).toContain('speak to him again')
        expect(viridian.advice.find((entry) => entry.id === 'viridian-matchups')?.text).toContain('neutral against Poison/Ground Nidoqueen and Nidoking')
        expect(viridian.directions.find((step) => step.id === 'viridian-onward')?.text).toContain('second rival encounter')
        expect(viridian.encounters).toEqual([])
    })
})
