import { describe, expect, test } from 'bun:test'
import { CHAMPION_STORY_LOCATION as champion } from '../../../../../../src/lib/data/guides/red-blue/champion'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { RED_BLUE_OPENING } from '../../../../../../src/lib/data/guides/red-blue/opening'
import { RED_BLUE_LOCATIONS } from '../../../../../../src/lib/data/guides/red-blue/locations'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'

describe('Red/Blue Champion story battle', () => {
    test('validates pinned evidence and covers every published main-story stop exactly once', () => {
        expect(guideLocationSchema.safeParse(champion).success).toBeTrue()
        expect(champion.sources.every((source) => source.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
        expect([...RED_BLUE_OPENING.stops.map((stop) => stop.id), ...RED_BLUE_LOCATIONS.map((location) => location.stopId)]).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops).toHaveLength(24)
        const stop = projected.stops.at(-1)!
        expect(stop).toMatchObject({ id: 'champion-rival', locationPilot: true, steps: champion.directions.map((step) => step.text), items: [], wildPokemon: [], tips: [] })
        expect(stop.gym).toBeUndefined()
    })

    test('shows every six-member starter variant with the trainer-loader moves', () => {
        expect(champion.starterBattles).toHaveLength(1)
        const variants = champion.starterBattles![0].variants
        expect(variants.map((variant) => variant.playerStarterDexId)).toEqual([1, 4, 7])
        expect(variants.map((variant) => variant.party.map(({ dexId, level }) => [dexId, level]))).toEqual([
            [[18, 61], [65, 59], [112, 61], [103, 61], [130, 63], [6, 65]],
            [[18, 61], [65, 59], [112, 61], [59, 61], [103, 63], [9, 65]],
            [[18, 61], [65, 59], [112, 61], [130, 61], [59, 63], [3, 65]],
        ])
        for (const variant of variants) {
            expect(variant.party[0].moves).toEqual(['Whirlwind', 'Wing Attack', 'Sky Attack', 'Mirror Move'])
            expect(variant.party[1].moves).toEqual(['Psybeam', 'Recover', 'Psychic', 'Reflect'])
            expect(variant.party[2].moves).toEqual(['Tail Whip', 'Fury Attack', 'Horn Drill', 'Leer'])
        }
        expect(variants.map((variant) => variant.party[5].moves)).toEqual([
            ['Rage', 'Slash', 'Fire Blast', 'Fire Spin'],
            ['Bite', 'Withdraw', 'Blizzard', 'Hydro Pump'],
            ['Razor Leaf', 'Growth', 'Mega Drain', 'SolarBeam'],
        ])
        expect(variants[0].party[3].moves).toEqual(['Barrage', 'Hypnosis', 'Stomp'])
        expect(variants[1].party[3].moves).toEqual(['Roar', 'Ember', 'Leer', 'Take Down'])
        expect(variants[2].party[3].moves).toEqual(['Dragon Rage', 'Leer', 'Hydro Pump', 'Hyper Beam'])
    })

    test('warns about forced entry, then closes the route at the Hall of Fame', () => {
        const directions = champion.directions.map((step) => step.text).join(' ')
        expect(directions).toContain('begins the final battle')
        expect(directions).toContain('game records your team and saves')
        expect(champion.warnings[0].text).toContain('restart its battle sequence')
        expect(champion.encounters).toEqual([])
        expect(champion.items).toEqual([])
    })
})
