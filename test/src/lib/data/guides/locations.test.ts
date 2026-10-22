import { describe, expect, test } from 'bun:test'
import { applyGuideLocations } from '../../../../../src/lib/data/guides/location-adapter'
import { guideLocationSchema, type GuideLocation } from '../../../../../src/lib/data/guides/location-schema'
import { RED_BLUE_GUIDE } from '../../../../../src/lib/data/guides/red-blue/index'
import { GOLD_SILVER_GUIDE } from '../../../../../src/lib/data/guides/gold-silver'
import { PEWTER_GYM_LOCATION, RED_BLUE_LOCATIONS, VIRIDIAN_FOREST_LOCATION } from '../../../../../src/lib/data/guides/red-blue/locations'
import { GUIDE_REGISTRY } from '../../../../../src/lib/data/guides/registry'

function invalid(change: (location: GuideLocation) => void, message: string) {
    const input = structuredClone(VIRIDIAN_FOREST_LOCATION)
    change(input)
    const result = guideLocationSchema.safeParse(input)
    expect(result.success).toBeFalse()
    if (result.success) throw new Error('Expected invalid location')
    expect(result.error.issues.some((issue) => issue.message.includes(message))).toBeTrue()
}

describe('Red/Blue source fixtures', () => {
    test('validates bounded locations with pinned primary sources', () => {
        for (const location of RED_BLUE_LOCATIONS) {
            expect(guideLocationSchema.safeParse(location).success).toBeTrue()
            expect(location.sources.filter((source) => source.kind === 'game-disassembly').every((source) => /\/blob\/[a-f0-9]{40}\//.test(source.url))).toBeTrue()
            expect(location.sources.filter((source) => source.kind === 'reference').every((source) => /oldid=\d+/.test(source.url))).toBeTrue()
        }
    })

    test('records all five forest pickups with zero-based target coordinates', () => {
        expect(VIRIDIAN_FOREST_LOCATION.items.map(({ name, kind, quantity, position }) => ({ name, kind, quantity, position }))).toEqual([
            { name: 'Antidote', kind: 'visible', quantity: 1, position: { x: 25, y: 11 } },
            { name: 'Potion', kind: 'visible', quantity: 1, position: { x: 12, y: 29 } },
            { name: 'Poké Ball', kind: 'visible', quantity: 1, position: { x: 1, y: 31 } },
            { name: 'Potion', kind: 'hidden', quantity: 1, position: { x: 1, y: 18 } },
            { name: 'Antidote', kind: 'hidden', quantity: 1, position: { x: 16, y: 42 } },
        ])
        expect(VIRIDIAN_FOREST_LOCATION.locator?.width).toBe(34)
        expect(VIRIDIAN_FOREST_LOCATION.locator?.height).toBe(48)
    })

    test('retains exact source slots/levels/weights, not nominal guide percentages', () => {
        const [red, blue] = VIRIDIAN_FOREST_LOCATION.encounters
        expect(red.slots.map((slot) => [slot.name, slot.level, slot.weight])).toEqual([
            ['Weedle', 4, 51], ['Kakuna', 5, 51], ['Weedle', 3, 39], ['Weedle', 5, 25],
            ['Kakuna', 4, 25], ['Kakuna', 6, 25], ['Metapod', 4, 13], ['Caterpie', 3, 13],
            ['Pikachu', 3, 11], ['Pikachu', 5, 3],
        ])
        expect(blue.slots.map((slot) => slot.name)).toEqual([
            'Caterpie', 'Metapod', 'Caterpie', 'Caterpie', 'Metapod', 'Metapod', 'Kakuna', 'Weedle', 'Pikachu', 'Pikachu',
        ])
        expect(blue.slots.map((slot) => [slot.level, slot.weight])).toEqual(red.slots.map((slot) => [slot.level, slot.weight]))
        for (const table of [red, blue]) {
            expect(table.slots.reduce((sum, slot) => sum + slot.weight, 0)).toBe(256)
            expect(table.slots.filter((slot) => slot.name === 'Pikachu').reduce((sum, slot) => sum + slot.weight, 0)).toBe(14)
            expect(table.slots.some((slot) => slot.name === 'Pidgey')).toBeFalse()
        }
    })

    test('keeps legitimate repeated party members and all three forest battles', () => {
        expect(VIRIDIAN_FOREST_LOCATION.trainers.map((trainer) => trainer.party.map((member) => `${member.name}:${member.level}`))).toEqual([
            ['Weedle:6', 'Caterpie:6'], ['Weedle:7', 'Kakuna:7', 'Weedle:7'], ['Weedle:9'],
        ])
        expect(guideLocationSchema.safeParse(VIRIDIAN_FOREST_LOCATION).success).toBeTrue()
    })

    test('does not mix Yellow/remake boss moves into Brock’s party', () => {
        const brock = PEWTER_GYM_LOCATION.trainers.find((trainer) => trainer.role === 'leader')!
        expect(brock.party.map(({ name, level, moves }) => ({ name, level, moves }))).toEqual([
            { name: 'Geodude', level: 12, moves: ['Tackle', 'Defense Curl'] },
            { name: 'Onix', level: 14, moves: ['Tackle', 'Screech', 'Bide'] },
        ])
        expect(PEWTER_GYM_LOCATION.items.find((item) => item.id === 'brock-prize-money')?.quantity).toBe(1386)
        expect(PEWTER_GYM_LOCATION.warnings).toHaveLength(2)
        expect(PEWTER_GYM_LOCATION.advice.find((advice) => advice.id === 'brock-butterfree')?.text).toContain('at 12')
        expect(PEWTER_GYM_LOCATION.encounters).toEqual([])
    })
})

describe('location validation', () => {
    test('rejects wrong schema/release scope and unknown fields', () => {
        expect(guideLocationSchema.safeParse({ ...VIRIDIAN_FOREST_LOCATION, schemaVersion: 2 }).success).toBeFalse()
        expect(guideLocationSchema.safeParse({ ...VIRIDIAN_FOREST_LOCATION, versionIds: ['red', 'yellow'] }).success).toBeFalse()
        expect(guideLocationSchema.safeParse({ ...VIRIDIAN_FOREST_LOCATION, verified: true }).success).toBeFalse()
    })

    test('requires known, version-supporting references on every section', () => {
        invalid((location) => { location.items[0].sourceIds = ['missing'] }, 'Unknown source ID')
        invalid((location) => { location.encounters[0].sourceIds = ['missing'] }, 'Unknown source ID')
        invalid((location) => { location.sources[0].versionIds = ['red'] }, 'No supporting source scoped to blue')
        invalid((location) => { location.sources[0].versionIds = ['gold'] }, 'Source version is outside location scope')
    })

    test('rejects duplicate identities including repeated party slot IDs', () => {
        invalid((location) => { location.items[1].id = location.items[0].id }, 'Duplicate location record ID')
        invalid((location) => { location.sources.push(location.sources[0]) }, 'Duplicate source ID')
        invalid((location) => { location.trainers[0].party[1].id = location.trainers[0].party[0].id }, 'Duplicate party slot ID')
    })

    test('checks item and gate positions against movement-square bounds', () => {
        invalid((location) => { location.items[0].position!.x = 34 }, 'Position is outside locator bounds')
        invalid((location) => { location.locator!.gates[0].position.y = 48 }, 'Position is outside locator bounds')
    })

    test('requires both encounter versions and correct weight totals', () => {
        invalid((location) => { location.encounters.pop() }, 'Provide encounter tables for both releases')
        invalid((location) => { location.encounters[1].versionId = 'red' }, 'Duplicate encounter version')
        invalid((location) => { location.encounters[0].slots[0].weight = 50 }, 'Encounter weights must total the denominator')
        invalid((location) => { location.encounters[0].slots[1].id = location.encounters[0].slots[0].id }, 'Duplicate encounter slot ID')
    })
})

describe('location integration', () => {
    test('preserves stop/starter/storage identities and never mutates source', () => {
        const before = structuredClone(RED_BLUE_GUIDE)
        const projected = applyGuideLocations(RED_BLUE_GUIDE, RED_BLUE_LOCATIONS)
        expect(RED_BLUE_GUIDE).toEqual(before)
        expect(projected.id).toBe(before.id)
        expect(projected.starters).toEqual(before.starters)
        expect(projected.stops.map((stop) => stop.id)).toEqual(before.stops.map((stop) => stop.id))
        const replaced = new Set(RED_BLUE_LOCATIONS.map((location) => location.stopId))
        expect(projected.stops.filter((stop) => !replaced.has(stop.id))).toEqual(before.stops.filter((stop) => !replaced.has(stop.id)))
        expect(projected.stops.slice(0, 3)).toEqual(before.stops.slice(0, 3))
    })

    test('suppresses replaced legacy sections and keeps rich data out of Alpine', () => {
        const projected = applyGuideLocations(RED_BLUE_GUIDE, RED_BLUE_LOCATIONS)
        for (const location of RED_BLUE_LOCATIONS) {
            const stop = projected.stops.find((stop) => stop.id === location.stopId)!
            expect(stop.locationPilot).toBeTrue()
            expect(stop.steps).toEqual(location.directions.map((direction) => direction.text))
            expect(stop.items).toEqual([])
            expect(stop.wildPokemon).toEqual([])
            expect(stop.tips).toEqual([])
            expect(stop.gym).toBeUndefined()
        }
        const payload = JSON.stringify(projected)
        for (const field of ['sourceIds', 'coordinate-plot', 'forest-hidden-potion', 'encounter-weights']) expect(payload).not.toContain(field)
        expect(GUIDE_REGISTRY[0].locations.map((location) => location.stopId)).toEqual(['viridian-forest', 'gym-1-pewter', 'route-3-mt-moon', 'gym-2-cerulean', 'vermilion-city', 'gym-3-vermilion', 'rock-tunnel-lavender', 'celadon-city', 'gym-4-celadon', 'lavender-tower', 'saffron-city', 'gym-5-fuchsia', 'gym-6-saffron', 'gym-7-cinnabar', 'gym-8-viridian', 'victory-road', 'elite-four-lorelei', 'elite-four-bruno', 'elite-four-agatha', 'elite-four-lance', 'champion-rival'])
        expect(GUIDE_REGISTRY.slice(1).every((entry) => entry.locations.length === 0)).toBeTrue()
    })

    test('rejects wrong-guide locations, unknown stops and duplicate replacements', () => {
        expect(() => applyGuideLocations(GOLD_SILVER_GUIDE, RED_BLUE_LOCATIONS)).toThrow('guide identity mismatch')
        expect(() => applyGuideLocations(RED_BLUE_GUIDE, [{ ...VIRIDIAN_FOREST_LOCATION, stopId: 'new-stop' }])).toThrow('Unknown location stop ID')
        expect(() => applyGuideLocations(RED_BLUE_GUIDE, [VIRIDIAN_FOREST_LOCATION, VIRIDIAN_FOREST_LOCATION])).toThrow('Duplicate location')
    })
})
