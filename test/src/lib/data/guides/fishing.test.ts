import { describe, expect, test } from 'bun:test'
import { guideFishingSchema, validateGuideFishingSections, type GuideFishingSection } from '../../../../../src/lib/data/guides/fishing-schema'
import { RED_BLUE_CERULEAN_FISHING, RED_BLUE_ROUTE_4_FISHING, RED_BLUE_VERMILION_FISHING, RED_BLUE_VIRIDIAN_FISHING } from '../../../../../src/lib/data/guides/red-blue/fishing'
import { RED_BLUE_GUIDE } from '../../../../../src/lib/data/guides/red-blue/index'
import { GOLD_SILVER_GUIDE } from '../../../../../src/lib/data/guides/gold-silver'
import { GUIDE_REGISTRY } from '../../../../../src/lib/data/guides/registry'

function invalid(change: (section: GuideFishingSection) => void) {
    const input = structuredClone(RED_BLUE_VIRIDIAN_FISHING)
    change(input)
    expect(guideFishingSchema.safeParse(input).success).toBeFalse()
}

describe('Red/Blue fishing reference', () => {
    test('separates the nearby route from city water and records return-visit requirements', () => {
        const section = RED_BLUE_VIRIDIAN_FISHING
        expect(guideFishingSchema.safeParse(section).success).toBeTrue()
        expect(section.stopId).toBe('viridian-city')
        expect(section.spots.map((spot) => spot.id)).toEqual(['route-22-water', 'viridian-city-water'])
        expect(section.notice).toContain('need a fishing rod first')
        expect(section.notice).toContain('not Surf encounters')
        expect(section.spots[0].directions).toContain('west exit')
        expect(section.sources.every((source) => /\/blob\/[a-f0-9]{40}\//.test(source.url))).toBeTrue()
    })

    test('retains Old/Good Rod species, exact levels and rod acquisition locations', () => {
        for (const spot of RED_BLUE_VIRIDIAN_FISHING.spots) {
            expect(spot.rods.map((rod) => rod.id)).toEqual(['old-rod', 'good-rod', 'super-rod'])
            expect(spot.rods[0].catches).toEqual([{ name: 'Magikarp', dexId: 129, level: 5 }])
            expect(spot.rods[1].catches).toEqual([{ name: 'Goldeen', dexId: 118, level: 10 }, { name: 'Poliwag', dexId: 60, level: 10 }])
            expect(spot.rods.map((rod) => rod.obtainedAt)).toEqual([
                'Fishing Guru’s house in Vermilion City.', 'Fishing Guru’s house in Fuchsia City.', 'Fishing Guru’s house on Route 12.',
            ])
        }
    })

    test('does not substitute the city, Yellow or remake Super Rod pools for Route 22', () => {
        const [route, city] = RED_BLUE_VIRIDIAN_FISHING.spots
        expect(route.rods[2].catches).toEqual([{ name: 'Goldeen', dexId: 118, level: 15 }, { name: 'Poliwag', dexId: 60, level: 15 }])
        expect(city.rods[2].catches).toEqual([{ name: 'Tentacool', dexId: 72, level: 15 }, { name: 'Poliwag', dexId: 60, level: 15 }])
        expect(route.rods[2].catches.some((pokemon) => pokemon.name === 'Poliwhirl')).toBeFalse()
    })

    test('rejects future schemas, wrong releases, unknown fields and impossible catches', () => {
        expect(guideFishingSchema.safeParse({ ...RED_BLUE_VIRIDIAN_FISHING, schemaVersion: 2 }).success).toBeFalse()
        expect(guideFishingSchema.safeParse({ ...RED_BLUE_VIRIDIAN_FISHING, versionIds: ['red', 'yellow'] }).success).toBeFalse()
        expect(guideFishingSchema.safeParse({ ...RED_BLUE_VIRIDIAN_FISHING, verified: true }).success).toBeFalse()
        invalid((section) => { section.spots[0].rods[0].catches[0].level = 101 })
        invalid((section) => { section.spots[0].rods[0].catches[0].dexId = 152 })
        invalid((section) => { section.spots[0].rods[0].catches = [] })
    })

    test('validates source identities and evidence for both versions', () => {
        invalid((section) => { section.sources.push(section.sources[0]) })
        invalid((section) => { section.spots[0].sourceIds = ['missing'] })
        invalid((section) => { section.spots[0].rods[0].sourceIds = ['missing'] })
        invalid((section) => { section.spots[0].rods[0].sourceIds = ['rod-use']; section.sources[0].versionIds = ['red'] })
        invalid((section) => { section.sources[0].versionIds = ['gold'] })
    })

    test('rejects duplicate spots, rods and catch rows', () => {
        invalid((section) => { section.spots[1].id = section.spots[0].id })
        invalid((section) => { section.spots[0].rods[1].id = 'old-rod' })
        invalid((section) => { section.spots[0].rods[0].catches.push(section.spots[0].rods[0].catches[0]) })
    })

    test('validates guide/stop identity without mutating or migrating existing state', () => {
        const guideBefore = structuredClone(RED_BLUE_GUIDE)
        const fishingBefore = structuredClone(RED_BLUE_VIRIDIAN_FISHING)
        expect(validateGuideFishingSections(RED_BLUE_GUIDE, [RED_BLUE_VIRIDIAN_FISHING])).toEqual([RED_BLUE_VIRIDIAN_FISHING])
        expect(RED_BLUE_GUIDE).toEqual(guideBefore)
        expect(RED_BLUE_VIRIDIAN_FISHING).toEqual(fishingBefore)
        expect(() => validateGuideFishingSections(GOLD_SILVER_GUIDE, [RED_BLUE_VIRIDIAN_FISHING])).toThrow('Fishing guide identity mismatch')
        expect(() => validateGuideFishingSections(RED_BLUE_GUIDE, [{ ...RED_BLUE_VIRIDIAN_FISHING, stopId: 'missing-stop' }])).toThrow('Unknown fishing stop ID')
        expect(() => validateGuideFishingSections(RED_BLUE_GUIDE, [RED_BLUE_VIRIDIAN_FISHING, RED_BLUE_VIRIDIAN_FISHING])).toThrow('Duplicate fishing section')
        expect(GUIDE_REGISTRY[0].fishing.map((section) => section.stopId)).toEqual(['viridian-city', 'route-3-mt-moon', 'gym-2-cerulean', 'vermilion-city'])
        expect(GUIDE_REGISTRY.slice(1).every((entry) => entry.fishing.length === 0)).toBeTrue()
        const payload = JSON.stringify(GUIDE_REGISTRY[0].game)
        expect(payload).not.toContain('rod-use')
        expect(payload).not.toContain('super-rod-catches')
    })

    test('keeps Route 4’s later water access and its distinct Red/Blue Super Rod pool', () => {
        const section = RED_BLUE_ROUTE_4_FISHING
        expect(guideFishingSchema.safeParse(section).success).toBeTrue()
        expect(section.stopId).toBe('route-3-mt-moon')
        expect(section.notice).toContain('later visit')
        expect(section.notice).toContain('using Surf')
        expect(section.notice).toContain('cannot fish while Surfing')
        expect(section.spots).toHaveLength(1)
        const spot = section.spots[0]
        expect(spot.directions).toContain('Route 24')
        expect(spot.rods.map((rod) => rod.id)).toEqual(['old-rod', 'good-rod', 'super-rod'])
        expect(spot.rods[0].catches).toEqual(RED_BLUE_VIRIDIAN_FISHING.spots[0].rods[0].catches)
        expect(spot.rods[1].catches).toEqual(RED_BLUE_VIRIDIAN_FISHING.spots[0].rods[1].catches)
        expect(spot.rods[2].catches).toEqual([
            { name: 'Psyduck', dexId: 54, level: 15 }, { name: 'Goldeen', dexId: 118, level: 15 }, { name: 'Krabby', dexId: 98, level: 15 },
        ])
        expect(spot.rods[2].catches.some((pokemon) => ['Seaking', 'Tentacool', 'Poliwag'].includes(pokemon.name))).toBeFalse()
    })

    test('names Cerulean’s gym pool, city channel and nearby route banks without pooling grass', () => {
        const section = RED_BLUE_CERULEAN_FISHING
        expect(guideFishingSchema.safeParse(section).success).toBeTrue()
        expect(section.stopId).toBe('gym-2-cerulean')
        expect(section.spots.map((spot) => spot.id)).toEqual(['cerulean-gym-pool', 'route-24-bank', 'route-25-bank', 'cerulean-city-channel'])
        expect(section.notice).toContain('INSIDE Cerulean Gym')
        expect(section.notice).toContain('without Surf')
        expect(section.notice).toContain('later Surf approach')
        for (const spot of section.spots) {
            expect(spot.rods.map((rod) => rod.id)).toEqual(['old-rod', 'good-rod', 'super-rod'])
            expect(spot.rods).toEqual(RED_BLUE_ROUTE_4_FISHING.spots[0].rods)
            // Fresh objects: editing one spot must not change another reference.
            expect(spot.rods).not.toBe(RED_BLUE_ROUTE_4_FISHING.spots[0].rods)
            expect(spot.rods[2].catches).not.toBe(RED_BLUE_ROUTE_4_FISHING.spots[0].rods[2].catches)
        }
        expect(section.spots[0].directions).toContain('no Surf needed')
        expect(section.spots[1].directions).toContain('west of Nugget Bridge')
        expect(section.spots[2].directions).toContain('southern edge')
        expect(section.spots[3].directions).toContain('Later, use Surf')
    })

    test('distinguishes immediately available Old Rod and later Group4 fishing from the restricted dock', () => {
        const section = RED_BLUE_VERMILION_FISHING
        expect(guideFishingSchema.safeParse(section).success).toBeTrue()
        expect(section.title).toContain('Old Rod in town')
        expect(section.notice).toContain('no Surf required')
        expect(section.spots.map((spot) => spot.id)).toEqual(['vermilion-town-water', 'route-6-pond', 'vermilion-dock-first-visit', 'route-11-western-bank'])
        for (const spot of section.spots.slice(0, 2)) {
            expect(spot.rods.map((rod) => rod.id)).toEqual(['old-rod', 'good-rod', 'super-rod'])
            expect(spot.rods[0].catches).toEqual([{ name: 'Magikarp', dexId: 129, level: 5 }])
            expect(spot.rods[1].catches).toEqual(RED_BLUE_VIRIDIAN_FISHING.spots[0].rods[1].catches)
            expect(spot.rods[2].catches).toEqual([{ name: 'Krabby', dexId: 98, level: 15 }, { name: 'Shellder', dexId: 90, level: 15 }])
        }
        const dock = section.spots[2]
        expect(dock.directions).toContain('guard blocks entry')
        expect(dock.rods.map((rod) => rod.id)).toEqual(['old-rod'])
    })

    test('scopes Route 11 water separately from the cave and Route 12’s different pool', () => {
        const spot = RED_BLUE_VERMILION_FISHING.spots.find((spot) => spot.id === 'route-11-western-bank')!
        expect(spot.name).toContain('Nearby Route 11')
        expect(spot.directions).toContain('no Surf')
        expect(spot.directions).toContain('not the different fishing pool on Route 12')
        expect(spot.rods).toEqual(RED_BLUE_VERMILION_FISHING.spots[0].rods)
        expect(spot.rods).not.toBe(RED_BLUE_VERMILION_FISHING.spots[0].rods)
        expect(spot.rods[2].catches).toEqual([{ name: 'Krabby', dexId: 98, level: 15 }, { name: 'Shellder', dexId: 90, level: 15 }])
    })
})
