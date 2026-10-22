import { describe, expect, test } from 'bun:test'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { RED_BLUE_MIDGAME_LOCATIONS, ROCK_TUNNEL_LOCATION as rock, CELADON_STORY_LOCATION as celadon, ERIKA_STORY_LOCATION as erika, POKEMON_TOWER_STORY_LOCATION as tower } from '../../../../../../src/lib/data/guides/red-blue/midgame'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { guideItemVisual } from '../../../../../../src/ui/guide-location'

describe('Red/Blue story-first midgame fixtures', () => {
    test('validates four bounded overlays without changing progress identities or untouched later stops', () => {
        for (const location of RED_BLUE_MIDGAME_LOCATIONS) {
            expect(guideLocationSchema.safeParse(location).success).toBeTrue()
            expect(location.sources.filter((entry) => entry.kind === 'game-disassembly').every((entry) => entry.url.includes('/af519899719f0754965776faac0e836a3b906e6d/'))).toBeTrue()
            const stop = GUIDE_REGISTRY[0].game.stops.find((entry) => entry.id === location.stopId)!
            expect(stop.steps).toEqual(location.directions.map((step) => step.text))
            expect(stop.items).toEqual([])
            expect(stop.wildPokemon).toEqual([])
            expect(stop.tips).toEqual([])
            expect(stop.gym).toBeUndefined()
        }
        expect(GUIDE_REGISTRY[0].game.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
    })

    test('keeps route exclusives separate from the two exact cave-floor tables', () => {
        expect(rock.encounters).toHaveLength(8)
        for (const version of ['red', 'blue']) {
            const tables = rock.encounters.filter((table) => table.versionId === version)
            expect(tables[0].slots.filter((slot) => slot.dexId === (version === 'red' ? 23 : 27)).map((slot) => slot.level)).toEqual([11, 15, 13, 17])
            expect(tables[1].slots.filter((slot) => slot.dexId === 100).map((slot) => slot.level)).toEqual([16, 14, 17])
            expect(tables[2].slots.map((slot) => [slot.dexId, slot.level])).toEqual([[41,16],[41,17],[74,17],[66,15],[74,16],[41,18],[41,15],[66,17],[95,13],[95,15]])
            expect(tables[3].slots.map((slot) => [slot.dexId, slot.level])).toEqual([[41,16],[41,17],[74,17],[66,15],[74,16],[41,18],[66,17],[95,17],[95,13],[74,18]])
        }
        expect(rock.items.map((item) => item.name)).toEqual(['TM30 Teleport'])
        expect(rock.items.some((item) => item.areaId?.startsWith('rock-'))).toBeFalse()
        expect(rock.directions[0].text).toContain('10 different species')
        expect(rock.warnings[0].text).toContain('not inside Rock Tunnel')
    })

    test('preserves exact ten-slot weights and route-specific version branches', () => {
        for (const location of RED_BLUE_MIDGAME_LOCATIONS) {
            for (const table of location.encounters) {
                expect(table.slots.map((slot) => slot.weight)).toEqual([51,51,39,25,25,25,13,13,11,3])
                expect(table.slots.reduce((sum, slot) => sum + slot.weight, 0)).toBe(table.denominator)
            }
        }
        expect(celadon.encounters.map((table) => table.slots.map((slot) => slot.dexId))).toEqual([
            [16,56,23,58,16,56,23,58,58,58], [16,43,56,43,16,56,58,58,56,56],
            [16,52,27,37,16,52,27,37,37,37], [16,69,52,69,16,52,37,37,52,52],
        ])
        expect(celadon.encounters[0].slots.map((slot) => slot.level)).toEqual([18,18,17,16,20,20,19,17,15,18])
        expect(celadon.encounters[1].slots.map((slot) => slot.level)).toEqual([19,19,17,22,22,18,18,20,19,20])
    })

    test('keeps the Lift Key conversation and Scope pickup distinct from boss victory', () => {
        const ids = celadon.directions.map((step) => step.id)
        expect(ids.indexOf('talk-again')).toBeLessThan(ids.indexOf('take-lift'))
        expect(ids.indexOf('take-lift')).toBeLessThan(ids.indexOf('giovanni-scope'))
        expect(celadon.directions.find((step) => step.id === 'talk-again')?.text).toContain('speak to him AGAIN')
        expect(celadon.items.map((item) => [item.name, item.kind])).toEqual([['Lift Key', 'visible'], ['Silph Scope', 'visible']])
        expect(celadon.trainers[0].role).toBe('boss')
        expect(celadon.trainers[0].party.map((member) => [member.dexId, member.level])).toEqual([[95,25],[111,24],[115,29]])
    })

    test('keeps Erika’s team, badge and retryable TM without inventing audited moves', () => {
        expect(erika.trainers[0].role).toBe('leader')
        expect(erika.trainers[0].party.map((member) => [member.dexId, member.level, member.moves])).toEqual([[71,29,[]],[114,24,[]],[45,29,[]]])
        expect(erika.encounters).toEqual([])
        expect(erika.items.map((item) => item.name)).toEqual(['Rainbow Badge', 'TM21 Mega Drain'])
        expect(erika.directions.find((step) => step.id === 'erika-rewards')?.text).toContain('speak to her again')
        expect(erika.warnings[0].text).toContain('seven ordinary trainers')
        for (const location of RED_BLUE_MIDGAME_LOCATIONS) {
            for (const item of location.items) {
                const visual = guideItemVisual(item)
                expect(Boolean(visual.spriteUrl) || visual.symbol === 'badge').toBeTrue()
            }
        }
    })

    test('uses full Tower rival teams for the player’s starter, not the opponent’s starter', () => {
        expect(tower.starterBattles?.[0].variants.map((variant) => [variant.playerStarterDexId, variant.party.map((member) => [member.dexId, member.level])])).toEqual([
            [1, [[17,25],[102,23],[130,22],[64,20],[5,25]]],
            [4, [[17,25],[58,23],[102,22],[64,20],[8,25]]],
            [7, [[17,25],[130,23],[58,22],[64,20],[2,25]]],
        ])
    })

    test('separates floor encounters, uncatchable Marowak and Fuji’s house reward', () => {
        expect(tower.encounters).toHaveLength(10)
        for (const floor of [3,4,5,6,7]) {
            const tables = tower.encounters.filter((table) => table.areaId === `tower-${floor}f`)
            expect(tables).toHaveLength(2)
            expect(tables[0].slots.map(({ dexId, level, weight }) => [dexId, level, weight])).toEqual(tables[1].slots.map(({ dexId, level, weight }) => [dexId, level, weight]))
            expect(tables[0].slots.some((slot) => slot.dexId === 105)).toBeFalse()
        }
        expect(tower.encounters.find((table) => table.areaId === 'tower-7f')?.slots.map((slot) => [slot.dexId, slot.level])).toEqual([[92,21],[92,22],[92,23],[92,24],[92,20],[93,28],[104,22],[104,24],[93,28],[93,30]])
        expect(tower.directions.find((step) => step.id === 'tower-marowak')?.text).toContain('cannot be caught')
        expect(tower.items[0]).toMatchObject({ name: 'Poké Flute', areaId: 'fuji-house', kind: 'gift' })
        expect(tower.directions.find((step) => step.id === 'tower-flute')?.text).toContain('speak to Mr. Fuji again')
    })
})
