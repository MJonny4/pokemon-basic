import { describe, expect, test } from 'bun:test'
import { FUCHSIA_STORY_LOCATION as fuchsia } from '../../../../../../src/lib/data/guides/red-blue/fuchsia'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue Fuchsia story route', () => {
    test('validates pinned evidence and preserves the saved stop contract', () => {
        expect(guideLocationSchema.safeParse(fuchsia).success).toBeTrue()
        expect(fuchsia.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'gym-5-fuchsia')!
        expect(stop).toMatchObject({ locationPilot: true, steps: fuchsia.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
        expect(projected.stops.findIndex((entry) => entry.id === 'gym-5-fuchsia')).toBeLessThan(projected.stops.findIndex((entry) => entry.id === 'gym-6-saffron'))
    })

    test('connects the Safari story items, exact leader party and badge mechanics', () => {
        expect(fuchsia.directions.find((step) => step.id === 'fuchsia-safari-route')?.text).toContain('Center Area')
        expect(fuchsia.directions.find((step) => step.id === 'fuchsia-safari-route')?.text).toContain('Area 3 (West)')
        expect(fuchsia.items.map((item) => [item.name, item.kind])).toEqual([
            ['Gold Teeth', 'visible'], ['HM03 Surf', 'gift'], ['HM04 Strength', 'gift'], ['Soul Badge', 'reward'], ['TM06 Toxic', 'reward'],
        ])
        expect(fuchsia.items.every((item) => Boolean(guideItemVisual(item).spriteUrl) || guideItemVisual(item).symbol === 'badge')).toBeTrue()
        expect(fuchsia.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([[109,37,[]],[89,39,[]],[109,37,[]],[110,43,[]]])
        expect(fuchsia.directions.find((step) => step.id === 'fuchsia-warden')?.text).toContain('Rainbow Badge, not Koga’s Soul Badge')
        expect(fuchsia.directions.find((step) => step.id === 'fuchsia-rewards')?.text).toContain('speak to him again')
        expect(fuchsia.warnings[0].text).toContain('six ordinary trainers')
        expect(fuchsia.encounters).toEqual([])
        expect(fuchsia.encountersHeading).toBe('Wild Pokémon — Safari encounters not audited')
        expect(fuchsia.encountersNote).toContain('does not mean the Safari Zone has no wild Pokémon')
    })
})
