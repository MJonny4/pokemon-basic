import { describe, expect, test } from 'bun:test'
import { buildGuideCollectionManifest } from '../../../../../src/lib/data/guides/collection-manifest'
import { GUIDE_REGISTRY } from '../../../../../src/lib/data/guides/registry'

describe('Red/Blue guide-listed collection manifest', () => {
    test('uses every reviewed stop and stable source record IDs without changing story identity', () => {
        const entry = GUIDE_REGISTRY[0]
        const manifest = buildGuideCollectionManifest(entry)!
        expect(manifest.guideId).toBe('red-blue')
        expect(manifest.stops.map((stop) => stop.stopId)).toEqual(entry.game.stops.map((stop) => stop.id))
        expect(manifest.stops.reduce((count, stop) => count + stop.stepIds.length, 0)).toBe(128)
        expect(manifest.stops.reduce((count, stop) => count + stop.items.length, 0)).toBe(76)
        expect(new Set(manifest.stops.flatMap((stop) => stop.species.map((pokemon) => pokemon.id))).size).toBe(47)
        expect(manifest.stops[1].items).toEqual([{ id: 'route-1:route-1-sample-potion', name: 'Potion' }])
        expect(manifest.stops[2].items.map((item) => item.id)).toEqual(['viridian-city:oaks-parcel', 'viridian-city:pokedex'])
        const allSteps = manifest.stops.flatMap((stop) => stop.stepIds)
        const allItems = manifest.stops.flatMap((stop) => stop.items.map((item) => item.id))
        expect(new Set(allSteps).size).toBe(allSteps.length)
        expect(new Set(allItems).size).toBe(allItems.length)
        expect(allItems.some((id) => id.includes('prize-money'))).toBeFalse()
        expect(JSON.stringify(manifest)).not.toContain('sourceIds')
    })

    test('keeps collection work scoped to the reviewed Red/Blue guide', () => {
        for (const entry of GUIDE_REGISTRY.slice(1)) expect(buildGuideCollectionManifest(entry)).toBeNull()
    })
})
