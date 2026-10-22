import { describe, expect, test } from 'bun:test'
import { applyGuideLocations, validateGuideLocations } from '../../../../../src/lib/data/guides/location-adapter'
import type { GuideLocation } from '../../../../../src/lib/data/guides/location-schema'
import { RED_BLUE_GUIDE } from '../../../../../src/lib/data/guides/red-blue/index'
import { GOLD_SILVER_GUIDE } from '../../../../../src/lib/data/guides/gold-silver'
import { RED_BLUE_OPENING } from '../../../../../src/lib/data/guides/red-blue/opening'
import { VIRIDIAN_FOREST_LOCATION } from '../../../../../src/lib/data/guides/red-blue/locations'
import { registerGuide } from '../../../../../src/lib/data/guides/registry'

// Structural placeholders only: no new factual content is established by these
// clones. The real optional location has its own source-specific content tests.
function optionalFixture(overrides: Partial<GuideLocation> = {}): GuideLocation {
    return {
        ...structuredClone(VIRIDIAN_FOREST_LOCATION),
        id: 'red-blue-optional-fixture', stopId: 'vermilion-city',
        ...overrides,
    }
}

describe('optional guide location validation', () => {
    test('parses a detached copy and preserves the original guide and input', () => {
        const input = optionalFixture()
        const beforeInput = structuredClone(input)
        const beforeGuide = structuredClone(RED_BLUE_GUIDE)
        const [validated] = validateGuideLocations(RED_BLUE_GUIDE, [input])
        expect(validated).toEqual(beforeInput)
        expect(validated).not.toBe(input)
        validated.items[0].name = 'Changed fixture only'
        expect(input).toEqual(beforeInput)
        expect(RED_BLUE_GUIDE).toEqual(beforeGuide)
    })

    test('rejects an unknown host stop or the wrong guide identity', () => {
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [optionalFixture({ stopId: 'new-progress-stop' })])).toThrow('Unknown location stop ID')
        expect(() => validateGuideLocations(GOLD_SILVER_GUIDE, [optionalFixture()])).toThrow('guide identity mismatch')
        const wrongGeneration = { ...RED_BLUE_GUIDE, gen: 2 }
        expect(() => validateGuideLocations(wrongGeneration, [optionalFixture()])).toThrow('guide identity mismatch')
    })

    test('enforces the full existing source, release and encounter contracts', () => {
        const unknownSource = optionalFixture()
        unknownSource.items[0].sourceIds = ['missing']
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [unknownSource])).toThrow('Unknown source ID')
        const invalidWeights = optionalFixture()
        invalidWeights.encounters[0].slots[0].weight = 1
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [invalidWeights])).toThrow('Encounter weights must total the denominator')
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [{ ...optionalFixture(), schemaVersion: 2 } as unknown as GuideLocation])).toThrow()
    })

    test('rejects duplicate optional IDs or multiple optional records for one host', () => {
        const input = optionalFixture()
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [input, { ...input, stopId: 'gym-3-vermilion' }])).toThrow('Duplicate location')
        expect(() => validateGuideLocations(RED_BLUE_GUIDE, [input, { ...input, id: 'another-optional-fixture' }])).toThrow('Duplicate location')
    })
})

describe('optional guide registration boundary', () => {
    test('shares a replacement host without replacing directions or adding saved IDs', () => {
        const replacement = optionalFixture({ id: 'red-blue-primary-fixture' })
        const optional = optionalFixture()
        optional.directions[0].text = 'Optional directions must stay out of the stop DTO.'
        const beforeGuide = structuredClone(RED_BLUE_GUIDE)
        const registered = registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [], [replacement], [], [optional])
        expect(registered.locations).toEqual([replacement])
        expect(registered.optionalLocations).toEqual([optional])
        expect(registered.game).toEqual(applyGuideLocations(RED_BLUE_GUIDE, [replacement]))
        expect(registered.game.stops.map((stop) => stop.id)).toEqual(beforeGuide.stops.map((stop) => stop.id))
        expect(registered.game.starters).toEqual(beforeGuide.starters)
        expect(RED_BLUE_GUIDE).toEqual(beforeGuide)
        const payload = JSON.stringify(registered.game)
        for (const value of ['optionalLocations', 'red-blue-optional-fixture', 'Optional directions must stay', 'sourceIds', 'forest-hidden-potion']) {
            expect(payload).not.toContain(value)
        }
    })

    test('permits a chapter host while leaving the chapter projection untouched', () => {
        const optional = optionalFixture({ stopId: 'pallet-town' })
        const withoutOptional = registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [RED_BLUE_OPENING])
        const registered = registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [RED_BLUE_OPENING], [], [], [optional])
        expect(registered.game).toEqual(withoutOptional.game)
        expect(registered.chapters).toEqual(withoutOptional.chapters)
        expect(registered.optionalLocations).toEqual([optional])
    })

    test('rejects overlapping replacement/optional IDs even on different hosts', () => {
        const primary = optionalFixture()
        const optional = optionalFixture({ stopId: 'gym-3-vermilion' })
        expect(() => registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [], [primary], [], [optional])).toThrow('replacement and optional location IDs must not overlap')
    })

    test('validates optional hosts and keeps them separate from legacy projection', () => {
        const optional = optionalFixture()
        const registered = registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [], [], [], [optional])
        expect(registered.game).toEqual(RED_BLUE_GUIDE)
        expect(registered.locations).toEqual([])
        expect(registered.optionalLocations).toEqual([optional])
        expect(() => registerGuide('red-blue', RED_BLUE_GUIDE, 'partial', [], [], [], [optionalFixture({ stopId: 'new-progress-stop' })])).toThrow('Unknown location stop ID')
        expect(() => registerGuide('gold-silver', GOLD_SILVER_GUIDE, 'story-outline', [], [], [], [optional])).toThrow('guide identity mismatch')
    })
})
