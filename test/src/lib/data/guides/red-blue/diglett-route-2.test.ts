import { describe, expect, test } from 'bun:test'
import { DIGLETT_ROUTE_2_LOCATION as location } from '../../../../../../src/lib/data/guides/red-blue/diglett-route-2'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { guideEncounterCards, guidePokemonVisual } from '../../../../../../src/ui/guide-location'

describe('Diglett’s Cave and eastern Route 2 source fixtures', () => {
    test('keeps an optional Vermilion slice and bounds the eastern return without auditing early grass', () => {
        expect(guideLocationSchema.safeParse(location).success).toBeTrue()
        expect(location.id).toBe('red-blue-diglett-route-2')
        expect(location.stopId).toBe('vermilion-city')
        expect(location.areas?.map((area) => area.id)).toEqual(['diglett-route-11-entrance', 'digletts-cave', 'diglett-route-2-entrance', 'route-2-east', 'route-2-trade-house', 'route-2-gate'])
        expect(location.limitations.join(' ')).toContain('does not audit western Route 2 grass')
        expect(location.sources.filter((entry) => entry.kind === 'game-disassembly').every((entry) => entry.url.includes('af519899719f0754965776faac0e836a3b906e6d'))).toBeTrue()
        expect(location.sources.find((entry) => entry.id === 'd2-route-2-navigation')?.kind).toBe('reference')
        for (const field of ['sources', 'directions', 'items', 'trainers', 'advice', 'warnings', 'pokemonTrades'] as const) {
            expect(location[field]!.every((record) => record.id.startsWith('d2-'))).toBeTrue()
        }
        expect(location.sources.every((entry) => entry.checkedOn === '2026-10-19')).toBeTrue()
    })

    test('preserves all ten exact cave slots separately for Red and Blue', () => {
        expect(location.encounters.map((table) => [table.areaId, table.versionId, table.method])).toEqual([['digletts-cave', 'red', 'cave'], ['digletts-cave', 'blue', 'cave']])
        for (const table of location.encounters) {
            expect(table.denominator).toBe(256)
            expect(table.slots.map((slot) => [slot.name, slot.dexId, slot.level, slot.weight])).toEqual([
                ['Diglett', 50, 18, 51], ['Diglett', 50, 19, 51], ['Diglett', 50, 17, 39], ['Diglett', 50, 20, 25],
                ['Diglett', 50, 16, 25], ['Diglett', 50, 15, 25], ['Diglett', 50, 21, 13], ['Diglett', 50, 22, 13],
                ['Dugtrio', 51, 29, 11], ['Dugtrio', 51, 31, 3],
            ])
            const cards = guideEncounterCards(table)
            expect(cards.map((card) => [card.name, card.levels, card.weight])).toEqual([
                ['Diglett', [15, 16, 17, 18, 19, 20, 21, 22], 242], ['Dugtrio', [29, 31], 14],
            ])
        }
        expect(location.encountersNote).toContain('not per-step or catch probabilities')
    })

    test('includes only the two Red/Blue ground pickups and the retryable HM reward', () => {
        expect(location.items.map((item) => [item.name, item.areaId, item.kind, item.quantity, item.position ?? null])).toEqual([
            ['HM05 Flash', 'route-2-gate', 'gift', 1, null],
            ['HP Up', 'route-2-east', 'visible', 1, { x: 13, y: 45 }],
            ['Moon Stone', 'route-2-east', 'visible', 1, { x: 13, y: 54 }],
        ])
        expect(location.items.some((item) => /Ether|Parlyz Heal|Nugget/.test(item.name))).toBeFalse()
        const flash = location.items[0]
        expect(flash.requirements).toContain('10 distinct species registered as obtained, not merely seen')
        expect(flash.requirements).toContain('make room and speak again')
        expect(flash.requirements).toContain('Cascade Badge')
        expect(flash.requirements).toContain('Boulder Badge')
        expect(flash.sourceIds).toContain('d2-flash-gift')
        expect(flash.sourceIds).toContain('d2-aide-check')
        expect(location.sources.find((entry) => entry.id === 'd2-flash-gift')?.locator).toContain('only when')
    })

    test('labels Abra-for-Mr. Mime as an optional exchange with no invented level', () => {
        expect(location.pokemonTrades).toHaveLength(1)
        const trade = location.pokemonTrades![0]
        expect(trade.areaId).toBe('route-2-trade-house')
        expect(trade.give).toEqual({ name: 'Abra', dexId: 63 })
        expect(trade.receive).toEqual({ name: 'Mr. Mime', dexId: 122, nickname: 'MARCEL' })
        expect('level' in trade.receive).toBeFalse()
        expect(trade.sourceIds).toEqual(['d2-route-2-objects', 'd2-trade-house-objects', 'd2-trade-house-script', 'd2-trades'])
        expect(guidePokemonVisual(122, 1).apiName).toBe('mr-mime')
        expect(guidePokemonVisual(122, 1).types).toEqual(['psychic'])
        expect(location.encounters.flatMap((table) => table.slots).some((slot) => slot.dexId === 122)).toBeFalse()
    })

    test('keeps cave traversal separate from Cut access and optional Flash assistance', () => {
        const cave = location.directions.find((direction) => direction.id === 'd2-cross-cave')!
        expect(cave.text).toContain('Neither Cut nor Flash is needed to cross the cave itself')
        expect(cave.text).toContain('southeastern stair to the northwestern stair')
        const aide = location.directions.find((direction) => direction.id === 'd2-cut-to-aide')!
        expect(aide.text).toContain('Cut the small tree farther south of the trade house')
        expect(aide.text).toContain('at least 10 different species registered as obtained')
        const returning = location.directions.find((direction) => direction.id === 'd2-return-journey')!
        expect(returning.text).toContain('Brock’s Boulder Badge')
        expect(returning.text).toContain('not a mandatory Rock Tunnel entry requirement')
        expect(location.warnings.find((warning) => warning.id === 'd2-high-level-dugtrio')?.text).toContain('level 29 or 31')
    })

    test('does not invent trainers, cave loot, cave fishing or a rod gift from the entrance NPC', () => {
        expect(location.trainers).toEqual([])
        expect(location.items.every((item) => ['route-2-east', 'route-2-gate'].includes(item.areaId!))).toBeTrue()
        expect(location.items.some((item) => item.kind === 'hidden')).toBeFalse()
        expect(location.areas?.find((area) => area.id === 'diglett-route-2-entrance')?.description).toContain('does not give a fishing rod')
        expect(location.advice.find((entry) => entry.id === 'd2-no-fishing-here')?.text).toContain('do not have a fishing stop')
        expect(location.advice.find((entry) => entry.id === 'd2-owned-count')?.text).toContain('Ten duplicates do not count as ten species')
        expect(location.advice.find((entry) => entry.id === 'd2-owned-count')?.text).toContain('previously obtained species still count')
    })
})
