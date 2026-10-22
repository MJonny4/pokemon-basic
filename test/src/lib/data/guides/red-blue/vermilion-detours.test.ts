import { describe, expect, test } from 'bun:test'
import { VERMILION_DETOURS as detour } from '../../../../../../src/lib/data/guides/red-blue/vermilion-detours'
import { VERMILION_LOCATION } from '../../../../../../src/lib/data/guides/red-blue/vermilion'
import { ROUTE_11_LOCATION } from '../../../../../../src/lib/data/guides/red-blue/route-11'
import { DIGLETT_ROUTE_2_LOCATION } from '../../../../../../src/lib/data/guides/red-blue/diglett-route-2'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { guideItemVisual, guidePokemonVisual } from '../../../../../../src/ui/guide-location'

describe('composed Vermilion optional detour', () => {
    test('composes independent source slices without replacing the ship or adding saved stops', () => {
        expect(guideLocationSchema.safeParse(detour).success).toBeTrue()
        const entry = GUIDE_REGISTRY[0]
        expect(entry.optionalLocations).toEqual([detour])
        expect(entry.locations.find((location) => location.stopId === detour.stopId)).toEqual(VERMILION_LOCATION)
        expect(entry.game.stops).toHaveLength(24)
        expect(entry.game.stops.find((stop) => stop.id === detour.stopId)?.steps).toEqual(VERMILION_LOCATION.directions.map((step) => step.text))
        expect(detour.stopId).toBe('vermilion-city')
        expect(detour.directions).toEqual([...ROUTE_11_LOCATION.directions, ...DIGLETT_ROUTE_2_LOCATION.directions])
        expect(GUIDE_REGISTRY.slice(1).every((entry) => entry.optionalLocations.length === 0)).toBeTrue()
        for (const key of ['optionalLocations', 'red-blue-vermilion-detours', 'r11-itemfinder', 'd2-hm05-flash']) expect(JSON.stringify(entry.game)).not.toContain(key)
    })

    test('keeps all subareas, pickups, trainers, trades and source references separate', () => {
        expect(detour.areas).toHaveLength(8)
        expect(detour.items).toHaveLength(5)
        expect(detour.trainers).toHaveLength(10)
        expect(detour.trainers.every((trainer) => trainer.areaId === 'route-11')).toBeTrue()
        expect(detour.encounters.map((table) => [table.areaId, table.versionId])).toEqual([
            ['route-11', 'red'], ['route-11', 'blue'], ['digletts-cave', 'red'], ['digletts-cave', 'blue'],
        ])
        expect(detour.pokemonTrades?.map((trade) => trade.receive.nickname)).toEqual(['TERRY', 'MARCEL'])
        expect(new Set(detour.sources.map((source) => source.id)).size).toBe(detour.sources.length)
        expect(detour.sources.filter((source) => source.kind === 'game-disassembly').every((source) => /\/blob\/[a-f0-9]{40}\//.test(source.url))).toBeTrue()
        expect(detour.sources.filter((source) => source.kind === 'reference').every((source) => /oldid=\d+/.test(source.url))).toBeTrue()
    })

    test('provides real visuals without treating modern cosmetic icons as original mechanics', () => {
        expect(detour.items.every((item) => guideItemVisual(item).spriteUrl)).toBeTrue()
        expect(guideItemVisual(detour.items.find((item) => item.name === 'Itemfinder')!).spriteUrl).toEndWith('/dowsing-machine.png')
        expect(guideItemVisual(detour.items.find((item) => item.name === 'HM05 Flash')!).spriteUrl).toEndWith('/tm-normal.png')
        expect(guidePokemonVisual(122, 1).apiName).toBe('mr-mime')
        expect(guidePokemonVisual(30, 1).apiName).toBe('nidorina')
        expect(guidePokemonVisual(82, 1).types).toEqual(['electric'])
        expect(detour.encounters.flatMap((table) => table.slots).some((slot) => slot.dexId === 143)).toBeFalse()
    })
})
