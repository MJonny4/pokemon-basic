import { describe, expect, test } from 'bun:test'
import { SAFFRON_STORY_LOCATION as saffron } from '../../../../../../src/lib/data/guides/red-blue/saffron'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue Saffron story route', () => {
    test('validates pinned evidence and preserves the stop/save contract', () => {
        expect(guideLocationSchema.safeParse(saffron).success).toBeTrue()
        expect(saffron.sources.filter((source) => source.kind === 'game-disassembly').every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const registered = GUIDE_REGISTRY[0].game
        expect(registered.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(registered.stops).toHaveLength(24)
        const stop = registered.stops.find((entry) => entry.id === 'saffron-city')!
        expect(stop).toMatchObject({ locationPilot: true, steps: saffron.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
        expect(registered.stops.find((entry) => entry.id === 'gym-6-saffron')?.locationPilot).toBeTrue()
        expect(registered.stops.findIndex((entry) => entry.id === 'saffron-city')).toBeLessThan(registered.stops.findIndex((entry) => entry.id === 'gym-5-fuchsia'))
    })

    test('routes Card Key to 3F warp, 7F rival/Lapras, then 11F Giovanni and president', () => {
        expect(saffron.directions.map((step) => step.id)).toEqual(['enter-saffron', 'reach-card-key', 'return-3f', 'rival', 'lapras-and-warp', 'giovanni-and-president', 'onward'])
        expect(saffron.items.map((item) => [item.name, item.areaId, item.kind])).toEqual([
            ['Card Key', 'silph-5f', 'visible'], ['Lapras', 'silph-7f', 'gift'], ['Master Ball', 'silph-11f', 'gift'],
        ])
        expect(saffron.items.every((item) => Boolean(guideItemVisual(item).spriteUrl))).toBeTrue()
        expect(saffron.directions.find((step) => step.id === 'reach-card-key')?.text).toContain('immediately step back')
        expect(saffron.directions.find((step) => step.id === 'return-3f')?.text).toContain('central room')
        expect(saffron.directions.find((step) => step.id === 'giovanni-and-president')?.text).toContain('speak to the Silph president')
        expect(saffron.encounters).toEqual([])
    })

    test('uses all three Silph rival variants and Giovanni’s Silph party', () => {
        expect(saffron.starterBattles?.[0].variants.map((variant) => [variant.playerStarterDexId, variant.party.map((member) => [member.dexId, member.level])])).toEqual([
            [1, [[18,37],[58,38],[102,35],[65,35],[9,40]]],
            [4, [[18,37],[130,38],[58,35],[65,35],[3,40]]],
            [7, [[18,37],[102,38],[130,35],[65,35],[6,40]]],
        ])
        expect(saffron.trainers[0]).toMatchObject({ role: 'boss', areaId: 'silph-11f' })
        expect(saffron.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([
            [33,37,[]],[115,35,[]],[111,37,[]],[31,41,[]],
        ])
    })
})
