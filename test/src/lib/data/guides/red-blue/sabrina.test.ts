import { describe, expect, test } from 'bun:test'
import { SABRINA_GYM_LOCATION as sabrina } from '../../../../../../src/lib/data/guides/red-blue/sabrina'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue Sabrina gym route', () => {
    test('validates pinned evidence and preserves the saved stop contract', () => {
        expect(guideLocationSchema.safeParse(sabrina).success).toBeTrue()
        expect(sabrina.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.find((entry) => entry.id === 'gym-6-saffron')!
        expect(stop).toMatchObject({ locationPilot: true, steps: sabrina.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
        expect(projected.stops.find((entry) => entry.id === 'gym-5-fuchsia')?.locationPilot).toBeTrue()
        expect(projected.stops.findIndex((entry) => entry.id === 'gym-5-fuchsia')).toBeLessThan(projected.stops.findIndex((entry) => entry.id === 'gym-6-saffron'))
    })

    test('gives the source-checked warp route, leader party, rewards and missable warning', () => {
        expect(sabrina.directions.find((step) => step.id === 'sabrina-first-warps')?.text).toContain('southeast room, take its northwest pad')
        expect(sabrina.directions.find((step) => step.id === 'sabrina-last-warps')?.text).toContain('northeast room, take its southwest pad')
        expect(sabrina.directions.find((step) => step.id === 'sabrina-exit')?.text).toContain('northwest pad there, the northeast pad')
        expect(sabrina.trainers[0].role).toBe('leader')
        expect(sabrina.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([[64,38,[]],[122,37,[]],[49,38,[]],[65,43,[]]])
        expect(sabrina.items.map((item) => item.name)).toEqual(['Marsh Badge', 'TM46 Psywave'])
        expect(guideItemVisual(sabrina.items[0]).symbol).toBe('badge')
        expect(guideItemVisual(sabrina.items[1]).spriteUrl).toContain('tm-psychic')
        expect(sabrina.directions.find((step) => step.id === 'sabrina-rewards')?.text).toContain('speak to her again')
        expect(sabrina.warnings[0].text).toContain('seven ordinary trainers')
        expect(sabrina.advice.find((entry) => entry.id === 'sabrina-ghost-warning')?.text).toContain('Poison typing')
        expect(sabrina.encounters).toEqual([])
    })
})
