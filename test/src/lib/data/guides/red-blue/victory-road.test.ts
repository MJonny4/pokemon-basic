import { describe, expect, test } from 'bun:test'
import { VICTORY_ROAD_STORY_LOCATION as road } from '../../../../../../src/lib/data/guides/red-blue/victory-road'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Victory Road story route', () => {
    test('validates evidence and preserves all published stop and save identities', () => {
        expect(guideLocationSchema.safeParse(road).success).toBeTrue()
        expect(road.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(projected.stops).toHaveLength(24)
        expect(projected.stops.find((stop) => stop.id === 'victory-road')).toMatchObject({
            locationPilot: true, steps: road.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [],
        })
    })

    test('keeps the pre-cave rival, badge order and four cave switches accurate', () => {
        const steps = road.directions.map((step) => step.text).join(' ')
        expect(steps.indexOf('second Route 22 rival')).toBeLessThan(steps.indexOf('reception gate checks'))
        expect(steps).toContain('Cascade, Thunder, Rainbow, Soul, Marsh, Volcano and Earth Badges')
        expect(steps).toContain('boulder near the entrance east')
        expect(steps).toContain('first boulder near the arrival stair southwest')
        expect(steps).toContain('boulder near the northeast stair west')
        expect(steps).toContain('southeastern boulder into the nearby hole')
        expect(steps).toContain('fallen boulder west onto the second switch')
        expect(steps).toContain('follow the path north to Indigo Plateau')
        expect(road.warnings.find((warning) => warning.id === 'road-reset')?.text).toContain('resets the 2F and 3F boulder-switch progress')
        expect(road.encountersHeading).toContain('not audited')
        expect(road.encountersNote).toContain('does not mean the cave is encounter-free')
        expect(road.items).toEqual([])
    })

    test('shows each complete second-rival party for the original starter', () => {
        const battle = road.starterBattles?.[0]
        expect(battle?.id).toBe('route-22-rival')
        expect(battle?.variants.map((variant) => [variant.playerStarterDexId, variant.party.map((member) => [member.dexId, member.level])])).toEqual([
            [1, [[18,47],[111,45],[58,45],[102,47],[65,50],[9,53]]],
            [4, [[18,47],[111,45],[130,45],[58,47],[65,50],[3,53]]],
            [7, [[18,47],[111,45],[102,45],[130,47],[65,50],[6,53]]],
        ])
    })
})
