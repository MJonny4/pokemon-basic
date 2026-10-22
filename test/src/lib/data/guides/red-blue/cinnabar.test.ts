import { describe, expect, test } from 'bun:test'
import { CINNABAR_STORY_LOCATION as cinnabar } from '../../../../../../src/lib/data/guides/red-blue/cinnabar'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue Cinnabar story route', () => {
    test('validates pinned evidence and preserves every saved stop identity', () => {
        expect(guideLocationSchema.safeParse(cinnabar).success).toBeTrue()
        expect(cinnabar.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'gym-7-cinnabar')!
        expect(stop).toMatchObject({ locationPilot: true, steps: cinnabar.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('routes through the two distinct 3F holes to the basement key, then the gym', () => {
        const steps = cinnabar.directions.map((step) => step.text).join(' ')
        expect(steps).toContain('Route 21')
        expect(steps).toContain('Soul Badge')
        expect(steps).toContain('small right-hand hole drops to 2F')
        expect(steps).toContain('left-hand holes on 3F')
        expect(steps).toContain('southern part of 1F')
        expect(steps.indexOf('Secret Key item ball')).toBeLessThan(steps.indexOf('enter the Gym'))
        expect(cinnabar.items.map((item) => [item.name, item.kind])).toEqual([
            ['Secret Key', 'visible'], ['Volcano Badge', 'reward'], ['TM38 Fire Blast', 'reward'],
        ])
        expect(cinnabar.items.every((item) => Boolean(guideItemVisual(item).spriteUrl) || guideItemVisual(item).symbol === 'badge')).toBeTrue()
        expect(cinnabar.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([[58,42,[]],[77,40,[]],[78,42,[]],[59,47,[]]])
        expect(cinnabar.warnings.find((warning) => warning.id === 'cinnabar-missable-trainers')?.text).toContain('seven ordinary trainers')
        expect(cinnabar.directions.find((step) => step.id === 'cinnabar-rewards')?.text).toContain('speak to him again')
        expect(cinnabar.encounters).toEqual([])
        expect(cinnabar.encountersHeading).toBe('Wild Pokémon — Mansion encounters not audited')
        expect(cinnabar.encountersNote).toContain('does not mean there are no wild Pokémon')
    })
})
